export type ObligationCategory =
  | "تراخيص"
  | "زكاة وضرائب"
  | "عمالة"
  | "تأمينات"
  | "سلامة"
  | "أخرى";

export type ObligationTemplate = {
  id: string;
  name: string;
  authority: string;
  category: ObligationCategory;
  /** دورة التجديد الافتراضية بالأيام */
  cycleDays: number;
  /** كم يوم قبل الاستحقاق يبدأ التنبيه */
  leadDays: number;
  /** أثر التأخير كما تنص عليه الجهة — نص إرشادي وليس فتوى نظامية */
  lateImpact: string;
  /** تقدير تحفظي لكلفة التأخير بالريال، يُستخدم لحساب المخاطر فقط */
  estimatedCost: number;
  perEmployee?: boolean;
};

export const OBLIGATION_TEMPLATES: ObligationTemplate[] = [
  {
    id: "cr",
    name: "السجل التجاري",
    authority: "وزارة التجارة",
    category: "تراخيص",
    cycleDays: 365,
    leadDays: 60,
    lateImpact:
      "إيقاف الخدمات المرتبطة بالسجل وتعذّر تجديد رخصة بلدي، مع مقابل مالي على التأخير.",
    estimatedCost: 1000,
  },
  {
    id: "balady",
    name: "الرخصة التجارية (بلدي)",
    authority: "وزارة البلديات والإسكان",
    category: "تراخيص",
    cycleDays: 365,
    leadDays: 90,
    lateImpact:
      "غرامة تأخير بلدية، ويشترط سداد المستحقات المتأخرة قبل التجديد أو التعديل أو الإلغاء.",
    estimatedCost: 5000,
  },
  {
    id: "zakat-cert",
    name: "الشهادة الزكوية / شهادة الالتزام",
    authority: "هيئة الزكاة والضريبة والجمارك",
    category: "زكاة وضرائب",
    cycleDays: 365,
    leadDays: 45,
    lateImpact:
      "تعذّر صرف مستحقات العقود الحكومية وإنهاء الإجراءات التي تتطلب شهادة سارية.",
    estimatedCost: 0,
  },
  {
    id: "vat-return",
    name: "الإقرار الضريبي (ضريبة القيمة المضافة)",
    authority: "هيئة الزكاة والضريبة والجمارك",
    category: "زكاة وضرائب",
    cycleDays: 90,
    leadDays: 15,
    lateImpact:
      "غرامة تأخير في تقديم الإقرار تُحتسب كنسبة من الضريبة المستحقة، وغرامة إضافية على تأخير السداد.",
    estimatedCost: 5000,
  },
  {
    id: "zakat-return",
    name: "الإقرار الزكوي السنوي",
    authority: "هيئة الزكاة والضريبة والجمارك",
    category: "زكاة وضرائب",
    cycleDays: 365,
    leadDays: 60,
    lateImpact: "غرامة تأخير على تقديم الإقرار وعلى سداد المستحق.",
    estimatedCost: 5000,
  },
  {
    id: "einvoice-wave",
    name: "الالتزام بمرحلة الربط (الفوترة الإلكترونية)",
    authority: "هيئة الزكاة والضريبة والجمارك",
    category: "زكاة وضرائب",
    cycleDays: 365,
    leadDays: 120,
    lateImpact:
      "مخالفات الفوترة الإلكترونية تبدأ من 5,000 ريال وتصل إلى 50,000 ريال لكل مخالفة.",
    estimatedCost: 5000,
  },
  {
    id: "saudization",
    name: "شهادة السعودة / نطاق المنشأة",
    authority: "وزارة الموارد البشرية",
    category: "عمالة",
    cycleDays: 365,
    leadDays: 60,
    lateImpact:
      "النزول لنطاق غير ملتزم يوقف خدمات قوى: إصدار التأشيرات ونقل الخدمات وتجديد رخص العمل.",
    estimatedCost: 0,
  },
  {
    id: "work-permit",
    name: "رخصة العمل (لكل عامل وافد)",
    authority: "وزارة الموارد البشرية",
    category: "عمالة",
    cycleDays: 365,
    leadDays: 45,
    lateImpact: "مقابل مالي على تأخير التجديد، ويمنع تجديد الإقامة.",
    estimatedCost: 100,
    perEmployee: true,
  },
  {
    id: "iqama",
    name: "تجديد الإقامة (لكل عامل وافد)",
    authority: "الجوازات",
    category: "عمالة",
    cycleDays: 365,
    leadDays: 45,
    lateImpact:
      "غرامة تأخير تتصاعد مع التكرار وقد تصل إلى الترحيل عند التكرار الثالث.",
    estimatedCost: 500,
    perEmployee: true,
  },
  {
    id: "gosi",
    name: "اشتراكات التأمينات الاجتماعية",
    authority: "المؤسسة العامة للتأمينات الاجتماعية",
    category: "تأمينات",
    cycleDays: 30,
    leadDays: 7,
    lateImpact: "غرامة تأخير شهرية تُحتسب كنسبة من قيمة الاشتراكات المستحقة.",
    estimatedCost: 2000,
  },
  {
    id: "wps",
    name: "رفع ملف حماية الأجور (مدد)",
    authority: "وزارة الموارد البشرية",
    category: "عمالة",
    cycleDays: 30,
    leadDays: 7,
    lateImpact: "إيقاف خدمات قوى تدريجياً عند التأخر عن رفع الملف أو انخفاض نسبة الالتزام.",
    estimatedCost: 0,
  },
  {
    id: "health-insurance",
    name: "التأمين الصحي للموظفين",
    authority: "مجلس الضمان الصحي",
    category: "تأمينات",
    cycleDays: 365,
    leadDays: 45,
    lateImpact: "غرامة عن كل مستفيد غير مؤمَّن، وتمنع تجديد الإقامات.",
    estimatedCost: 5000,
  },
  {
    id: "civil-defense",
    name: "رخصة الدفاع المدني (السلامة)",
    authority: "المديرية العامة للدفاع المدني",
    category: "سلامة",
    cycleDays: 365,
    leadDays: 60,
    lateImpact: "غرامة مخالفة اشتراطات السلامة وقد يُغلق الموقع إدارياً.",
    estimatedCost: 5000,
  },
  {
    id: "chamber",
    name: "اشتراك الغرفة التجارية",
    authority: "الغرفة التجارية",
    category: "أخرى",
    cycleDays: 365,
    leadDays: 30,
    lateImpact: "تعذّر تصديق المستندات وبعض خدمات المنشأة.",
    estimatedCost: 400,
  },
  {
    id: "domain-hosting",
    name: "تجديد النطاق والاستضافة",
    authority: "مزود الخدمة",
    category: "أخرى",
    cycleDays: 365,
    leadDays: 30,
    lateImpact: "توقف الموقع والبريد الرسمي للمنشأة.",
    estimatedCost: 0,
  },
  {
    id: "lease",
    name: "عقد الإيجار (إيجار)",
    authority: "شبكة إيجار",
    category: "أخرى",
    cycleDays: 365,
    leadDays: 60,
    lateImpact: "عدم توثيق العقد يعطل تجديد الرخص المرتبطة بالموقع.",
    estimatedCost: 0,
  },
];

export const CATEGORY_COLORS: Record<ObligationCategory, string> = {
  "تراخيص": "#60a5fa",
  "زكاة وضرائب": "#f5a524",
  "عمالة": "#a78bfa",
  "تأمينات": "#2dd4bf",
  "سلامة": "#f4436c",
  "أخرى": "#8fa0c0",
};
