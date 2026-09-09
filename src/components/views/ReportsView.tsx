"use client";

import { useMemo, useState } from "react";
import type { Office, Org } from "@/lib/api";
import { csvCell, daysUntil, downloadFile, flatten, fmtDate, fmtDays, fmtMoney, fmtNum, statusOf, summarize, todayISO, STATUS_STYLE } from "@/lib/status";
import { Field } from "@/components/ui";

export function ReportsView({ orgs, office }: { orgs: Org[]; office: Office }) {
  const [scope, setScope] = useState("all");
  const [includeDone, setIncludeDone] = useState(false);

  const scoped = useMemo(() => (scope === "all" ? orgs : orgs.filter((o) => o.id === scope)), [orgs, scope]);
  const rows = useMemo(() => flatten(scoped).filter((f) => includeDone || !f.item.done), [scoped, includeDone]);
  const s = useMemo(() => summarize(scoped), [scoped]);
  const grouped = useMemo(() => {
    const m = new Map<string, { org: Org; items: typeof rows }>();
    for (const r of rows) {
      const g = m.get(r.org.id) ?? { org: r.org, items: [] };
      g.items.push(r);
      m.set(r.org.id, g);
    }
    return [...m.values()];
  }, [rows]);

  const exportCsv = () => {
    const head = ["المنشأة", "السجل التجاري", "المدينة", "الالتزام", "الجهة", "التصنيف", "تاريخ الاستحقاق", "الأيام المتبقية", "الحالة", "الغرامة التقديرية", "رقم المرجع", "ملاحظة", "عدد التجديدات"];
    const body = flatten(scoped).map(({ org, item }) => [
      org.name,
      org.crNumber,
      org.city,
      item.name,
      item.authority,
      item.category,
      item.dueDate,
      daysUntil(item.dueDate),
      statusOf(item),
      item.estimatedCost,
      item.reference,
      item.note,
      item.renewals.length,
    ]);
    downloadFile(`multazim-${todayISO()}.csv`, [head, ...body].map((r) => r.map(csvCell).join(",")).join("\n"), "text/csv");
  };

  const contact = [office.contactPhone, office.contactEmail].filter(Boolean).join("  ·  ");

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-end gap-3 p-5 no-print">
        <Field label="نطاق التقرير">
          <select className="input w-64" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">كل المنشآت ({fmtNum(orgs.length)})</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 pb-2.5 text-sm">
          <input type="checkbox" checked={includeDone} onChange={(e) => setIncludeDone(e.target.checked)} />
          تضمين البنود المنجزة
        </label>
        <div className="ms-auto flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => window.print()}>
            طباعة / حفظ PDF
          </button>
          <button className="btn btn-outline" onClick={exportCsv}>
            تصدير Excel/CSV
          </button>
        </div>
        <p className="w-full text-xs text-[var(--muted)]">«طباعة / حفظ PDF» تفتح نافذة الطباعة — اختر «حفظ كـ PDF» لإرسال التقرير لعميلك بشعار مكتبك. الشعار وبيانات التواصل تُضبط من الإعدادات.</p>
      </div>

      <div className="card overflow-hidden print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-[var(--brand)] px-8 py-6 print:px-0">
          <div className="flex items-center gap-3.5">
            {office.logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={office.logoDataUrl} alt="" className="h-14 w-14 rounded-[10px] object-contain" />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-[10px] bg-[var(--brand)] text-lg font-bold text-white">{office.name.trim().charAt(0) || "م"}</div>
            )}
            <div>
              <div className="text-lg font-bold leading-tight">{office.name}</div>
              {contact && (
                <div className="mt-1 text-xs text-[var(--muted)]" dir="ltr">
                  {contact}
                </div>
              )}
            </div>
          </div>
          <div className="text-end">
            <div className="text-base font-bold">{scope === "all" ? "تقرير الالتزامات النظامية — كل المنشآت" : "تقرير الالتزامات النظامية"}</div>
            {scope !== "all" && <div className="mt-0.5 text-sm">{scoped[0]?.name}</div>}
            <div className="mt-1 text-xs text-[var(--muted)]">صدر في {fmtDate(todayISO())}</div>
          </div>
        </header>

        <div className="grid grid-cols-2 divide-x divide-x-reverse divide-[var(--border)] border-b border-[var(--border)] sm:grid-cols-4">
          {(
            [
              ["المنشآت", fmtNum(s.orgCount), ""],
              ["بنود التقرير", fmtNum(rows.length), ""],
              ["متأخر الآن", fmtNum(s.overdue), s.overdue ? "text-[var(--danger)]" : ""],
              ["التعرّض التقديري", fmtMoney(s.exposure), ""],
            ] as [string, string, string][]
          ).map(([l, v, c]) => (
            <div key={l} className="px-6 py-4 print:px-3">
              <div className="text-xs text-[var(--muted)]">{l}</div>
              <div className={`mt-1 text-lg font-bold ${c}`}>{v}</div>
            </div>
          ))}
        </div>

        <div className="px-8 py-6 print:px-0">
          {grouped.map(({ org, items }) => (
            <section key={org.id} className="mb-7 last:mb-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[var(--border)] pb-2">
                <h3 className="text-sm font-bold">{org.name}</h3>
                <span className="text-xs text-[var(--muted)]">{[org.city, org.crNumber && `سجل ${org.crNumber}`, org.contactName].filter(Boolean).join("  ·  ")}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-[var(--muted)]">
                      {["الالتزام", "الجهة المختصة", "تاريخ الاستحقاق", "المتبقي", "الحالة", "أثر التأخير", "آخر تجديد"].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-start font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(({ item, status }) => {
                      const d = daysUntil(item.dueDate);
                      const last = item.renewals[0];
                      return (
                        <tr key={item.id} className="border-t border-[var(--border)] align-top">
                          <td className="px-3 py-2.5 font-medium">{item.name}</td>
                          <td className="px-3 py-2.5 text-xs text-[var(--muted)]">{item.authority}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(item.dueDate)}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">{item.done ? "منجز" : d < 0 ? `متأخر ${fmtDays(Math.abs(d))}` : fmtDays(d)}</td>
                          <td className="px-3 py-2.5 font-medium" style={{ color: STATUS_STYLE[status].text }}>
                            {status}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-xs">{item.estimatedCost > 0 ? fmtMoney(item.estimatedCost) : "—"}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-xs text-[var(--muted)]">{last ? fmtDate(last.createdAt.slice(0, 10)) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
          {grouped.length === 0 && <p className="py-10 text-center text-[var(--muted)]">لا توجد بنود في هذا النطاق</p>}
          <p className="mt-8 border-t border-[var(--border)] pt-4 text-xs leading-6 text-[var(--muted)]">
            صادر عن {office.name} باستخدام منصة ملتزم. هذا التقرير أداة تنظيمية لمتابعة المواعيد، وليس استشارة نظامية أو محاسبية، ولا يصدر عن جهة حكومية. التواريخ والمبالغ مُدخلة من المكتب وتقديرية، والمرجع النهائي هو البوابة الرسمية لكل جهة.
          </p>
        </div>
      </div>
    </div>
  );
}
