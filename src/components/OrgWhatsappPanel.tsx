"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Org, type ReminderLog, type WaStatus } from "@/lib/api";
import { milestoneLabel } from "@/lib/labels";

type Preview = {
  dueCount: number;
  recipients: string[];
  message: string | null;
};

export function OrgWhatsappPanel({
  org,
  onSave,
}: {
  org: Org;
  onSave: (input: {
    alertPhones: string;
    notifyEnabled: boolean;
  }) => Promise<void>;
}) {
  const [phones, setPhones] = useState(org.alertPhones);
  const [enabled, setEnabled] = useState(org.notifyEnabled);
  const [wa, setWa] = useState<WaStatus | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [log, setLog] = useState<ReminderLog[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(
    null,
  );

  useEffect(() => {
    setPhones(org.alertPhones);
    setEnabled(org.notifyEnabled);
    setPreview(null);
    setMsg(null);
  }, [org.id, org.alertPhones, org.notifyEnabled]);

  const loadLog = useCallback(async () => {
    try {
      const r = await api<{ logs: ReminderLog[] }>(
        `/orgs/${org.id}/whatsapp/log`,
      );
      setLog(r.logs);
    } catch {
      /* ignore */
    }
  }, [org.id]);

  useEffect(() => {
    void loadLog();
    api<WaStatus>("/whatsapp/status")
      .then(setWa)
      .catch(() => setWa(null));
  }, [loadLog]);

  async function run(label: string | null, fn: () => Promise<void>) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      if (label) setMsg({ tone: "ok", text: label });
    } catch (e) {
      setMsg({ tone: "err", text: e instanceof Error ? e.message : "حدث خطأ" });
    } finally {
      setBusy(false);
    }
  }

  const connected = wa?.status === "connected";

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className="card p-6">
        <h3 className="text-lg font-semibold">واتساب المنشأة: {org.name}</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          تُرسل تذكيرات هذه المنشأة فقط إلى الأرقام التالية من واتساب المكتب،
          حسب الجدول اليومي.
        </p>
        {!connected && (
          <p className="mt-3 rounded-lg bg-[#fff4e0] px-3 py-2 text-sm text-[#9a5f00]">
            واتساب المكتب غير متصل — اربطه من صفحة «الإعدادات» ليتم الإرسال.
          </p>
        )}
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run("حُفظت إعدادات المنشأة", () =>
              onSave({ alertPhones: phones, notifyEnabled: enabled }),
            );
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-[var(--muted)]">
              أرقام واتساب المنشأة (صاحب المنشأة / المحاسب / المسؤول — افصل
              بفاصلة)
            </span>
            <input
              className="input"
              dir="ltr"
              placeholder="05XXXXXXXX, 05YYYYYYYY"
              value={phones}
              onChange={(e) => setPhones(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            تفعيل تذكيرات واتساب لهذه المنشأة
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" disabled={busy}>
              حفظ
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() =>
                run(null, async () => {
                  setPreview(
                    await api<Preview>(`/orgs/${org.id}/whatsapp/preview`),
                  );
                })
              }
            >
              معاينة رسالة اليوم
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy || !connected}
              title={!connected ? "اربط واتساب المكتب أولاً" : undefined}
              onClick={() =>
                run(null, async () => {
                  const r = await api<{
                    sent: number;
                    recipients: string[];
                    errors?: string[];
                    message?: string;
                  }>(`/orgs/${org.id}/whatsapp/send`, { method: "POST" });
                  setMsg({
                    tone: r.errors?.length ? "err" : "ok",
                    text:
                      r.message ??
                      `أُرسلت ${r.sent} من ${r.recipients.length} رسالة${r.errors?.length ? ` · أخطاء: ${r.errors.join(" | ")}` : ""}`,
                  });
                  await loadLog();
                })
              }
            >
              إرسال تذكير المنشأة الآن
            </button>
          </div>
        </form>

        {preview && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-[var(--muted)]">
              المستلمون:{" "}
              {preview.recipients.length ? (
                <span dir="ltr">
                  {preview.recipients.map((r) => `+${r}`).join(", ")}
                </span>
              ) : (
                <span className="text-[var(--danger)]">
                  لا توجد أرقام — أضف رقماً وفعّل التذكيرات
                </span>
              )}
            </p>
            <pre className="whitespace-pre-wrap rounded-xl bg-[var(--surface-2)] p-4 text-sm leading-7">
              {preview.message ??
                "لا توجد التزامات تستحق التنبيه اليوم لهذه المنشأة."}
            </pre>
          </div>
        )}
        {msg && (
          <p
            className="mt-4 rounded-lg px-3 py-2 text-sm"
            style={
              msg.tone === "ok"
                ? {
                    background: "var(--brand-soft)",
                    color: "var(--brand-strong)",
                  }
                : { background: "#fdecee", color: "var(--danger)" }
            }
          >
            {msg.text}
          </p>
        )}
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">سجل تذكيرات المنشأة</h3>
          <button
            className="text-sm text-[var(--muted)] hover:text-[var(--brand)]"
            onClick={() => void loadLog()}
          >
            تحديث
          </button>
        </div>
        {log.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">
            لم تُرسل أي تذكيرات لهذه المنشأة بعد.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--border)] text-sm">
            {log.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <span className="text-[var(--muted)]">
                  {new Date(l.sentAt).toLocaleString("ar-SA")}
                </span>
                <span dir="ltr">+{l.to}</span>
                <span>{milestoneLabel(l.milestone)}</span>
                <span
                  style={{
                    color: l.status === "sent" ? "var(--ok)" : "var(--danger)",
                  }}
                  title={l.error ?? undefined}
                >
                  {l.status === "sent" ? "أُرسل" : "فشل"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
