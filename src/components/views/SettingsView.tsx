"use client";

import { useRef, useState } from "react";
import { api, type Office, type Org } from "@/lib/api";
import { downloadFile, todayISO } from "@/lib/status";
import { Field } from "@/components/ui";
import { OrgsWhatsappSettings } from "@/components/OrgsWhatsappSettings";

export function SettingsView({
  office,
  onOfficeChange,
  orgs,
  onSaveOrg,
  onLogout,
}: {
  office: Office;
  onOfficeChange: (o: Office) => void;
  orgs: Org[];
  onSaveOrg: (orgId: string, input: { alertPhones: string; notifyEnabled: boolean }) => Promise<void>;
  onLogout: () => void;
}) {
  const [f, setF] = useState({ name: office.name, contactPhone: office.contactPhone, contactEmail: office.contactEmail });
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.next !== pw.confirm) return setMsg({ tone: "err", text: "تأكيد كلمة المرور غير مطابق." });
    try {
      await api("/auth/password", { method: "POST", body: JSON.stringify({ current: pw.current, next: pw.next }) });
      setPw({ current: "", next: "", confirm: "" });
      setMsg({ tone: "ok", text: "تم تغيير كلمة المرور." });
    } catch (e) {
      setMsg({ tone: "err", text: e instanceof Error ? e.message : "حدث خطأ" });
    }
  }

  async function patch(data: Partial<Pick<Office, "name" | "contactPhone" | "contactEmail" | "logoDataUrl">>, okText: string) {
    try {
      const r = await api<{ office: Office }>("/auth/me", { method: "PATCH", body: JSON.stringify(data) });
      onOfficeChange(r.office);
      setMsg({ tone: "ok", text: okText });
    } catch (e) {
      setMsg({ tone: "err", text: e instanceof Error ? e.message : "حدث خطأ" });
    }
  }

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMsg({ tone: "err", text: "اختر ملف صورة (PNG أو JPG أو WebP)." });
    if (file.size > 8e6) return setMsg({ tone: "err", text: "الصورة أكبر من اللازم — اختر ملفاً أقل من ٨ ميجابايت." });
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          const scale = Math.min(1, 320 / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(img.width * scale));
          c.height = Math.max(1, Math.round(img.height * scale));
          const ctx = c.getContext("2d");
          if (!ctx) return reject(new Error("canvas"));
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/png"));
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("image"));
        };
        img.src = url;
      });
      await patch({ logoDataUrl: dataUrl }, "تم تحديث الشعار — سيظهر في رأس التقارير.");
    } catch {
      setMsg({ tone: "err", text: "تعذّر قراءة الصورة — جرّب ملف PNG أو JPG." });
    }
  }

  return (
    <div className="space-y-6">
      {msg && (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ background: msg.tone === "ok" ? "var(--brand-soft)" : "#fdecee", color: msg.tone === "ok" ? "var(--brand)" : "var(--danger)" }}>
          {msg.text}
        </p>
      )}

      <form
        className="card p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void patch(f, "تم حفظ بيانات المكتب.");
        }}
      >
        <h2 className="text-lg font-semibold">بيانات المكتب</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">تظهر في رأس التقارير التي ترسلها لعملائك.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="اسم المكتب">
            <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required minLength={2} />
          </Field>
          <Field label="بريد التواصل">
            <input className="input" dir="ltr" value={f.contactEmail} onChange={(e) => setF({ ...f, contactEmail: e.target.value })} />
          </Field>
          <Field label="جوال المكتب">
            <input className="input" dir="ltr" placeholder="05xxxxxxxx" value={f.contactPhone} onChange={(e) => setF({ ...f, contactPhone: e.target.value })} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {office.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={office.logoDataUrl} alt="شعار المكتب" className="h-14 w-14 rounded-[10px] border border-[var(--border)] object-contain" />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-[10px] bg-[var(--surface-2)] text-xs text-[var(--muted)]">لا شعار</div>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onLogo} />
          <button type="button" className="btn btn-outline" onClick={() => fileRef.current?.click()}>
            رفع شعار المكتب
          </button>
          {office.logoDataUrl && (
            <button type="button" className="btn btn-outline text-[var(--danger)]" onClick={() => void patch({ logoDataUrl: null }, "تمت إزالة الشعار.")}>
              إزالة
            </button>
          )}
          <button className="btn btn-primary ms-auto">حفظ</button>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          بريد الدخول: <span dir="ltr">{office.email}</span>
        </p>
      </form>

      <form className="card p-6" onSubmit={changePassword}>
        <h2 className="text-lg font-semibold">كلمة المرور</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">٨ أحرف على الأقل. بعد التغيير تبقى جلستك الحالية مفتوحة.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="الحالية">
            <input className="input" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
          </Field>
          <Field label="الجديدة">
            <input className="input" type="password" autoComplete="new-password" minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required />
          </Field>
          <Field label="تأكيد الجديدة">
            <input className="input" type="password" autoComplete="new-password" minLength={8} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required />
          </Field>
        </div>
        <div className="mt-4 flex">
          <button className="btn btn-outline ms-auto">تغيير كلمة المرور</button>
        </div>
      </form>

      <section className="card p-6">
        <h2 className="text-lg font-semibold">واتساب المنشآت</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          لكل منشأة أرقامها الخاصة التي تصلها تذكيراتها، مع إمكانية إيقاف التنبيه لمنشأة بعينها. ربط جلسة واتساب المكتب وإعدادات التذكير العامة من تبويب «التنبيهات».
        </p>
        <div className="mt-4">
          <OrgsWhatsappSettings orgs={orgs} onSave={onSaveOrg} />
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold">البيانات</h2>
        <p className="mt-1 text-sm leading-7 text-[var(--muted)]">بيانات عملائك ملكك — صدّرها كاملة في أي وقت.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => downloadFile(`multazim-backup-${todayISO()}.json`, JSON.stringify({ version: 3, office, orgs }, null, 2), "application/json")}>
            تصدير نسخة احتياطية (JSON)
          </button>
          <button className="btn btn-outline ms-auto" onClick={onLogout}>
            تسجيل الخروج
          </button>
        </div>
      </section>
    </div>
  );
}
