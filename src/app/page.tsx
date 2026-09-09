import Link from "next/link";
import { Logo, LogoMark } from "@/components/Logo";
import { SupportContact } from "@/components/SupportContact";
import { OBLIGATION_TEMPLATES } from "@/lib/obligations";

const PAINS = [
  {
    title: "الرخصة انتهت وأنت ما تدري",
    body: "ما فيه جهة ترسل لك تذكير موحد. تكتشف الانتهاء يوم تحتاج الرخصة — وقتها الغرامة صارت واقع.",
  },
  {
    title: "كل جهة لها بوابة",
    body: "التجارة، بلدي، الزكاة، قوى، التأمينات، الجوازات، الدفاع المدني. سبع بوابات، سبع كلمات مرور، صفر تقويم موحد.",
  },
  {
    title: "المُعقِّب ينسى — أو يستقيل",
    body: "أنت تدفع راتب لشخص يتذكر عنك. وإذا نسي أو مشى، المعرفة تمشي معه.",
  },
];

const FEATURES = [
  {
    title: "تقويم موحد لكل التزاماتك",
    body: "كل رخصة وشهادة وإقرار في شاشة واحدة، مرتبة بالأقرب استحقاقاً، بألوان تقول لك وين الخطر.",
  },
  {
    title: "تنبيه قبل الاستحقاق بوقت كافٍ",
    body: "لكل التزام مهلة تنبيه مختلفة — رخصة بلدي تُجدَّد قبل 90 يوماً، والإقرار الضريبي قبل 15. ملتزم يعرف الفرق.",
  },
  {
    title: "عدّاد المخاطر بالريال",
    body: "ما نقول لك «عندك 3 تنبيهات». نقول لك: «معرّض لـ 11,000 ريال غرامات خلال 30 يوم». الرقم اللي يحرّك.",
  },
  {
    title: "تجديد بضغطة",
    body: "بعد ما تجدّد، اضغط زر واحد ويحسب لك الاستحقاق القادم حسب دورة كل جهة تلقائياً.",
  },
  {
    title: "فروع ومنشآت متعددة",
    body: "سجل تجاري واحد أو عشرة فروع — كل منشأة بملفها، وتقرير مجمّع لكلها.",
  },
  {
    title: "بدون ربط حكومي ولا صلاحيات",
    body: "ما نطلب دخولك على أبشر ولا قوى. أنت تدخل التواريخ مرة وحدة، وإحنا نتابعها معك للأبد.",
  },
];

const PLANS = [
  {
    name: "منشأة واحدة",
    price: "99",
    tag: "للمؤسسات الفردية",
    features: ["منشأة واحدة", "التزامات غير محدودة", "تنبيهات بريد + واتساب", "تقرير شهري"],
    highlight: false,
  },
  {
    name: "متعدد الفروع",
    price: "299",
    tag: "الأكثر طلباً",
    features: [
      "حتى 10 منشآت/فروع",
      "3 مستخدمين",
      "عدّاد المخاطر المالية",
      "تصدير التقارير PDF",
      "أرشيف المستندات",
    ],
    highlight: true,
  },
  {
    name: "مكاتب المحاسبة",
    price: "تواصل معنا",
    tag: "لمن يدير عملاء",
    features: [
      "منشآت غير محدودة",
      "لوحة عملاء موحدة",
      "تنبيهات باسم مكتبك",
      "مدير حساب مخصص",
    ],
    highlight: false,
  },
];

const STEPS = [
  { n: "١", title: "سجّل مكتبك", body: "حساب واحد للمكتب، تسجيل في أقل من دقيقة، بدون بطاقة ولا ربط حكومي." },
  { n: "٢", title: "أضف منشآت عملائك والتزاماتها", body: "اختر الالتزام من القائمة الجاهزة وحدد تاريخ الاستحقاق — يحسب ملتزم دورة التجديد ومهلة التنبيه تلقائياً." },
  { n: "٣", title: "اربط واتساب المكتب", body: "امسح رمز QR مرة واحدة، وحدد لكل منشأة الأرقام التي تصلها تذكيراتها." },
  { n: "٤", title: "استلم التذكير قبل الموعد", body: "كل صباح يفحص ملتزم الالتزامات ويرسل تذكيراً من رقم مكتبك قبل الاستحقاق بـ ٣٠ و١٤ و٧ أيام ويوم الاستحقاق — دون أن تفتح الموقع." },
];

