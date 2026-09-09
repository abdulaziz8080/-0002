"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { WhatsappPanel } from "@/components/WhatsappPanel";
import { OverviewView } from "@/components/views/OverviewView";
import { OrgsView } from "@/components/views/OrgsView";
import { ReportsView } from "@/components/views/ReportsView";
import { SettingsView } from "@/components/views/SettingsView";
import { SupportView } from "@/components/views/SupportView";
import { api, getToken, setToken, PLAN_LABEL, type Office } from "@/lib/api";
import { useOrgs } from "@/lib/store";

const TABS = [
  ["overview", "نظرة عامة"],
  ["orgs", "المنشآت"],
  ["alerts", "التنبيهات"],
  ["reports", "التقارير"],
  ["settings", "الإعدادات"],
  ["support", "الدعم"],
] as const;

type Tab = (typeof TABS)[number][0];

function tabFromHash(): Tab {
  const h = typeof window === "undefined" ? "" : window.location.hash.replace("#", "");
  return TABS.some(([k]) => k === h) ? (h as Tab) : "overview";
}

export default function Dashboard() {
  const router = useRouter();
  const [office, setOffice] = useState<Office | null>(null);
  const [tab, setTabState] = useState<Tab>("overview");
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const data = useOrgs();

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    window.history.replaceState(null, "", `#${t}`);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setTabState(tabFromHash());
    api<{ office: Office }>("/auth/me")
      .then((r) => setOffice(r.office))
      .catch(() => router.replace("/login"));
  }, [router]);

  const logout = () => {
    setToken(null);
    router.replace("/login");
  };

  if (!office) {
    return <main className="grid min-h-screen place-items-center text-[var(--muted)]">جارٍ التحميل…</main>;
  }

  return (
    <main className="min-h-screen pb-20">
      <header className="no-print sticky top-0 z-20 border-b border-[var(--border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-5 py-3">
          <Logo href="/dashboard" />
          <span className="hidden text-sm text-[var(--muted)] sm:inline">
            {office.name}
            <span className="ms-2 rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[11px] text-[var(--brand-strong)]">
              باقة {PLAN_LABEL[office.plan]}
            </span>
          </span>
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
          {office.role === "admin" && (
            <Link href="/admin" className="rounded-full border border-[var(--brand)] px-3 py-1 text-xs font-semibold text-[var(--brand)]">
              لوحة الإدارة
            </Link>
          )}
          <button onClick={logout} className="text-sm text-[var(--muted)] hover:text-[var(--danger)]">
            خروج
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-7 print:max-w-none print:px-0 print:py-0">
        {data.error && <p className="mb-4 rounded-lg bg-[#fdecee] px-3 py-2 text-sm text-[var(--danger)]">{data.error}</p>}
        {!data.loaded ? (
          <p className="py-20 text-center text-[var(--muted)]">جارٍ التحميل…</p>
        ) : (
          <>
            {tab === "overview" && (
              <OverviewView
                orgs={data.orgs}
                onOpenOrg={(id) => {
                  setSelectedOrg(id);
                  setTab("orgs");
                }}
                onAddOrg={() => {
                  setOpenAdd(true);
                  setTab("orgs");
                }}
              />
            )}
            {tab === "orgs" && (
              <OrgsView data={data} selectedId={selectedOrg} onSelect={setSelectedOrg} openAdd={openAdd} onAddHandled={() => setOpenAdd(false)} />
            )}
            {tab === "alerts" && <WhatsappPanel office={office} onOfficeChange={setOffice} />}
            {tab === "reports" && <ReportsView orgs={data.orgs} office={office} />}
            {tab === "settings" && (
              <SettingsView office={office} onOfficeChange={setOffice} orgs={data.orgs} onSaveOrg={(id, input) => data.updateOrg(id, input)} onLogout={logout} />
            )}
            {tab === "support" && <SupportView office={office} />}
          </>
        )}
      </div>

      <footer className="no-print border-t border-[var(--border)] bg-white py-6 text-center text-xs text-[var(--muted)]">
        ملتزم أداة تنظيمية لمتابعة المواعيد، وليست جهة حكومية ولا تقدّم استشارة نظامية.
      </footer>
    </main>
  );
}
