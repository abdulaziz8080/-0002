export function milestoneLabel(m: string) {
  if (m.startsWith("test")) return "اختبار";
  if (m.startsWith("manual")) return "إرسال يدوي";
  if (m === "d30") return "قبل ٣٠ يوم";
  if (m === "d14") return "قبل ١٤ يوم";
  if (m === "d7") return "قبل ٧ أيام";
  if (m === "d0") return "يوم الاستحقاق";
  if (m === "lead") return "بداية فترة التنبيه";
  if (m.startsWith("overdue:")) return "متأخر";
  return m;
}
