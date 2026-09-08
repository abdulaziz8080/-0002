import fs from "node:fs";
import path from "node:path";
import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import pino from "pino";
import QRCode from "qrcode";
import { prisma } from "./db.js";
import { env } from "./env.js";

export type WaStatus = "disconnected" | "connecting" | "qr" | "connected";

type Session = {
  sock: WASocket | null;
  status: WaStatus;
  qrDataUrl: string | null;
  phone: string | null;
  lastError: string | null;
  reconnectTimer: NodeJS.Timeout | null;
  manualClose: boolean;
};

const logger = pino({ level: process.env.WA_LOG_LEVEL ?? "warn" });
const sessions = new Map<string, Session>();

function authDir(officeId: string) {
  return path.join(env.waAuthDir, officeId);
}

function getOrCreate(officeId: string): Session {
  let s = sessions.get(officeId);
  if (!s) {
    s = {
      sock: null,
      status: "disconnected",
      qrDataUrl: null,
      phone: null,
      lastError: null,
      reconnectTimer: null,
      manualClose: false,
    };
    sessions.set(officeId, s);
  }
  return s;
}

async function persist(officeId: string, s: Session) {
  await prisma.whatsappSession.upsert({
    where: { officeId },
    create: {
      officeId,
      status: s.status,
      phone: s.phone,
      connectedAt: s.status === "connected" ? new Date() : null,
    },
    update: {
      status: s.status,
      phone: s.phone,
      ...(s.status === "connected" ? { connectedAt: new Date() } : {}),
    },
  });
}

export function hasSavedCreds(officeId: string) {
  return fs.existsSync(path.join(authDir(officeId), "creds.json"));
}

export function getStatus(officeId: string) {
  const s = sessions.get(officeId);
  return {
    status: s?.status ?? (hasSavedCreds(officeId) ? "disconnected" : "disconnected"),
    qr: s?.status === "qr" ? s.qrDataUrl : null,
    phone: s?.phone ?? null,
    lastError: s?.lastError ?? null,
  };
}

/** يبدأ جلسة واتساب للمكتب: إن وُجدت بيانات محفوظة يعيد الاتصال، وإلا يُصدر QR */
export async function connect(officeId: string): Promise<void> {
  const s = getOrCreate(officeId);
  if (s.sock && (s.status === "connected" || s.status === "connecting" || s.status === "qr")) return;
  if (s.reconnectTimer) {
    clearTimeout(s.reconnectTimer);
    s.reconnectTimer = null;
  }

  fs.mkdirSync(authDir(officeId), { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(authDir(officeId));
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));

  s.status = "connecting";
  s.manualClose = false;
  s.lastError = null;
  await persist(officeId, s);

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ["Multazim", "Chrome", "1.0.0"],
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
  });
  s.sock = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      s.status = "qr";
      s.qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
      await persist(officeId, s);
    }

    if (connection === "open") {
      s.status = "connected";
      s.qrDataUrl = null;
      s.phone = sock.user?.id?.split(":")[0]?.split("@")[0] ?? null;
      s.lastError = null;
      await persist(officeId, s);
    }

    if (connection === "close") {
      const code = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      s.sock = null;
      s.qrDataUrl = null;

      if (code === DisconnectReason.loggedOut || s.manualClose) {
        s.status = "disconnected";
        s.phone = null;
        if (code === DisconnectReason.loggedOut) {
          s.lastError = "تم تسجيل الخروج من الجوال — امسح QR من جديد";
          fs.rmSync(authDir(officeId), { recursive: true, force: true });
        }
        await persist(officeId, s);
        return;
      }

      // انقطاع عابر أو restartRequired بعد المسح: أعِد الاتصال
      s.status = "connecting";
      s.lastError = lastDisconnect?.error?.message ?? null;
      await persist(officeId, s);
      s.reconnectTimer = setTimeout(() => {
        s.reconnectTimer = null;
        connect(officeId).catch((e) => {
          s.status = "disconnected";
          s.lastError = String(e?.message ?? e);
          void persist(officeId, s);
        });
      }, code === DisconnectReason.restartRequired ? 500 : 5000);
    }
  });
}

export async function logout(officeId: string) {
  const s = getOrCreate(officeId);
  s.manualClose = true;
  if (s.reconnectTimer) clearTimeout(s.reconnectTimer);
  try {
    await s.sock?.logout();
  } catch {
    /* already closed */
  }
  try {
    s.sock?.end(undefined);
  } catch {
    /* ignore */
  }
  s.sock = null;
  s.status = "disconnected";
  s.qrDataUrl = null;
  s.phone = null;
  fs.rmSync(authDir(officeId), { recursive: true, force: true });
  await persist(officeId, s);
}

export function isConnected(officeId: string) {
  return sessions.get(officeId)?.status === "connected";
}

/** يرسل رسالة نصية من جلسة المكتب إلى رقم دولي بدون + (مثل 9665xxxxxxxx) */
export async function sendText(officeId: string, phone: string, text: string) {
  const s = sessions.get(officeId);
  if (!s?.sock || s.status !== "connected") {
    throw new Error("واتساب المكتب غير متصل");
  }
  const jid = `${phone}@s.whatsapp.net`;
  await s.sock.sendMessage(jid, { text });
}

/** عند تشغيل الخادم: أعِد الاتصال لكل مكتب عنده جلسة محفوظة */
export async function restoreAll() {
  if (!fs.existsSync(env.waAuthDir)) return;
  const dirs = fs.readdirSync(env.waAuthDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const d of dirs) {
    if (!hasSavedCreds(d.name)) continue;
    const office = await prisma.office.findUnique({ where: { id: d.name } });
    if (!office) continue;
    connect(d.name).catch((e) => logger.warn({ officeId: d.name, err: e?.message }, "wa restore failed"));
  }
}
