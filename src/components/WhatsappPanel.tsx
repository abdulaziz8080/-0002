"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Office, type ReminderLog, type WaStatus } from "@/lib/api";
import { milestoneLabel } from "@/lib/labels";

const STATUS_LABEL: Record<
  WaStatus["status"],
  { text: string; color: string }
> = {
  disconnected: { text: "غير متصل", color: "var(--muted)" },
  connecting: { text: "جارٍ الاتصال…", color: "var(--warn)" },
  qr: { text: "بانتظار مسح الرمز", color: "var(--info)" },
  connected: { text: "متصل", color: "var(--ok)" },
};

export function WhatsappPanel({
  office,
  onOfficeChange,
  children,
}: {
  office: Office;
  onOfficeChange: (o: Office) => void;
  children?: React.ReactNode;
}) {
  const [wa, setWa] = useState<WaStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(
    null,
  );
  const [phones, setPhones] = useState(office.alertPhones);
  const [notifyContacts, setNotifyContacts] = useState(
    office.notifyOrgContacts,
  );
  const [testPhone, setTestPhone] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [log, setLog] = useState<ReminderLog[]>([]);

  const refresh = useCallback(async () => {
    try {
      setWa(await api<WaStatus>("/whatsapp/status"));
    } catch {
      /* الخادم غير متاح؛ نعيد المحاولة في الدورة التالية */
    }
  }, []);

  const loadLog = useCallback(async () => {
    try {
      const r = await api<{ logs: ReminderLog[] }>("/whatsapp/log");
      setLog(r.logs);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
    void loadLog();
  }, [refresh, loadLog]);

  // نستطلع الحالة بشكل أسرع أثناء الاتصال/عرض الرمز
  useEffect(() => {
    const fast = wa?.status === "connecting" || wa?.status === "qr";
    const t = setInterval(refresh, fast ? 2500 : 10000);
    return () => clearInterval(t);
  }, [wa?.status, refresh]);

  async function run(label: string, fn: () => Promise<void>) {
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

  const status = wa
    ? STATUS_LABEL[wa.status]
    : { text: "…", color: "var(--muted)" };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ربط الجلسة */}
      <section className="card p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">ربط واتساب المكتب</h2>
          <span
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: status.color }}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: status.color }}
            />
            {status.text}
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          تُرسل التذكيرات من رقم واتساب المكتب نفسه. الجلسة محفوظة على الخادم
          وتبقى متصلة بعد إعادة التشغيل.
        </p>

        <div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-6">
          {wa?.status === "qr" && wa.qr && (
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={wa.qr}
                alt="رمز QR لربط واتساب"
                width={280}
                height={280}
                className="rounded-xl bg-white p-2"
              />
              <p className="mt-3 text-sm text-[var(--muted)]">
                افتح واتساب في جوال المكتب ← الأجهزة المرتبطة ← ربط جهاز ← امسح
                الرمز
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                يتجدد الرمز تلقائياً كل ~20 ثانية
              </p>
            </div>
          )}
          {wa?.status === "connected" && (
            <div className="text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--brand-soft)] text-3xl text-[var(--brand)]">
                ✓
              </div>
              <p className="mt-3 font-semibold">متصل بنجاح</p>
              {wa.phone && (
                <p className="text-sm text-[var(--muted)]" dir="ltr">
                  +{wa.phone}
                </p>
              )}
            </div>
          )}
          {wa?.status === "connecting" && (
            <p className="text-sm text-[var(--muted)]">
              جارٍ تجهيز الجلسة وتوليد الرمز…
            </p>
          )}
          {(!wa || wa.status === "disconnected") && (
            <div className="text-center">
              <p className="text-sm text-[var(--muted)]">
                لم يتم ربط واتساب لهذا المكتب بعد.
              </p>
              {wa?.lastError && (
                <p className="mt-2 text-xs text-[var(--danger)]">
                  {wa.lastError}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {wa?.status !== "connected" ? (
            <button
              className="btn btn-primary"
              disabled={
                busy || wa?.status === "connecting" || wa?.status === "qr"
              }
              onClick={() =>
                run("", async () => {
                  setWa(
                    await api<WaStatus>("/whatsapp/connect", {
                      method: "POST",
                    }),
                  );
                })
              }
            >
              {wa?.status === "qr" ? "الرمز معروض" : "بدء الربط وعرض QR"}
            </button>
          ) : null}
          {wa && wa.status !== "disconnected" && (
            <button
              className="btn btn-outline"
              disabled={busy}
              onClick={() =>
                run("تم فصل الجلسة وحذف بياناتها", async () => {
                  setWa(
                    await api<WaStatus>("/whatsapp/logout", { method: "POST" }),
                  );
                })
              }
            >
              فصل الجلسة
            </button>
          )}
        </div>

        {wa?.status === "connected" && (
          <form
            className="mt-6 flex flex-wrap items-end gap-2 border-t border-[var(--border)] pt-5"
            onSubmit={(e) => {
              e.preventDefault();
              void run("أُرسلت رسالة الاختبار", async () => {
                await api("/whatsapp/test", {
                  method: "POST",
                  body: JSON.stringify({ phone: testPhone }),
                });
                await loadLog();
              });
            }}
          >
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs text-[var(--muted)]">
                رسالة اختبار إلى رقم
              </span>
              <input
                className="input"
                dir="ltr"
                placeholder="05XXXXXXXX"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                required
              />
            </label>
            <button className="btn btn-outline" disabled={busy}>
              إرسال اختبار
            </button>
          </form>
        )}
      </section>

      {/* إعدادات التنبيه */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold">إعدادات تذكير المكتب</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          يفحص النظام قاعدة البيانات يومياً الساعة ٨ صباحاً (توقيت الرياض) ويرسل
          ملخصاً بالالتزامات المستحقة قبل ٣٠ و١٤ و٧ أيام، ويوم الاستحقاق،
          ويومياً عند التأخر.
        </p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run("حُفظت الإعدادات", async () => {
              const r = await api<{ office: Office }>("/auth/me", {
                method: "PATCH",
                body: JSON.stringify({
                  alertPhones: phones,
                  notifyOrgContacts: notifyContacts,
                }),
              });
              onOfficeChange(r.office);
            });
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-[var(--muted)]">
              أرقام المكتب التي تستقبل الملخص اليومي لكل المنشآت (افصل بينها
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
              checked={notifyContacts}
              onChange={(e) => setNotifyContacts(e.target.checked)}
            />
            إضافة رقم مسؤول كل منشأة تلقائياً إلى مستلمي تذكيراتها (بجانب أرقام
            واتساب المنشأة)
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" disabled={busy}>
              حفظ الإعدادات
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() =>
                run("", async () => {
                  const r = await api<{ message: string | null }>(
                    "/whatsapp/preview",
                  );
                  setPreview(
                    r.message ?? "لا توجد التزامات تستحق التنبيه اليوم.",
                  );
                })
              }
            >
              معاينة رسالة اليوم
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy || wa?.status !== "connected"}
              title={
                wa?.status !== "connected" ? "اربط واتساب أولاً" : undefined
              }
              onClick={() =>
                run("", async () => {
                  const r = await api<{
                    dueItems: number;
                    sent: number;
                    skipped: string | null;
                  }>("/whatsapp/run-now", { method: "POST" });
                  setMsg({
                    tone: r.skipped ? "err" : "ok",
                    text: r.skipped
                      ? `لم يُرسل: ${r.skipped}`
                      : `تم الفحص: ${r.dueItems} التزام مستحق للتنبيه · أُرسلت ${r.sent} رسالة`,
                  });
                  await loadLog();
                })
              }
            >
              تشغيل الفحص الآن
            </button>
          </div>
        </form>

        {preview && (
          <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-[var(--surface-2)] p-4 text-sm leading-7">
            {preview}
          </pre>
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

      {children}

      {/* سجل الإرسال */}
      <section className="card p-6 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">سجل كل التذكيرات المرسلة</h2>
          <button
            className="text-sm text-[var(--muted)] hover:text-[var(--brand)]"
            onClick={() => void loadLog()}
          >
            تحديث
          </button>
        </div>
        {log.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">
            لم تُرسل أي تذكيرات بعد.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-right text-xs text-[var(--muted)]">
                <tr>
                  <th className="py-2">الوقت</th>
                  <th>إلى</th>
                  <th>الالتزام</th>
                  <th>المرحلة</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {log.map((l) => (
                  <tr key={l.id} className="border-t border-[var(--border)]">
                    <td className="py-2 whitespace-nowrap">
                      {new Date(l.sentAt).toLocaleString("ar-SA")}
                    </td>
                    <td dir="ltr" className="text-right">
                      +{l.to}
                    </td>
                    <td>
                      {l.item ? `${l.item.org.name} — ${l.item.name}` : "—"}
                    </td>
                    <td>{milestoneLabel(l.milestone)}</td>
                    <td
                      style={{
                        color:
                          l.status === "sent" ? "var(--ok)" : "var(--danger)",
                      }}
                      title={l.error ?? undefined}
                    >
                      {l.status === "sent" ? "أُرسل" : "فشل"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
