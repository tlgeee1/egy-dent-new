export type Product = {
  id: number;
  name: string;
  cat: string;
  price: number;
  oldPrice?: number;
  rating: number;
  sold: number;
  img: string;
  badge?: string;
  desc?: string;
};

export const IMAGE_CHOICES = [
  "images/p-implant.jpg",
  "images/p-handpiece.jpg",
  "images/p-curing.jpg",
  "images/p-ortho.jpg",
  "images/p-composite.jpg",
  "images/p-endo.jpg",
  "images/c-equipment.jpg",
  "images/c-consumables.jpg",
  "images/hero.png",
];

export const categories = [
  {
    id: "implants",
    name: "الزراعة والتركيبات",
    desc: "أطقم زراعة ألمانية وكورية بضمان مدى الحياة",
    count: "+320 منتج",
    img: "images/p-implant.jpg",
  },
  {
    id: "equipment",
    name: "الأجهزة والمعدات",
    desc: "وحدات عيادات، موتورات وأجهزة تصليب بأحدث التقنيات",
    count: "+180 منتج",
    img: "images/c-equipment.jpg",
  },
  {
    id: "ortho",
    name: "التقويم",
    desc: "براكتس، أسلاك وأطقم تقويم شفاف معتمدة",
    count: "+150 منتج",
    img: "images/p-ortho.jpg",
  },
  {
    id: "consumables",
    name: "المستهلكات",
    desc: "كل ما تستهلكه عيادتك يومياً — جاهز للتوصيل الفوري",
    count: "+900 منتج",
    img: "images/c-consumables.jpg",
  },
];

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "طقم زراعة Premium ألماني",
    cat: "implants",
    price: 12500,
    oldPrice: 15000,
    rating: 4.9,
    sold: 340,
    img: "images/p-implant.jpg",
    badge: "الأكثر مبيعاً",
    desc: "طقم زراعة كامل (فيكتشر + أباتمنت + غطاء شفائي) من تيتانيوم نقي Grade 4 بمعالجة سطح SLA — معتمد FDA وCE مع ضمان مدى الحياة على الفيكتشر.",
  },
  {
    id: 2,
    name: "توربين سرعة فائقة NSK",
    cat: "equipment",
    price: 4850,
    rating: 4.8,
    sold: 520,
    img: "images/p-handpiece.jpg",
    desc: "توربين ياباني أصلي بسرعة 380 ألف لفة/دقيقة، رأس فايبر أوبتيك مضيء، نظام تبريد رباعي النقاط، وجسم تيتانيوم مضاد للانزلاق — ضمان سنة كاملة.",
  },
  {
    id: 3,
    name: "جهاز تصليب ضوئي LED وودبكر",
    cat: "equipment",
    price: 3200,
    oldPrice: 3800,
    rating: 4.8,
    sold: 410,
    img: "images/p-curing.jpg",
    badge: "خصم 16%",
    desc: "جهاز تصليب لاسلكي بشدة إضاءة 2300 mW/cm² — تصليب كامل في ثانية واحدة حتى عمق 8 ملم، بطارية تكفي 400 استخدام، مع 3 أوضاع تشغيل.",
  },
  {
    id: 4,
    name: "طقم تقويم شفاف Pro كامل",
    cat: "ortho",
    price: 8900,
    rating: 4.7,
    sold: 190,
    img: "images/p-ortho.jpg",
    badge: "جديد",
    desc: "طقم تقويم شفاف متكامل (20 ألاينر + أدوات IPR + قوالب متابعة) من خامة ألمانية فائقة المرونة — مثالي للحالات البسيطة والمتوسطة.",
  },
  {
    id: 5,
    name: "كيت كومبوزيت تجميلي 8 سرنجات",
    cat: "consumables",
    price: 2150,
    rating: 4.9,
    sold: 860,
    img: "images/p-composite.jpg",
    desc: "كومبوزيت نانو هايبرد 8 سرنجات بدرجات A1 إلى A3.5 مع بوند وإتشانت — لمعان عالي يدوم وثبات لون ممتاز مع أقل انكماش.",
  },
  {
    id: 6,
    name: "موتور إندو لاسلكي بشاشة LCD",
    cat: "equipment",
    price: 6400,
    rating: 4.8,
    sold: 275,
    img: "images/p-endo.jpg",
    desc: "موتور إندو بخاصية Reciprocating وأبيكس لوكيتور مدمج — 6 برامج جاهزة، عزم تلقائي قابل للضبط، وبطارية تعمل يوم كامل — ضمان سنتين.",
  },
];

