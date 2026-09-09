"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Field, Stat } from "@/components/ui";
import {
  api,
  getToken,
  setToken,
  PLAN_LABEL,
  TICKET_STATUS,
  TICKET_TYPE,
  type AdminOffice,
  type Office,
  type SiteContact,
  type Ticket,
} from "@/lib/api";

const TABS = [
  ["overview", "نظرة عامة"],
  ["offices", "المكاتب والاشتراكات"],
  ["tickets", "بلاغات الدعم"],
  ["site", "إعدادات الموقع"],
  ["account", "حسابي"],
] as const;
type Tab = (typeof TABS)[number][0];

type Overview = {
  offices: number;
  active: number;
  suspended: number;
  orgs: number;
  items: number;
  openTickets: number;
  sentToday: number;
  byPlan: Record<string, number>;
};

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("ar-SA", { dateStyle: "medium" }) : "—");
const toInput = (d: string | null) => (d ? d.slice(0, 10) : "");

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<Office | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!getToken()) return void router.replace("/login");
    api<{ office: Office }>("/auth/me")
      .then((r) => (r.office.role === "admin" ? setMe(r.office) : router.replace("/dashboard")))
      .catch(() => router.replace("/login"));
  }, [router]);

  const flash = useCallback((tone: "ok" | "err", text: string) => {
    setMsg({ tone, text });
    setTimeout(() => setMsg(null), 4000);
  }, []);

  const logout = () => {
    setToken(null);
    router.replace("/login");
  };

  if (!me) return <main className="grid min-h-screen place-items-center text-[var(--muted)]">جارٍ التحميل…</main>;

  return (
    <main className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-5 py-3">
          <Logo href="/admin" />
          <span className="rounded-full bg-[var(--brand)] px-2.5 py-0.5 text-xs font-semibold text-white">لوحة الإدارة</span>
          <nav className="ms-auto flex flex-wrap gap-1">
            {TABS.map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-full px-4 py-1.5 text-sm transition ${tab === k ? "bg-[var(--brand)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface-2)]"}`}
              >
                {label}
              </button>
            ))}
          </nav>
          <Link href="/dashboard" className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)] hover:text-[var(--brand)]">لوحة المكتب</Link>
          <button onClick={logout} className="text-sm text-[var(--muted)] hover:text-[var(--danger)]">خروج</button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-7">
        {msg && (
          <p className={`mb-4 rounded-lg px-3 py-2 text-sm ${msg.tone === "ok" ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]" : "bg-[#fdecee] text-[var(--danger)]"}`}>{msg.text}</p>
        )}
        {tab === "overview" && <OverviewTab onOpenTickets={() => setTab("tickets")} />}
        {tab === "offices" && <OfficesTab flash={flash} />}
        {tab === "tickets" && <TicketsTab flash={flash} />}
        {tab === "site" && <SiteTab flash={flash} />}
        {tab === "account" && <AccountTab me={me} flash={flash} />}
      </div>
    </main>
  );
}

