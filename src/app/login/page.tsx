"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { api, getToken, setToken, type Office } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body =
        mode === "login" ? { email, password } : { name, email, password, alertPhone: phone };
      const res = await api<{ token: string; office: Office }>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setToken(res.token);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="glow grid min-h-screen place-items-center px-6 py-12">
      <div className="card w-full max-w-md p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <LogoMark size={64} />
          <h1 className="text-2xl font-bold">ملتزم</h1>
          <p className="text-sm text-[var(--muted)]">
            {mode === "login" ? "سجّل دخول مكتبك للوحة التحكم" : "أنشئ حساب مكتبك — مجاناً"}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-xl bg-[var(--surface-2)] p-1 text-sm">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="rounded-lg py-2 font-semibold transition"
              style={
                mode === m
                  ? { background: "var(--surface)", boxShadow: "0 1px 2px rgba(0,0,0,.06)" }
                  : { color: "var(--muted)" }
              }
            >
              {m === "login" ? "تسجيل الدخول" : "حساب جديد"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "register" && (
            <Field label="اسم المكتب">
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مكتب الرواد للمحاسبة"
                required
              />
            </Field>
          )}
          <Field label="البريد الإلكتروني">
            <input
              className="input"
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="office@example.com"
              required
            />
          </Field>
          <Field label="كلمة المرور">
            <input
              className="input"
              type="password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </Field>
          {mode === "register" && (
            <Field label="رقم واتساب المكتب لاستقبال التنبيهات (اختياري)">
              <input
                className="input"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05XXXXXXXX"
              />
            </Field>
          )}
          {error && (
            <p className="rounded-lg bg-[#fdecee] px-3 py-2 text-sm text-[var(--danger)]">{error}</p>
          )}
          <button className="btn btn-primary w-full py-3" disabled={busy}>
            {busy ? "لحظة…" : mode === "login" ? "دخول" : "إنشاء الحساب"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}
