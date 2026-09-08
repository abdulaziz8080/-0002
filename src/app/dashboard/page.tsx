"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { OrgWhatsappPanel } from "@/components/OrgWhatsappPanel";
import { OrgsWhatsappSettings } from "@/components/OrgsWhatsappSettings";
import { WhatsappPanel } from "@/components/WhatsappPanel";
import { api, getToken, setToken, type Office } from "@/lib/api";
import { CATEGORY_COLORS, OBLIGATION_TEMPLATES } from "@/lib/obligations";
import {
  Item,
  STATUS_STYLES,
  addDays,
  daysUntil,
  statusOf,
  toISODate,
  useOrgs,
} from "@/lib/store";

const nf = new Intl.NumberFormat("ar-SA");

function dueLabel(item: Item) {
  const d = daysUntil(item.dueDate);
  if (d < 0) return `متأخر ${nf.format(Math.abs(d))} يوم`;
  if (d === 0) return "يستحق اليوم";
  return `باقي ${nf.format(d)} يوم`;
}

type Tab = "orgs" | "settings";

export default function Dashboard() {
  const router = useRouter();
  const [office, setOffice] = useState<Office | null>(null);
  const [tab, setTab] = useState<Tab>("orgs");
  const data = useOrgs();

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api<{ office: Office }>("/auth/me")
      .then((r) => setOffice(r.office))
      .catch(() => router.replace("/login"));
  }, [router]);

  if (!office) {
    return (
      <main className="grid min-h-screen place-items-center text-[var(--muted)]">
        جارٍ التحميل…
      </main>
    );
  }

  return (
    <main className="glow min-h-screen pb-20">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
        <div className="flex items-center gap-4">
          <Logo href="/dashboard" />
          <span className="hidden text-sm text-[var(--muted)] sm:inline">
            {office.name}
          </span>
        </div>
        <nav className="flex items-center gap-1 rounded-xl bg-[var(--surface-2)] p-1 text-sm">
          <TabBtn active={tab === "orgs"} onClick={() => setTab("orgs")}>
            المنشآت والالتزامات
          </TabBtn>
          <TabBtn
            active={tab === "settings"}
            onClick={() => setTab("settings")}
          >
            الإعدادات
          </TabBtn>
        </nav>
        <button
          onClick={() => {
            setToken(null);
            router.replace("/login");
          }}
          className="btn btn-outline text-sm"
        >
          تسجيل الخروج
        </button>
      </header>

      <div className="mx-auto max-w-6xl px-6">
        {tab === "orgs" ? (
          <OrgsView data={data} />
        ) : (
          <WhatsappPanel office={office} onOfficeChange={setOffice}>
            <OrgsWhatsappSettings
              orgs={data.orgs}
              onSave={(id, input) => data.updateOrg(id, input)}
            />
          </WhatsappPanel>
        )}
      </div>
    </main>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg px-4 py-2 font-semibold transition"
      style={
        active
          ? {
              background: "var(--surface)",
              boxShadow: "0 1px 2px rgba(0,0,0,.06)",
            }
          : { color: "var(--muted)" }
      }
    >
      {children}
    </button>
  );
}