function OverviewTab({ onOpenTickets }: { onOpenTickets: () => void }) {
  const [o, setO] = useState<Overview | null>(null);
  useEffect(() => {
    api<Overview>("/admin/overview").then(setO).catch(() => {});
  }, []);
  if (!o) return <p className="py-20 text-center text-[var(--muted)]">جارٍ التحميل…</p>;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="المكاتب المسجّلة" value={String(o.offices)} sub={`فعّال ${o.active} · موقوف ${o.suspended}`} />
        <Stat label="المنشآت المُدارة" value={String(o.orgs)} sub={`${o.items} التزام`} />
        <Stat label="تذكيرات آخر ٢٤ ساعة" value={String(o.sentToday)} tone="ok" />
        <button onClick={onOpenTickets} className="text-start">
          <Stat label="بلاغات مفتوحة" value={String(o.openTickets)} tone={o.openTickets ? "warn" : undefined} sub="اضغط للعرض" />
        </button>
      </div>
      <section className="card p-6">
        <h2 className="font-bold">توزيع الباقات</h2>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {(Object.keys(PLAN_LABEL) as Office["plan"][]).map((p) => (
            <span key={p} className="rounded-full bg-[var(--surface-2)] px-3 py-1">
              {PLAN_LABEL[p]}: <b>{o.byPlan[p] ?? 0}</b>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function OfficesTab({ flash }: { flash: (t: "ok" | "err", s: string) => void }) {
  const [list, setList] = useState<AdminOffice[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<AdminOffice | null>(null);

  const load = useCallback(
    (query = "") =>
      api<{ offices: AdminOffice[] }>(`/admin/offices${query ? `?q=${encodeURIComponent(query)}` : ""}`)
        .then((r) => setList(r.offices.filter((x) => x.role !== "admin")))
        .catch(() => {}),
    [],
  );
  useEffect(() => void load(), [load]);

  async function save(id: string, data: Partial<Pick<AdminOffice, "plan" | "status" | "adminNote">> & { planExpiresAt?: string | null }) {
    try {
      const r = await api<{ office: AdminOffice }>(`/admin/offices/${id}`, { method: "PATCH", body: JSON.stringify(data) });
      setList((l) => l.map((x) => (x.id === id ? r.office : x)));
      setSel(r.office);
      flash("ok", "تم الحفظ.");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "حدث خطأ");
    }
  }

  async function resetPw(id: string) {
    const next = prompt("كلمة المرور الجديدة للمكتب (٨ أحرف على الأقل):");
    if (!next) return;
    try {
      await api(`/admin/offices/${id}/reset-password`, { method: "POST", body: JSON.stringify({ next }) });
      flash("ok", "تم تغيير كلمة مرور المكتب — أبلغه بها.");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "حدث خطأ");
    }
  }

  async function remove(o: AdminOffice) {
    if (!confirm(`حذف مكتب «${o.name}» وكل منشآته والتزاماته نهائياً؟`)) return;
    try {
      await api(`/admin/offices/${o.id}`, { method: "DELETE" });
      setList((l) => l.filter((x) => x.id !== o.id));
      setSel(null);
      flash("ok", "تم حذف المكتب.");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "حدث خطأ");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <section className="card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[var(--border)] p-4">
          <h2 className="font-bold">المكاتب ({list.length})</h2>
          <input
            className="input ms-auto max-w-xs"
            placeholder="بحث بالاسم أو البريد…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              load(e.target.value);
            }}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-2)] text-xs text-[var(--muted)]">
              <tr>
                <th className="p-3 text-start">المكتب</th>
                <th className="p-3 text-start">الباقة</th>
                <th className="p-3 text-start">الحالة</th>
                <th className="p-3 text-start">منشآت</th>
                <th className="p-3 text-start">واتساب</th>
                <th className="p-3 text-start">سجّل في</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id} onClick={() => setSel(o)} className={`cursor-pointer border-t border-[var(--border)] hover:bg-[var(--surface-2)] ${sel?.id === o.id ? "bg-[var(--brand-soft)]" : ""}`}>
                  <td className="p-3">
                    <div className="font-semibold">{o.name}</div>
                    <div dir="ltr" className="text-xs text-[var(--muted)]">{o.email}</div>
                  </td>
                  <td className="p-3">{PLAN_LABEL[o.plan]}{o.planExpiresAt && <div className="text-xs text-[var(--muted)]">حتى {fmt(o.planExpiresAt)}</div>}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${o.status === "active" ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]" : "bg-[#fdecee] text-[var(--danger)]"}`}>{o.status === "active" ? "فعّال" : "موقوف"}</span>
                  </td>
                  <td className="p-3">{o._count.orgs}</td>
                  <td className="p-3 text-xs">{o.waSession?.status === "connected" ? <span className="text-[var(--ok)]">متصل</span> : <span className="text-[var(--muted)]">غير متصل</span>}</td>
                  <td className="p-3 text-xs text-[var(--muted)]">{fmt(o.createdAt)}</td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-[var(--muted)]">لا توجد مكاتب.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-6">
        {!sel ? (
          <p className="text-sm text-[var(--muted)]">اختر مكتباً من الجدول لإدارة اشتراكه.</p>
        ) : (
          <OfficeEditor key={sel.id} o={sel} onSave={(d) => save(sel.id, d)} onResetPw={() => resetPw(sel.id)} onDelete={() => remove(sel)} />
        )}
      </section>
    </div>
  );
}

