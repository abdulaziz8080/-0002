"use client";

import { useEffect, useState } from "react";
import type { Org } from "@/lib/api";

type Row = { alertPhones: string; notifyEnabled: boolean };

export function OrgsWhatsappSettings({
  orgs,
  onSave,
}: {
  orgs: Org[];
  onSave: (orgId: string, input: Row) => Promise<void>;
}) {
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setRows(
      Object.fromEntries(
        orgs.map((o) => [
          o.id,
          { alertPhones: o.alertPhones, notifyEnabled: o.notifyEnabled },
        ]),
      ),
    );
  }, [orgs]);

  async function save(orgId: string) {
    const row = rows[orgId];
    if (!row) return;
    setSaving(orgId);
    setErr(null);
    try {
      await onSave(orgId, row);
      setSaved(orgId);
      setTimeout(() => setSaved((v) => (v === orgId ? null : v)), 2000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="card p-6 lg:col-span-2">
      <h2 className="text-lg font-semibold">واتساب المنشآت</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        أرقام واتساب كل منشأة التي تستقبل تذكيراتها الخاصة (تُرسل من واتساب
        المكتب). فعّل أو أوقف التذكيرات لكل منشأة.
      </p>
      {err && (
        <p className="mt-3 rounded-lg bg-[#fdecee] px-3 py-2 text-sm text-[var(--danger)]">
          {err}
        </p>
      )}
      {orgs.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          لا توجد منشآت بعد — أضفها من تبويب «المنشآت والالتزامات».
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-right text-xs text-[var(--muted)]">
              <tr>
                <th className="py-2">المنشأة</th>
                <th>أرقام واتساب المنشأة (افصل بفاصلة)</th>
                <th>التذكيرات</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => {
                const row = rows[o.id] ?? {
                  alertPhones: o.alertPhones,
                  notifyEnabled: o.notifyEnabled,
                };
                const dirty =
                  row.alertPhones !== o.alertPhones ||
                  row.notifyEnabled !== o.notifyEnabled;
                return (
                  <tr key={o.id} className="border-t border-[var(--border)]">
                    <td className="py-3 pe-3 font-medium">
                      {o.name}
                      {o.contactPhone && (
                        <div className="text-xs text-[var(--muted)]" dir="ltr">
                          {o.contactPhone}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pe-3">
                      <input
                        className="input w-full min-w-56"
                        dir="ltr"
                        placeholder="05XXXXXXXX, 05YYYYYYYY"
                        value={row.alertPhones}
                        onChange={(e) =>
                          setRows((r) => ({
                            ...r,
                            [o.id]: { ...row, alertPhones: e.target.value },
                          }))
                        }
                      />
                    </td>
                    <td className="py-3 pe-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={row.notifyEnabled}
                          onChange={(e) =>
                            setRows((r) => ({
                              ...r,
                              [o.id]: {
                                ...row,
                                notifyEnabled: e.target.checked,
                              },
                            }))
                          }
                        />
                        {row.notifyEnabled ? "مفعّلة" : "متوقفة"}
                      </label>
                    </td>
                    <td className="py-3">
                      <button
                        className="btn btn-primary text-sm"
                        disabled={!dirty || saving === o.id}
                        onClick={() => void save(o.id)}
                      >
                        {saving === o.id
                          ? "…"
                          : saved === o.id
                            ? "تم الحفظ"
                            : "حفظ"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
