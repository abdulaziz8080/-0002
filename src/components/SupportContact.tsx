"use client";

import { useEffect, useState } from "react";
import { api, type SiteContact } from "@/lib/api";

/** أرقام خدمة العملاء في الصفحة الرئيسية — يحرّرها المدير من لوحة الإدارة */
export function SupportContact({ intro }: { intro?: string }) {
  const [c, setC] = useState<SiteContact | null>(null);
  useEffect(() => {
    api<SiteContact>("/support/contact").then(setC).catch(() => {});
  }, []);
  if (!c || (!c.supportPhone && !c.supportWhatsapp && !c.supportEmail)) return null;
  const wa = c.supportWhatsapp.replace(/\D/g, "");
  return (
    <>
    {intro && <p className="mb-2">{intro}</p>}
    <div id="contact" className="mx-auto mb-6 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[var(--foreground)]">
      <span className="font-semibold">خدمة العملاء:</span>
      {c.supportPhone && <a dir="ltr" href={`tel:${c.supportPhone}`} className="hover:text-[var(--brand)]">{c.supportPhone}</a>}
      {c.supportWhatsapp && (
        <a dir="ltr" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="hover:text-[var(--brand)]">واتساب {c.supportWhatsapp}</a>
      )}
      {c.supportEmail && <a dir="ltr" href={`mailto:${c.supportEmail}`} className="hover:text-[var(--brand)]">{c.supportEmail}</a>}
      {c.supportHours && <span className="text-[var(--muted)]">{c.supportHours}</span>}
    </div>
    </>
  );
}