function OfficeEditor({
  o,
  onSave,
  onResetPw,
  onDelete,
}: {
  o: AdminOffice;
  onSave: (d: { plan: AdminOffice["plan"]; status: AdminOffice["status"]; planExpiresAt: string | null; adminNote: string }) => void;
  onResetPw: () => void;
  onDelete: () => void;
}) {
  const [f, setF] = useState({ plan: o.plan, status: o.status, planExpiresAt: toInput(o.planExpiresAt), adminNote: o.adminNote });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...f, planExpiresAt: f.planExpiresAt || null });
      }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-lg font-bold">{o.name}</h2>
        <dl className="mt-2 space-y-1 text-sm text-[var(--muted)]">
          <div dir="ltr" className="text-start">{o.email}</div>
          {o.contactPhone && <div dir="ltr" className="text-start">{o.contactPhone}</div>}
          <div>{o._count.orgs} منشأة · {o._count.tickets} بلاغ · واتساب {o.waSession?.status === "connected" ? `متصل (${o.waSession.phone ?? ""})` : "غير متصل"}</div>
        </dl>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="الباقة">
          <select className="input" value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value as AdminOffice["plan"] })}>
            {(Object.keys(PLAN_LABEL) as Office["plan"][]).map((p) => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
          </select>
        </Field>
        <Field label="الحالة">
          <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as AdminOffice["status"] })}>
            <option value="active">فعّال</option>
            <option value="suspended">موقوف (يُمنع الدخول والتذكيرات)</option>
          </select>
        </Field>
      </div>
      <Field label="تاريخ انتهاء الاشتراك" hint="اتركه فارغاً بلا انتهاء">
        <input className="input" type="date" dir="ltr" value={f.planExpiresAt} onChange={(e) => setF({ ...f, planExpiresAt: e.target.value })} />
      </Field>
      <Field label="ملاحظة إدارية (لا يراها المكتب)">
        <textarea className="input min-h-20" maxLength={1000} value={f.adminNote} onChange={(e) => setF({ ...f, adminNote: e.target.value })} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary">حفظ</button>
        <button type="button" onClick={onResetPw} className="btn">إعادة تعيين كلمة المرور</button>
        <button type="button" onClick={onDelete} className="btn ms-auto text-[var(--danger)]">حذف المكتب</button>
      </div>
    </form>
  );
}

