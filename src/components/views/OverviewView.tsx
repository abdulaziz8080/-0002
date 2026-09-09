"use client";

import { useMemo, useState } from "react";
import type { Org } from "@/lib/api";
import { daysUntil, flatten, fmtCount, fmtDate, fmtMoney, fmtNum, orgSummary, relDue, summarize } from "@/lib/status";
import { Empty, Stat, StatusPill } from "@/components/ui";

type Filter = "all" | "risk" | "overdue" | "ok";
type Sort = "nearest" | "overdue" | "exposure" | "name";

export function OverviewView({ orgs, onOpenOrg, onAddOrg }: { orgs: Org[]; onOpenOrg: (id: string) => void; onAddOrg: () => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("nearest");

  const s = useMemo(() => summarize(orgs), [orgs]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = orgs.map(orgSummary);
    if (needle) {
      list = list.filter(({ org }) => [org.name, org.crNumber, org.city].some((v) => v.toLowerCase().includes(needle)));
    }
    if (filter === "risk") list = list.filter((r) => r.overdue + r.soon > 0);
    if (filter === "overdue") list = list.filter((r) => r.overdue > 0);
    if (filter === "ok") list = list.filter((r) => r.overdue + r.soon === 0);
    list.sort((a, b) => {
      if (sort === "name") return a.org.name.localeCompare(b.org.name, "ar");
      if (sort === "overdue") return b.overdue - a.overdue || (a.nearest ?? 1e9) - (b.nearest ?? 1e9);
      if (sort === "exposure") return b.exposure - a.exposure;
      return (a.nearest ?? 1e9) - (b.nearest ?? 1e9);
    });
    return list;
  }, [orgs, q, filter, sort]);

  const upcoming = useMemo(() => flatten(orgs).filter((f) => !f.item.done).slice(0, 8), [orgs]);

  if (orgs.length === 0) {
    return (
      <div className="space-y-6">
        <Empty title="ابدأ بإضافة أول منشأة" body="أدخل منشآت عملائك والتزاماتها، وستظهر هنا لوحة مجمّعة ترتّبها بالأقرب استحقاقاً وتوضح من هو المعرّض للخطر." />
        <div className="text-center">
          <button className="btn btn-primary" onClick={onAddOrg}>
            إضافة منشأة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="المنشآت" value={fmtNum(s.orgCount)} sub={s.atRiskOrgs ? `${fmtNum(s.atRiskOrgs)} معرّضة للخطر` : "كلها سليمة"} />
        <Stat label="إجمالي الالتزامات" value={fmtNum(s.total)} />
        <Stat label="متأخر الآن" value={fmtNum(s.overdue)} tone={s.overdue ? "danger" : undefined} />
        <Stat label="يستحق خلال ٣٠ يوماً" value={fmtNum(s.soon)} tone={s.soon ? "warn" : undefined} />
        <Stat label="التعرّض المالي التقديري" value={fmtMoney(s.exposure)} tone={s.exposure ? "danger" : "ok"} sub="غرامات تقديرية للمتأخر والقريب" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] p-4">
          <input className="input max-w-xs" placeholder="بحث باسم المنشأة أو السجل أو المدينة" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["all", "الكل"],
                ["risk", "معرّضة للخطر"],
                ["overdue", "متأخرة"],
                ["ok", "سليمة"],
              ] as [Filter, string][]
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
          <select className="input ms-auto w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="nearest">أقرب استحقاق</option>
            <option value="overdue">الأكثر تأخراً</option>
            <option value="exposure">الأعلى تعرّضاً</option>
            <option value="name">الاسم</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 text-start font-medium">المنشأة</th>
                <th className="px-4 py-3 text-start font-medium">الحالة</th>
                <th className="px-4 py-3 text-start font-medium">الالتزامات</th>
                <th className="px-4 py-3 text-start font-medium">متأخر</th>
                <th className="px-4 py-3 text-start font-medium">خلال ٣٠ يوماً</th>
                <th className="px-4 py-3 text-start font-medium">أقرب استحقاق</th>
                <th className="px-4 py-3 text-start font-medium">التعرّض</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.org.id} onClick={() => onOpenOrg(r.org.id)} className="cursor-pointer border-t border-[var(--border)] hover:bg-[var(--surface-2)]">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{r.org.name}</div>
                    <div className="text-xs text-[var(--muted)]">{[r.org.city, r.org.crNumber && `سجل ${r.org.crNumber}`].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={r.worst} label={r.total === 0 ? "بلا التزامات" : r.worst === "منجز" ? "منجز بالكامل" : undefined} />
                  </td>
                  <td className="px-4 py-3">{fmtCount(r.total)}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: r.overdue ? "var(--danger)" : undefined }}>{fmtNum(r.overdue)}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: r.soon ? "var(--warn)" : undefined }}>{fmtNum(r.soon)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.nearest === null ? "—" : relDue(r.nearest)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.exposure ? fmtMoney(r.exposure) : "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[var(--muted)]">
                    لا نتائج مطابقة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-bold">أقرب الاستحقاقات</h2>
        <ul className="mt-3 divide-y divide-[var(--border)]">
          {upcoming.map(({ org, item, status }) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
              <StatusPill status={status} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-[var(--muted)]">
                  {org.name} · {item.authority}
                </div>
              </div>
              <div className="text-end text-sm">
                <div className="font-medium">{relDue(daysUntil(item.dueDate))}</div>
                <div className="text-xs text-[var(--muted)]">{fmtDate(item.dueDate)}</div>
              </div>
              <button className="btn btn-outline" onClick={() => onOpenOrg(org.id)}>
                فتح
              </button>
            </li>
          ))}
          {upcoming.length === 0 && <li className="py-6 text-center text-sm text-[var(--muted)]">لا توجد التزامات قائمة</li>}
        </ul>
      </div>
    </div>
  );
}