function OrgsView({ data }: { data: ReturnType<typeof useOrgs> }) {
  const {
    orgs,
    loaded,
    error,
    addOrg,
    updateOrg,
    removeOrg,
    addItem,
    renewItem,
    toggleDone,
    removeItem,
  } = data;
  const [orgTab, setOrgTab] = useState<"items" | "whatsapp">("items");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgCr, setOrgCr] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [templateId, setTemplateId] = useState(OBLIGATION_TEMPLATES[0].id);
  const [dueDate, setDueDate] = useState(toISODate(addDays(new Date(), 30)));
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const active = useMemo(
    () => orgs.find((o) => o.id === activeId) ?? orgs[0],
    [orgs, activeId],
  );

  const items = useMemo(
    () =>
      [...(active?.items ?? [])].sort(
        (a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate),
      ),
    [active],
  );

  const stats = useMemo(() => {
    const all = orgs.flatMap((o) => o.items).filter((i) => !i.done);
    const overdue = all.filter((i) => statusOf(i) === "متأخر");
    const soon = all.filter((i) => {
      const d = daysUntil(i.dueDate);
      return d >= 0 && d <= 30;
    });
    const exposure = [...overdue, ...soon].reduce(
      (s, i) => s + i.estimatedCost,
      0,
    );
    return {
      total: all.length,
      overdue: overdue.length,
      soon: soon.length,
      exposure,
    };
  }, [orgs]);

  const guard = (p: Promise<unknown>) =>
    p.catch((e) => setErr(e instanceof Error ? e.message : "حدث خطأ"));

  if (!loaded)
    return (
      <p className="py-20 text-center text-[var(--muted)]">جارٍ التحميل…</p>
    );

  return (
    <>
      {(error || err) && (
        <p className="mb-4 rounded-lg bg-[#fdecee] px-3 py-2 text-sm text-[var(--danger)]">
          {error ?? err}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="إجمالي الالتزامات" value={nf.format(stats.total)} />
        <StatCard
          label="متأخرة الآن"
          value={nf.format(stats.overdue)}
          tone="danger"
        />
        <StatCard
          label="تستحق خلال ٣٠ يوم"
          value={nf.format(stats.soon)}
          tone="warn"
        />
        <StatCard
          label="التعرّض المالي التقديري"
          value={`${nf.format(stats.exposure)} ريال`}
          tone={stats.exposure > 0 ? "danger" : "ok"}
        />
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center gap-2">
          {orgs.map((o) => (
            <button
              key={o.id}
              onClick={() => setActiveId(o.id)}
              className="rounded-xl border px-4 py-2 text-sm transition"
              style={{
                borderColor:
                  o.id === active?.id ? "var(--brand)" : "var(--border)",
                background:
                  o.id === active?.id ? "var(--brand-soft)" : "var(--surface)",
              }}
            >
              {o.name}
            </button>
          ))}
          <button
            onClick={() => setShowOrgForm((v) => !v)}
            className="rounded-xl border border-dashed border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] transition hover:border-[var(--brand)]"
          >
            + منشأة جديدة
          </button>
        </div>

        {(showOrgForm || orgs.length === 0) && (
          <form
            className="card mt-4 flex flex-wrap items-end gap-3 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!orgName.trim()) return;
              void guard(
                addOrg({
                  name: orgName.trim(),
                  crNumber: orgCr.trim(),
                  contactPhone: orgPhone.trim(),
                }).then((o) => {
                  setActiveId(o.id);
                  setOrgName("");
                  setOrgCr("");
                  setOrgPhone("");
                  setShowOrgForm(false);
                }),
              );
            }}
          >
            <Field label="اسم المنشأة">
              <input
                className="input w-64"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="مثال: مؤسسة الرواد التجارية"
              />
            </Field>
            <Field label="رقم السجل التجاري">
              <input
                className="input w-44"
                dir="ltr"
                value={orgCr}
                onChange={(e) => setOrgCr(e.target.value)}
                placeholder="1010XXXXXX"
              />
            </Field>
            <Field label="واتساب مسؤول المنشأة (اختياري)">
              <input
                className="input w-44"
                dir="ltr"
                value={orgPhone}
                onChange={(e) => setOrgPhone(e.target.value)}
                placeholder="05XXXXXXXX"
              />
            </Field>
            <button className="btn btn-primary">إضافة</button>
          </form>
        )}
      </section>

      {active && (
        <section className="mt-6">
          <div className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{active.name}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  سجل تجاري {active.crNumber || "—"} ·{" "}
                  {nf.format(active.items.length)} التزام
                  {active.contactPhone && (
                    <>
                      {" "}
                      · مسؤول: <span dir="ltr">{active.contactPhone}</span>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  if (!confirm(`حذف منشأة «${active.name}» وكل التزاماتها؟`))
                    return;
                  void guard(
                    removeOrg(active.id).then(() => setActiveId(null)),
                  );
                }}
                className="text-sm text-[var(--muted)] hover:text-[var(--danger)]"
              >
                حذف المنشأة
              </button>
            </div>

            <div className="mt-5 flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 text-sm">
              <TabBtn
                active={orgTab === "items"}
                onClick={() => setOrgTab("items")}
              >
                الالتزامات
              </TabBtn>
              <TabBtn
                active={orgTab === "whatsapp"}
                onClick={() => setOrgTab("whatsapp")}
              >
                واتساب المنشأة
                {active.alertPhones && (
                  <span className="ms-1 text-xs text-[var(--ok)]">●</span>
                )}
              </TabBtn>
            </div>

            {orgTab === "items" && (
              <form
                className="mt-6 flex flex-wrap items-end gap-3 border-t border-[var(--border)] pt-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  void guard(
                    addItem(active.id, templateId, dueDate, note.trim()).then(
                      () => setNote(""),
                    ),
                  );
                }}
              >
                <Field label="الالتزام">
                  <select
                    className="input w-72"
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                  >
                    {OBLIGATION_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.authority}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="تاريخ الاستحقاق">
                  <input
                    className="input"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </Field>
                <Field label="ملاحظة (اختياري)">
                  <input
                    className="input w-56"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="مثال: فرع الملز"
                  />
                </Field>
                <button className="btn btn-primary">إضافة التزام</button>
              </form>
            )}
          </div>

          {orgTab === "whatsapp" && (
            <OrgWhatsappPanel
              org={active}
              onSave={(input) => updateOrg(active.id, input)}
            />
          )}

          {orgTab === "items" && (
            <div className="mt-6 space-y-3">
              {items.length === 0 && (
                <div className="card p-10 text-center text-[var(--muted)]">
                  ما فيه التزامات مسجلة بعد. أضف أول التزام من الأعلى.
                </div>
              )}
              {items.map((item) => {
                const status = statusOf(item);
                const style = STATUS_STYLES[status];
                const template = OBLIGATION_TEMPLATES.find(
                  (t) => t.id === item.templateId,
                );
                return (
                  <article
                    key={item.id}
                    className="card p-5"
                    style={item.done ? { opacity: 0.6 } : undefined}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span
                            className="rounded-full px-3 py-1 text-xs font-medium"
                            style={{ background: style.bg, color: style.text }}
                          >
                            {status}
                            {!item.done && ` · ${dueLabel(item)}`}
                          </span>
                          <span
                            className="rounded-full border px-3 py-1 text-xs"
                            style={{
                              borderColor: CATEGORY_COLORS[item.category],
                              color: CATEGORY_COLORS[item.category],
                            }}
                          >
                            {item.category}
                          </span>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {item.authority} · يستحق في {item.dueDate} · التنبيه
                          يبدأ قبل {nf.format(item.leadDays)} يوم
                        </p>
                        {item.note && (
                          <p className="mt-2 text-sm text-[var(--muted)]">
                            📝 {item.note}
                          </p>
                        )}
                        {template && (
                          <p className="mt-3 rounded-lg bg-[var(--surface-2)] p-3 text-sm leading-6 text-[var(--muted)]">
                            <b className="text-[var(--foreground)]">
                              أثر التأخير:{" "}
                            </b>
                            {template.lateImpact}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-stretch gap-2">
                        <button
                          onClick={() =>
                            void guard(renewItem(active.id, item.id))
                          }
                          className="btn btn-primary text-sm"
                        >
                          جُدِّد — احسب التالي
                        </button>
                        <button
                          onClick={() =>
                            void guard(
                              toggleDone(active.id, item.id, !item.done),
                            )
                          }
                          className="btn btn-outline text-sm"
                        >
                          {item.done ? "إرجاع للمتابعة" : "تعليم كمنجز"}
                        </button>
                        <button
                          onClick={() =>
                            void guard(removeItem(active.id, item.id))
                          }
                          className="btn btn-outline text-sm hover:border-[var(--danger)] hover:text-[var(--danger)]"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger" | "warn" | "ok";
}) {
  const color =
    tone === "danger"
      ? "var(--danger)"
      : tone === "warn"
        ? "var(--warn)"
        : tone === "ok"
          ? "var(--ok)"
          : "var(--foreground)";
  return (
    <div className="card p-5">
      <div className="text-sm text-[var(--muted)]">{label}</div>
      <div className="mt-2 text-2xl font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}
