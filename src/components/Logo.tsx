import Link from "next/link";

/** شعار ملتزم: علامة صح داخل معيّن مدوّر — مشتق من هوية المشروع */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="22"
        y="22"
        width="56"
        height="56"
        rx="14"
        transform="rotate(45 50 50)"
        stroke="var(--brand)"
        strokeWidth="7"
      />
      <path
        d="M31 53 L46 66 L72 34"
        stroke="var(--brand)"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ href = "/", size = 36 }: { href?: string; size?: number }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="text-lg font-bold tracking-tight">ملتزم</span>
    </Link>
  );
}