export default function Home() {
  return (
    <main className="min-h-screen glow">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-[var(--muted)] md:flex">
          <a href="#about" className="hover:text-[var(--foreground)]">
            من نحن
          </a>
          <a href="#problem" className="hover:text-[var(--foreground)]">
            المشكلة
          </a>
          <a href="#features" className="hover:text-[var(--foreground)]">
            المميزات
          </a>
          <a href="#coverage" className="hover:text-[var(--foreground)]">
            ماذا نتابع
          </a>
          <a href="#pricing" className="hover:text-[var(--foreground)]">
            الأسعار
          </a>
        </nav>
        <Link
          href="/login"
          className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-strong)]"
        >
          دخول المكاتب
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-12 pb-20 text-center">
        <span className="inline-block rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-xs text-[var(--muted)]">
          مبني لمكاتب المحاسبة والتعقيب في السعودية
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-[1.25] md:text-6xl md:leading-[1.2]">
          لا تدفع غرامة تأخير
          <span className="text-[var(--brand)]"> مرة ثانية</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
          منشأتك عندها أكثر من ١٢ التزاماً يتجدد كل سنة — السجل التجاري، رخصة بلدي، الشهادة
          الزكوية، الإقرار الضريبي، السعودة، التأمينات، رخص العمل والإقامات. ولا جهة منها
          تذكّرك. ملتزم يتابعها كلها وينبّهك قبل ما تصير غرامة.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-[var(--brand)] px-7 py-3.5 font-semibold text-[var(--on-brand)] transition hover:bg-[var(--brand-strong)]"
          >
            ابدأ مجاناً — سجّل مكتبك
          </Link>
          <a
            href="#pricing"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-7 py-3.5 font-semibold transition hover:border-[var(--brand)]"
          >
            شوف الأسعار
          </a>
        </div>
        <p className="mt-4 text-sm text-[var(--muted)]">
          بدون بطاقة ائتمانية · بدون ربط بحسابك الحكومي
        </p>
      </section>

      <section id="about" className="mx-auto max-w-6xl px-6 pb-20">
        <div className="card grid gap-8 p-8 md:grid-cols-[auto_1fr] md:p-10">
          <LogoMark size={96} />
          <div>
            <h2 className="text-3xl font-bold">من نحن؟</h2>
            <p className="mt-4 text-lg leading-8 text-[var(--muted)]">
              <b className="text-[var(--foreground)]">ملتزم</b> منصة سعودية لمتابعة الالتزامات النظامية، صُمّمت لمكاتب
              المحاسبة والتعقيب ومكاتب الخدمات التي تدير ملفات عدة منشآت. نجمع كل تجديد ورخصة
              وإقرار لكل عميل في لوحة واحدة، ونرسل التذكير تلقائياً من رقم واتساب مكتبك قبل
              الاستحقاق بوقت كافٍ — فلا يضيع موعد، ولا يدفع عميلك غرامة كان يمكن تجنّبها.
            </p>
            <p className="mt-3 leading-8 text-[var(--muted)]">
              رسالتنا بسيطة: أن يقضي المكتب وقته في خدمة عملائه لا في تتبّع التواريخ. ملتزم
              أداة تنظيمية مستقلة، لا نطلب صلاحيات على حساباتك الحكومية، وبياناتك ملكك تصدّرها
              في أي وقت.
            </p>
          </div>
        </div>
        <h3 className="mt-14 text-center text-2xl font-bold">كيف يعمل ملتزم؟</h3>
        <div className="mt-8 grid gap-5 md:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="card p-6">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--brand)] text-lg font-bold text-[var(--on-brand)]">
                {s.n}
              </div>
              <h4 className="mt-4 font-semibold">{s.title}</h4>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="problem" className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-center text-3xl font-bold">ليش تصير الغرامة أصلاً؟</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PAINS.map((p) => (
            <div key={p.title} className="card p-7">
              <h3 className="text-lg font-semibold text-[var(--danger)]">{p.title}</h3>
              <p className="mt-3 leading-7 text-[var(--muted)]">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="card mt-6 p-7 text-center">
          <p className="text-lg leading-8">
            مخالفة واحدة في الفوترة الإلكترونية تبدأ من{" "}
            <b className="text-[var(--warn)]">٥,٠٠٠ ريال</b> وتصل إلى{" "}
            <b className="text-[var(--warn)]">٥٠,٠٠٠ ريال</b>. اشتراك ملتزم السنوي أقل من ربع
            أرخص مخالفة.
          </p>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-center text-3xl font-bold">وش يسوي ملتزم؟</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-7">
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-3 leading-7 text-[var(--muted)]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="coverage" className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-center text-3xl font-bold">الالتزامات المغطاة</h2>
        <p className="mt-3 text-center text-[var(--muted)]">
          {OBLIGATION_TEMPLATES.length} التزاماً جاهزاً بدورة تجديد ومهلة تنبيه لكل واحد
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-2.5">
          {OBLIGATION_TEMPLATES.map((t) => (
            <span
              key={t.id}
              className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--muted)]"
            >
              {t.name}
            </span>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-center text-3xl font-bold">الأسعار</h2>
        <p className="mt-3 text-center text-[var(--muted)]">
          شهرياً، وتقدر تلغي في أي وقت. الأسعار لا تشمل ضريبة القيمة المضافة.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className="card p-7"
              style={
                p.highlight
                  ? { borderColor: "var(--brand)", background: "var(--surface-2)" }
                  : undefined
              }
            >
              <div className="text-sm text-[var(--brand)]">{p.tag}</div>
              <h3 className="mt-2 text-xl font-semibold">{p.name}</h3>
              <div className="mt-4 text-3xl font-bold">
                {p.price}
                {p.price !== "تواصل معنا" && (
                  <span className="text-base font-normal text-[var(--muted)]"> ريال / شهر</span>
                )}
              </div>
              <ul className="mt-6 space-y-2.5 text-[var(--muted)]">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="mt-7 block rounded-xl border border-[var(--border)] py-3 text-center font-semibold transition hover:border-[var(--brand)]"
                style={
                  p.highlight
                    ? { background: "var(--brand)", color: "var(--on-brand)", borderColor: "var(--brand)" }
                    : undefined
                }
              >
                ابدأ الآن
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--border)] px-6 py-10 text-center text-sm text-[var(--muted)]">
        <SupportContact />
        <p>ملتزم — أداة تنظيمية لمتابعة مواعيد التزامات المنشأة.</p>
        <p className="mt-2">
          المعلومات المعروضة إرشادية ولا تُغني عن مراجعة الجهة المختصة أو المستشار النظامي.
        </p>
      </footer>
    </main>
  );
}