export const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

export const testimonials = [
  {
    text: "منتجات أصلية وجودة عالية جداً، والأسعار أحسن من أي مورد تعاملت معاه. أنصح أي عيادة تتعامل مع إيجي دنت.",
    name: "د. محمد سامي",
    role: "عيادة أسنان — مدينة نصر",
    initial: "م",
  },
  {
    text: "التوربين وصل خلال ٢٤ ساعة بالضمان والفاتورة، وخدمة العملاء ردت عليا في نص الليل. مستوى محترم فعلاً.",
    name: "د. أحمد الشريف",
    role: "معمل دنتال لاب — الجيزة",
    initial: "ع",
  },
  {
    text: "أفضل مورد مستلزمات أسنان في مصر بلا منافس. طلبات العيادة كلها بقت من عندهم من سنتين.",
    name: "د. سارة محمود",
    role: "عيادة سمايل — أكتوبر",
    initial: "س",
  },
  {
    text: "أطقم الزراعة الألمانية عندهم أصلية ١٠٠٪ وبضمان حقيقي، والمرتجع سهل من غير أي وجع دماغ.",
    name: "د. كريم فتحي",
    role: "مركز دنتال كير — الإسكندرية",
    initial: "ك",
  },
  {
    text: "بنطلب مستهلكات المعمل كل شهر، التغليف ممتاز والتوصيل للإسكندرية بيوصل في يومين بالكتير.",
    name: "أ. محمود عبد الله",
    role: "معمل أسنان — سموحة",
    initial: "ع",
  },
  {
    text: "جهاز الإندو موتور جبته منهم بسعر الجملة، شغال معايا من سنة ونص زي الفل. تعامل راقي ومحترم.",
    name: "د. هبة حسن",
    role: "أخصائي علاج جذور — المنصورة",
    initial: "ه",
  },
];

export const branches = [
  {
    city: "مدينة نصر",
    address: "٦٠ شارع الطيران — بجوار سيتي ستارز",
    phone: "0100 555 1280",
    hours: "يومياً ١٠ص — ١٠م",
  },
  {
    city: "القصر العيني",
    address: "٣٠ شارع بستان الفاضل — وسط البلد",
    phone: "0100 555 1291",
    hours: "يومياً ١٠ص — ١٠م",
  },
  {
    city: "٦ أكتوبر",
    address: "أبراج علي الدين — سيتي مول، الدور الأرضي",
    phone: "0100 555 1302",
    hours: "يومياً ١١ص — ١١م",
  },
];

export const payments = [
  "الدفع عند الاستلام",
  "فودافون كاش",
  "إنستاباي InstaPay",
  "أورانج كاش",
  "اتصالات كاش",
  "فيزا / ماستركارد",
  "تحويل بنكي",
];

export const paymentMethods = [
  { id: "vodafone", name: "فودافون كاش", note: "0100 555 1280" },
  { id: "instapay", name: "إنستاباي InstaPay", note: "egydent@instapay" },
  { id: "orange", name: "أورانج كاش", note: "0128 555 1291" },
  { id: "etisalat", name: "اتصالات كاش", note: "0115 555 1302" },
  { id: "card", name: "فيزا / ماستركارد", note: "عن الاستلام أو بالفرع" },
  { id: "cod", name: "الدفع عند الاستلام", note: "كاش مع المندوب" },
];

export const DEFAULT_WHATSAPP = "201005551280";
export const DEFAULT_FREE_SHIPPING = 500;

export const fmt = (n: number) => n.toLocaleString("en-US");

export const relTime = (ts: number) => {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `من ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `من ${h} ساعة`;
  const d = Math.floor(h / 24);
  return `من ${d} يوم`;
};
