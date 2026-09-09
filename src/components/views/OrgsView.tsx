"use client";

import { useEffect, useMemo, useState } from "react";
import type { Item, Org } from "@/lib/api";
import type { OrgsStore } from "@/lib/store";
import { CATEGORY_COLORS, OBLIGATION_TEMPLATES } from "@/lib/obligations";
import { addDaysISO, daysUntil, fmtCount, fmtDate, fmtMoney, fmtNum, orgSummary, relDue, statusOf, todayISO } from "@/lib/status";
import { Empty, Field, StatusPill, TabBtn } from "@/components/ui";
import { OrgWhatsappPanel } from "@/components/OrgWhatsappPanel";

type ItemFilter = "open" | "risk" | "done" | "all";

export function OrgsView({
  data,
  selectedId,
  onSelect,
  openAdd,
  onAddHandled,
}: {
  data: OrgsStore;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  openAdd: boolean;
  onAddHandled: () => void;
}) {
  const { orgs, addOrg, updateOrg, removeOrg, addItem, updateItem, renewItem, removeItem } = data;
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (openAdd) {
      setAdding(true);
      onAddHandled();
    }
  }, [openAdd, onAddHandled]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orgs
      .map(orgSummary)
      .filter(({ org }) => !needle || [org.name, org.crNumber, org.city].some((v) => v.toLowerCase().includes(needle)))
      .sort((a, b) => (a.nearest ?? 1e9) - (b.nearest ?? 1e9));
  }, [orgs, q]);

  const active = orgs.find((o) => o.id === selectedId) ?? orgs[0] ?? null;
  const guard = (p: Promise<unknown>) => p.catch((e) => setErr(e instanceof Error ? e.message : "حدث خطأ"));

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="space-y-3">
        <div className="flex gap-2">
          <input className="input" placeholder="بحث عن منشأة" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-primary shrink-0" onClick={() => setAdding(true)}>
            + منشأة
          </button>
        </div>
        <div className="card max-h-[70vh] overflow-y-auto">
          {list.map((r) => (
            <button
              key={r.org.id}
              onClick={() => onSelect(r.org.id)}
              className={`flex w-full items-center gap-3 border-b border-[var(--border)] px-4 py-3 text-start last:border-0 hover:bg-[var(--surface-2)] ${
                active?.id === r.org.id ? "bg-[var(--brand-soft)]" : ""
              }`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: r.overdue ? "var(--danger)" : r.soon ? "var(--warn)" : "var(--ok)" }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{r.org.name}</span>
                <span className="block text-xs text-[var(--muted)]">
                  {fmtCount(r.total)}
                  {r.nearest !== null && ` · ${relDue(r.nearest)}`}
                </span>
              </span>
            </button>
          ))}
          {list.length === 0 && <p className="p-6 text-center text-sm text-[var(--muted)]">{orgs.length ? "لا نتائج" : "لا منشآت بعد"}</p>}
        </div>
      </aside>

      <div className="min-w-0 space-y-6">
        {err && (
          <p className="rounded-lg bg-[#fdecee] px-3 py-2 text-sm text-[var(--danger)]">
            {err}{" "}
            <button className="underline" onClick={() => setErr(null)}>
              إغلاق
            </button>
          </p>
        )}
        {adding && (
          <AddOrgForm
            onCancel={() => setAdding(false)}
            onSubmit={(input) =>
              guard(
                addOrg(input).then((o) => {
                  onSelect(o.id);
                  setAdding(false);
                }),
              )
            }
          />
        )}
        {!active && !adding && (
          <Empty title="لا توجد منشآت" body="أضف أول منشأة من زر «+ منشأة» وابدأ بتسجيل التزاماتها من القائمة الجاهزة." />
        )}
        {active && (
          <OrgProfile
            key={active.id}
            org={active}
            onUpdate={(patch) => guard(updateOrg(active.id, patch))}
            onRemove={() => {
              if (!confirm(`حذف منشأة «${active.name}» وكل التزاماتها؟`)) return;
              void guard(removeOrg(active.id).then(() => onSelect(null)));
            }}
            onAddItem={(input) => guard(addItem(active.id, input))}
            onUpdateItem={(itemId, patch) => guard(updateItem(active.id, itemId, patch))}
            onRenew={(itemId) => guard(renewItem(active.id, itemId))}
            onRemoveItem={(itemId) => {
              if (confirm("حذف هذا الالتزام؟")) void guard(removeItem(active.id, itemId));
            }}
          />
        )}
      </div>
    </div>
  );
}

function AddOrgForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (input: Parameters<OrgsStore["addOrg"]>[0]) => Promise<unknown> }) {
  const [f, setF] = useState({ name: "", crNumber: "", city: "", contactName: "", contactPhone: "", contactEmail: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className="card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (f.name.trim().length < 2) return;
        void onSubmit({ ...f, name: f.name.trim() });
      }}
    >
      <h2 className="font-bold">منشأة جديدة</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="اسم المنشأة *">
          <input className="input" value={f.name} onChange={set("name")} placeholder="مثال: مطاعم الذواقة" required />
        </Field>
        <Field label="السجل التجاري">
          <input className="input" dir="ltr" value={f.crNumber} onChange={set("crNumber")} placeholder="1010XXXXXX" />
        </Field>
        <Field label="المدينة">
          <input className="input" value={f.city} onChange={set("city")} />
        </Field>
        <Field label="مسؤول التواصل">
          <input className="input" value={f.contactName} onChange={set("contactName")} />
        </Field>
        <Field label="جوال المسؤول">
          <input className="input" dir="ltr" value={f.contactPhone} onChange={set("contactPhone")} placeholder="05XXXXXXXX" />
        </Field>
        <Field label="بريد المسؤول">
          <input className="input" dir="ltr" type="email" value={f.contactEmail} onChange={set("contactEmail")} />
        </Field>
      </div>
      <div className="mt-4 flex gap-2">
        <button className="btn btn-primary">إضافة المنشأة</button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          إلغاء
        </button>
      </div>
    </form>
  );
}