function TicketsTab({ flash }: { flash: (t: "ok" | "err", s: string) => void }) {
  const [list, setList] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<"" | Ticket["status"]>("open");
  const [reply, setReply] = useState<Record<string, string>>({});

  const load = useCallback(
    (s: string) => api<{ tickets: Ticket[] }>(`/admin/tickets${s ? `?status=${s}` : ""}`).then((r) => setList(r.tickets)).catch(() => {}),
    [],
  );
  useEffect(() => void load(filter), [filter, load]);

  async function patch(id: string, data: { reply?: string; status?: Ticket["status"] }) {
    try {
      const r = await api<{ ticket: Ticket }>(`/admin/tickets/${id}`, { method: "PATCH", body: JSON.stringify(data) });
      setList((l) => l.map((t) => (t.id === id ? r.ticket : t)));
      setReply((m) => ({ ...m, [id]: "" }));
      flash("ok", "تم التحديث.");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "حدث خطأ");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {([["open", "مفتوحة"], ["answered", "تم الرد"], ["closed", "مغلقة"], ["", "الكل"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-4 py-1.5 text-sm ${filter === k ? "bg-[var(--brand)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)]"}`}>{l}</button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="card p-12 text-center text-sm text-[var(--muted)]">لا توجد بلاغات.</div>
      ) : (
        list.map((t) => (
          <article key={t.id} className="card p-5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-bold">{t.subject}</span>
              <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs">{TICKET_TYPE[t.type]}</span>
              <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs">{TICKET_STATUS[t.status]}</span>
              <span className="ms-auto text-xs text-[var(--muted)]">{fmt(t.createdAt)}</span>
            </div>
            {t.office && (
              <div className="mt-1 text-xs text-[var(--muted)]">
                {t.office.name} · <span dir="ltr">{t.office.email}</span>{t.office.contactPhone && <> · <span dir="ltr">{t.office.contactPhone}</span></>}
              </div>
            )}
            <p className="mt-3 whitespace-pre-wrap text-sm">{t.body}</p>
            {t.reply && (
              <div className="mt-3 rounded-lg border-s-4 border-[var(--brand)] bg-[var(--surface-2)] px-3 py-2 text-sm">
                <div className="text-xs font-semibold text-[var(--brand-strong)]">ردّك</div>
                <p className="mt-1 whitespace-pre-wrap">{t.reply}</p>
              </div>
            )}
            {t.status !== "closed" && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <textarea className="input min-h-16 flex-1" placeholder="اكتب الرد للمكتب…" value={reply[t.id] ?? ""} onChange={(e) => setReply({ ...reply, [t.id]: e.target.value })} />
                <div className="flex gap-2 sm:flex-col">
                  <button onClick={() => patch(t.id, { reply: reply[t.id] })} disabled={!reply[t.id]?.trim()} className="btn btn-primary">إرسال الرد</button>
                  <button onClick={() => patch(t.id, { status: "closed" })} className="btn">إغلاق</button>
                </div>
              </div>
            )}
          </article>
        ))
      )}
    </div>
  );
}

function SiteTab({ flash }: { flash: (t: "ok" | "err", s: string) => void }) {
  const [f, setF] = useState<SiteContact | null>(null);
  useEffect(() => {
    api<SiteContact>("/support/contact").then(setF).catch(() => {});
  }, []);
  if (!f) return <p className="py-20 text-center text-[var(--muted)]">جارٍ التحميل…</p>;
  const set = (k: keyof SiteContact) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api("/admin/site", { method: "PATCH", body: JSON.stringify(f) });
          flash("ok", "تم حفظ إعدادات الموقع — تظهر للمكاتب في صفحة الدعم والصفحة الرئيسية.");
        } catch (err) {
          flash("err", err instanceof Error ? err.message : "حدث خطأ");
        }
      }}
      className="card max-w-2xl space-y-4 p-6"
    >
      <h2 className="text-lg font-bold">بيانات خدمة العملاء</h2>
      <p className="text-sm text-[var(--muted)]">تظهر للمكاتب داخل تبويب «الدعم» وفي أسفل الصفحة الرئيسية.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="هاتف خدمة العملاء"><input className="input" dir="ltr" value={f.supportPhone} onChange={set("supportPhone")} placeholder="0500000000" /></Field>
        <Field label="واتساب الدعم" hint="بصيغة دولية بدون +"><input className="input" dir="ltr" value={f.supportWhatsapp} onChange={set("supportWhatsapp")} placeholder="9665XXXXXXXX" /></Field>
        <Field label="بريد الدعم"><input className="input" dir="ltr" type="email" value={f.supportEmail} onChange={set("supportEmail")} placeholder="support@multazim.sa" /></Field>
        <Field label="أوقات العمل"><input className="input" value={f.supportHours} onChange={set("supportHours")} placeholder="الأحد–الخميس ٩ص–٥م" /></Field>
      </div>
      <Field label="إعلان للمكاتب (اختياري)" hint="يظهر في صفحة الدعم لكل المكاتب — مثل صيانة مجدولة">
        <textarea className="input min-h-20" maxLength={500} value={f.announcement} onChange={set("announcement")} />
      </Field>
      <button className="btn btn-primary">حفظ</button>
    </form>
  );
}

function AccountTab({ me, flash }: { me: Office; flash: (t: "ok" | "err", s: string) => void }) {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (pw.next !== pw.confirm) return flash("err", "تأكيد كلمة المرور غير مطابق.");
        try {
          await api("/auth/password", { method: "POST", body: JSON.stringify({ current: pw.current, next: pw.next }) });
          setPw({ current: "", next: "", confirm: "" });
          flash("ok", "تم تغيير كلمة المرور.");
        } catch (err) {
          flash("err", err instanceof Error ? err.message : "حدث خطأ");
        }
      }}
      className="card max-w-md space-y-4 p-6"
    >
      <h2 className="text-lg font-bold">حساب المدير</h2>
      <p dir="ltr" className="text-start text-sm text-[var(--muted)]">{me.email}</p>
      <Field label="كلمة المرور الحالية"><input className="input" type="password" dir="ltr" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></Field>
      <Field label="كلمة المرور الجديدة"><input className="input" type="password" dir="ltr" minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required /></Field>
      <Field label="تأكيد كلمة المرور"><input className="input" type="password" dir="ltr" minLength={8} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required /></Field>
      <button className="btn btn-primary">تغيير كلمة المرور</button>
    </form>
  );
}
