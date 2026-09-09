"use client";

import { useEffect, useState } from "react";
import { api, PLAN_LABEL, TICKET_STATUS, TICKET_TYPE, type Office, type SiteContact, type Ticket } from "@/lib/api";
import { Field } from "@/components/ui";

const fmt = (d: string) => new Date(d).toLocaleDateString("ar-SA", { dateStyle: "medium" });

/** الدعم داخل حساب المكتب: أرقام خدمة العملاء + بلاغات للإدارة + حالة الاشتراك */
export function SupportView({ office }: { office: Office }) {
  const [contact, setContact] = useState<SiteContact | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [f, setF] = useState<{ type: Ticket["type"]; subject: string; body: string }>({ type: "issue", subject: "", body: "" });
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<SiteContact>("/support/contact").then(setContact).catch(() => setContact(null));
    api<{ tickets: Ticket[] }>("/support/tickets").then((r) => setTickets(r.tickets)).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ ticket: Ticket }>("/support/tickets", { method: "POST", body: JSON.stringify(f) });
      setTickets((t) => [r.ticket, ...t]);
      setF({ type: "issue", subject: "", body: "" });
      setMsg({ tone: "ok", text: "وصل بلاغك لإدارة ملتزم — سيصلك الرد هنا." });
    } catch (e) {
      setMsg({ tone: "err", text: e instanceof Error ? e.message : "حدث خطأ" });
    } finally {
      setBusy(false);
    }
  }

  async function close(id: string) {
    await api(`/support/tickets/${id}/close`, { method: "POST" }).catch(() => {});
    setTickets((t) => t.map((x) => (x.id === id ? { ...x, status: "closed" } : x)));
  }

  const wa = contact?.supportWhatsapp.replace(/\D/g, "");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="space-y-6">
        <section className="card p-6">
          <h2 className="text-lg font-bold">خدمة العملاء</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">إذا واجهت خللاً أو عندك استفسار عن الاشتراك تواصل معنا مباشرة.</p>
          {contact && (contact.supportPhone || contact.supportWhatsapp || contact.supportEmail) ? (
            <dl className="mt-4 space-y-3 text-sm">
              {contact.supportPhone && <Row k="هاتف" v={<a dir="ltr" href={`tel:${contact.supportPhone}`}>{contact.supportPhone}</a>} />}
              {contact.supportWhatsapp && (
                <Row k="واتساب" v={<a dir="ltr" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">{contact.supportWhatsapp}</a>} />
              )}
              {contact.supportEmail && <Row k="البريد" v={<a dir="ltr" href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a>} />}
              {contact.supportHours && <Row k="أوقات العمل" v={contact.supportHours} />}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">أرسل بلاغاً من النموذج وسنتواصل معك على بيانات مكتبك.</p>
          )}
          {contact?.announcement && (
            <p className="mt-4 rounded-lg bg-[var(--brand-soft)] px-3 py-2 text-sm text-[var(--brand-strong)]">{contact.announcement}</p>
          )}
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-bold">اشتراكك</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="الباقة" v={PLAN_LABEL[office.plan]} />
            <Row k="الحالة" v={office.status === "active" ? "فعّال" : "موقوف"} />
            {office.planExpiresAt && <Row k="ينتهي في" v={fmt(office.planExpiresAt)} />}
          </dl>
          <p className="mt-3 text-xs text-[var(--muted)]">لتغيير الباقة أو تجديدها أرسل بلاغاً من نوع «اشتراك وفواتير».</p>
        </section>
      </div>

      <div className="space-y-6">
        <form onSubmit={submit} className="card space-y-4 p-6">
          <h2 className="text-lg font-bold">أرسل بلاغاً للإدارة</h2>
          <Field label="النوع">
            <select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as Ticket["type"] })}>
              {Object.entries(TICKET_TYPE).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="العنوان">
            <input className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} required minLength={3} maxLength={150} placeholder="مثال: تذكير واتساب لم يصل" />
          </Field>
          <Field label="التفاصيل">
            <textarea className="input min-h-32" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} required minLength={10} maxLength={4000} placeholder="اشرح ما حدث وأي منشأة/التزام يتعلق به…" />
          </Field>
          {msg && (
            <p className={`rounded-lg px-3 py-2 text-sm ${msg.tone === "ok" ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]" : "bg-[#fdecee] text-[var(--danger)]"}`}>{msg.text}</p>
          )}
          <button className="btn btn-primary" disabled={busy}>{busy ? "لحظة…" : "إرسال البلاغ"}</button>
        </form>

        <section className="card p-6">
          <h2 className="text-lg font-bold">بلاغاتك السابقة</h2>
          {tickets.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">لا توجد بلاغات.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {tickets.map((t) => (
                <li key={t.id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{t.subject}</span>
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs">{TICKET_TYPE[t.type]}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${t.status === "answered" ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]" : t.status === "closed" ? "bg-[var(--surface-2)] text-[var(--muted)]" : "bg-[#fff4e0] text-[#8a5a00]"}`}>{TICKET_STATUS[t.status]}</span>
                    <span className="ms-auto text-xs text-[var(--muted)]">{fmt(t.createdAt)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[var(--muted)]">{t.body}</p>
                  {t.reply && (
                    <div className="mt-2 rounded-lg border-s-4 border-[var(--brand)] bg-[var(--surface-2)] px-3 py-2">
                      <div className="text-xs font-semibold text-[var(--brand-strong)]">رد الإدارة</div>
                      <p className="mt-1 whitespace-pre-wrap">{t.reply}</p>
                    </div>
                  )}
                  {t.status !== "closed" && (
                    <button onClick={() => close(t.id)} className="mt-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)]">إغلاق البلاغ</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--muted)]">{k}</dt>
      <dd className="font-medium text-[var(--brand-strong)]">{v}</dd>
    </div>
  );
}