function OrgProfile({
  org,
  onUpdate,
  onRemove,
  onAddItem,
  onUpdateItem,
  onRenew,
  onRemoveItem,
}: {
  org: Org;
  onUpdate: (patch: Partial<Parameters<OrgsStore["addOrg"]>[0]>) => Promise<unknown>;
  onRemove: () => void;
  onAddItem: (input: Parameters<OrgsStore["addItem"]>[1]) => Promise<unknown>;
  onUpdateItem: (itemId: string, patch: Parameters<OrgsStore["updateItem"]>[2]) => Promise<unknown>;
  onRenew: (itemId: string) => Promise<unknown>;
  onRemoveItem: (itemId: string) => void;
}) {
  const [tab, setTab] = useState<"items" | "profile" | "whatsapp">("items");
  const [filter, setFilter] = useState<ItemFilter>("open");
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const sum = orgSummary(org);

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...org.items]
      .filter((i) => {
        if (filter === "open") return !i.done;
        if (filter === "done") return i.done;
        if (filter === "risk") return !i.done && daysUntil(i.dueDate) <= 30;
        return true;
      })
      .filter((i) => !needle || i.name.toLowerCase().includes(needle) || i.authority.toLowerCase().includes(needle))
      .sort((a, b) => Number(a.done) - Number(b.done) || daysUntil(a.dueDate) - daysUntil(b.dueDate));
  }, [org.items, filter, q]);

  return (
    <>
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{org.name}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {[org.city, org.crNumber && `سجل ${org.crNumber}`, org.contactName].filter(Boolean).join(" · ") || "أكمل بيانات المنشأة من تبويب «بيانات المنشأة»"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <span>
              <b>{fmtNum(sum.total)}</b> التزام
            </span>
            <span style={{ color: sum.overdue ? "var(--danger)" : undefined }}>
              <b>{fmtNum(sum.overdue)}</b> متأخر
            </span>
            <span style={{ color: sum.soon ? "var(--warn)" : undefined }}>
              <b>{fmtNum(sum.soon)}</b> خلال ٣٠ يوماً
            </span>
            {sum.exposure > 0 && <span className="text-[var(--danger)]">تعرّض {fmtMoney(sum.exposure)}</span>}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-1 rounded-xl bg-[var(--surface-2)] p-1">
          <TabBtn active={tab === "items"} onClick={() => setTab("items")}>
            الالتزامات
          </TabBtn>
          <TabBtn active={tab === "profile"} onClick={() => setTab("profile")}>
            بيانات المنشأة
          </TabBtn>
          <TabBtn active={tab === "whatsapp"} onClick={() => setTab("whatsapp")}>
            واتساب المنشأة {org.alertPhones && <span className="text-xs text-[var(--ok)]">●</span>}
          </TabBtn>
        </div>
      </div>

      {tab === "profile" && <ProfileForm org={org} onUpdate={onUpdate} onRemove={onRemove} />}

      {tab === "whatsapp" && <OrgWhatsappPanel org={org} onSave={(input) => onUpdate(input).then(() => undefined)} />}

      {tab === "items" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["open", "القائمة"],
                  ["risk", "خلال ٣٠ يوماً"],
                  ["done", "المنجزة"],
                  ["all", "الكل"],
                ] as [ItemFilter, string][]
              ).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`rounded-full px-3 py-1 text-xs transition ${filter === k ? "bg-[var(--brand)] text-white" : "border border-[var(--border)] text-[var(--muted)]"}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <input className="input w-56" placeholder="بحث في الالتزامات" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn btn-primary ms-auto" onClick={() => setShowAdd((v) => !v)}>
              + إضافة التزام
            </button>
          </div>

          {showAdd && (
            <AddItemForm
              onCancel={() => setShowAdd(false)}
              onSubmit={(input) => onAddItem(input).then(() => setShowAdd(false))}
            />
          )}

          <div className="space-y-3">
            {items.length === 0 && (
              <div className="card p-10 text-center text-sm text-[var(--muted)]">
                {org.items.length === 0 ? "لا التزامات مسجلة — أضف أول التزام من القائمة الجاهزة." : "لا بنود مطابقة لهذا التصفية."}
              </div>
            )}
            {items.map((item) => (
              <ItemCard key={item.id} item={item} onUpdate={(p) => onUpdateItem(item.id, p)} onRenew={() => onRenew(item.id)} onRemove={() => onRemoveItem(item.id)} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function ProfileForm({ org, onUpdate, onRemove }: { org: Org; onUpdate: (patch: Partial<Org>) => Promise<unknown>; onRemove: () => void }) {
  const [f, setF] = useState({
    name: org.name,
    crNumber: org.crNumber,
    city: org.city,
    contactName: org.contactName,
    contactPhone: org.contactPhone,
    contactEmail: org.contactEmail,
  });
  const [saved, setSaved] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setF({ ...f, [k]: e.target.value });
    setSaved(false);
  };
  return (
    <form
      className="card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        void onUpdate(f).then(() => setSaved(true));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="اسم المنشأة">
          <input className="input" value={f.name} onChange={set("name")} required minLength={2} />
        </Field>
        <Field label="السجل التجاري">
          <input className="input" dir="ltr" value={f.crNumber} onChange={set("crNumber")} />
        </Field>
        <Field label="المدينة">
          <input className="input" value={f.city} onChange={set("city")} />
        </Field>
        <Field label="مسؤول التواصل">
          <input className="input" value={f.contactName} onChange={set("contactName")} />
        </Field>
        <Field label="جوال المسؤول" hint="يُستخدم للتنبيهات إذا فعّلت «نسخة لمسؤول المنشأة» في التنبيهات">
          <input className="input" dir="ltr" value={f.contactPhone} onChange={set("contactPhone")} />
        </Field>
        <Field label="بريد المسؤول">
          <input className="input" dir="ltr" type="email" value={f.contactEmail} onChange={set("contactEmail")} />
        </Field>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button className="btn btn-primary">حفظ البيانات</button>
        {saved && <span className="text-sm text-[var(--ok)]">تم الحفظ</span>}
        <button type="button" className="btn btn-outline ms-auto hover:border-[var(--danger)] hover:text-[var(--danger)]" onClick={onRemove}>
          حذف المنشأة
        </button>
      </div>
    </form>
  );
}

function AddItemForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (input: { templateId: string; dueDate: string; note: string; reference: string }) => Promise<unknown> }) {
  const [templateId, setTemplateId] = useState(OBLIGATION_TEMPLATES[0].id);
  const [dueDate, setDueDate] = useState(addDaysISO(todayISO(), 30));
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const t = OBLIGATION_TEMPLATES.find((x) => x.id === templateId)!;
  return (
    <form
      className="card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit({ templateId, dueDate, note: note.trim(), reference: reference.trim() });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="نوع الالتزام">
          <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {OBLIGATION_TEMPLATES.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} — {x.authority}
              </option>
            ))}
          </select>
        </Field>
        <Field label="تاريخ الاستحقاق">
          <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </Field>
        <Field label="رقم المرجع (اختياري)">
          <input className="input" dir="ltr" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="رقم الرخصة / الشهادة" />
        </Field>
        <Field label="ملاحظة (اختياري)">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <p className="mt-3 text-xs leading-6 text-[var(--muted)]">
        دورة التجديد {fmtNum(t.cycleDays)} يوماً · التنبيه يبدأ قبل {fmtNum(t.leadDays)} يوماً · أثر التأخير: {t.lateImpact}
      </p>
      <div className="mt-4 flex gap-2">
        <button className="btn btn-primary">إضافة</button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          إلغاء
        </button>
      </div>
    </form>
  );
}

function ItemCard({ item, onUpdate, onRenew, onRemove }: { item: Item; onUpdate: (p: Partial<Item>) => Promise<unknown>; onRenew: () => Promise<unknown>; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const status = statusOf(item);
  const d = daysUntil(item.dueDate);
  const template = OBLIGATION_TEMPLATES.find((t) => t.id === item.templateId);
  const [edit, setEdit] = useState({
    dueDate: item.dueDate,
    cycleDays: item.cycleDays,
    leadDays: item.leadDays,
    estimatedCost: item.estimatedCost,
    reference: item.reference,
    note: item.note,
  });
  const dirty = JSON.stringify(edit) !== JSON.stringify({ dueDate: item.dueDate, cycleDays: item.cycleDays, leadDays: item.leadDays, estimatedCost: item.estimatedCost, reference: item.reference, note: item.note });

  return (
    <article className="card p-5" style={item.done ? { opacity: 0.65 } : undefined}>
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={status} label={item.done ? "منجز" : `${status} · ${relDue(d)}`} />
            <span className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: CATEGORY_COLORS[item.category], color: CATEGORY_COLORS[item.category] }}>
              {item.category}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold">{item.name}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {item.authority} · يستحق {fmtDate(item.dueDate)}
            {item.reference && (
              <>
                {" "}
                · مرجع <span dir="ltr">{item.reference}</span>
              </>
            )}
          </p>
          {item.note && <p className="mt-2 text-sm text-[var(--muted)]">{item.note}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
          <button className="btn btn-primary text-sm" onClick={() => void onRenew()}>
            جُدِّد — احسب التالي
          </button>
          <button className="btn btn-outline text-sm" onClick={() => void onUpdate({ done: !item.done })}>
            {item.done ? "إرجاع للمتابعة" : "تعليم كمنجز"}
          </button>
          <button className="btn btn-outline text-sm" onClick={() => setOpen((v) => !v)}>
            {open ? "إغلاق التفاصيل" : "التفاصيل والتعديل"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-5 border-t border-[var(--border)] pt-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="تاريخ الاستحقاق">
              <input className="input" type="date" value={edit.dueDate} onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })} />
            </Field>
            <Field label="دورة التجديد (أيام)">
              <input className="input" type="number" min={1} value={edit.cycleDays} onChange={(e) => setEdit({ ...edit, cycleDays: Number(e.target.value) })} />
            </Field>
            <Field label="التنبيه قبل (أيام)">
              <input className="input" type="number" min={1} value={edit.leadDays} onChange={(e) => setEdit({ ...edit, leadDays: Number(e.target.value) })} />
            </Field>
            <Field label="الغرامة/أثر التأخير التقديري (ريال)">
              <input className="input" type="number" min={0} value={edit.estimatedCost} onChange={(e) => setEdit({ ...edit, estimatedCost: Number(e.target.value) })} />
            </Field>
            <Field label="رقم المرجع">
              <input className="input" dir="ltr" value={edit.reference} onChange={(e) => setEdit({ ...edit, reference: e.target.value })} />
            </Field>
            <Field label="ملاحظة">
              <input className="input" value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
            </Field>
          </div>
          {template && (
            <p className="mt-4 rounded-lg bg-[var(--surface-2)] p-3 text-sm leading-6 text-[var(--muted)]">
              <b className="text-[var(--foreground)]">أثر التأخير: </b>
              {template.lateImpact}
            </p>
          )}
          <div className="mt-4">
            <div className="text-xs font-medium text-[var(--muted)]">سجل التجديدات</div>
            {item.renewals.length === 0 ? (
              <p className="mt-1 text-sm text-[var(--muted)]">لا تجديدات مسجلة بعد.</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm">
                {item.renewals.map((r) => (
                  <li key={r.id} className="text-[var(--muted)]">
                    {fmtDate(r.createdAt.slice(0, 10))}: من {fmtDate(r.previousDue)} إلى {fmtDate(r.newDue)}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-primary" disabled={!dirty} onClick={() => void onUpdate(edit)}>
              حفظ التعديلات
            </button>
            <button className="btn btn-outline ms-auto hover:border-[var(--danger)] hover:text-[var(--danger)]" onClick={onRemove}>
              حذف الالتزام
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
