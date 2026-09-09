import Image from "next/image";
import Link from "next/link";

/** أيقونة ملتزم: ساعة بعلامة صح — الشعار الرسمي */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <Image
      src="/logo-mark.png"
      alt=""
      width={size}
      height={size}
      priority
      aria-hidden="true"
    />
  );
}

/** الشعار الكامل (الأيقونة + كلمة ملتزم) */
export function Logo({
  href = "/",
  size = 44,
}: {
  href?: string;
  size?: number;
}) {
  return (
    <Link href={href} className="flex items-center" aria-label="ملتزم — الصفحة الرئيسية">
      <Image
        src="/logo.png"
        alt="ملتزم"
        width={Math.round(size * 1.26)}
        height={size}
        priority
      />
    </Link>
  );
}
