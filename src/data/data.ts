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
  // منتج للعرض فقط (صورة وشرح بدون سعر) — مش موجود فعلياً في مخزون العميل
  showcaseOnly?: boolean;
};

export const categories = [
  {
    id: "gloves",
    name: "جوانتي",
    desc: "جوانتي فحص وجراحة بجودة موثوقة ومقاسات متعددة",
    count: "",
    img: "images/c-consumables.jpg",
  },
  {
    id: "masks",
    name: "ماسك",
    desc: "كمامات طبية معتمدة لحماية إضافية أثناء العلاج",
    count: "",
    img: "images/c-consumables.jpg",
  },
  {
    id: "rubber-base-regular",
    name: "رابر بيز عادي",
    desc: "مواد طبع (Rubber Base) عادية بدقة طبع عالية",
    count: "",
    img: "images/p-composite.jpg",
  },
  {
    id: "rubber-base-addition-silicone",
    name: "رابر بيز ادشن سيلكون",
    desc: "مواد طبع سيليكون إضافي (Addition Silicone) بدقة فائقة",
    count: "",
    img: "images/p-composite.jpg",
  },
  {
    id: "composite",
    name: "كمبوزيت",
    desc: "حشوات كمبوزيت تجميلية بدرجات لون متعددة",
    count: "",
    img: "images/p-composite.jpg",
  },
  {
    id: "alginate",
    name: "الجينيت",
    desc: "مادة الجينات لأخذ المقاسات بدقة وسهولة",
    count: "",
    img: "images/c-consumables.jpg",
  },
  {
    id: "instruments-pakistani",
    name: "انسترومنت باكستاني",
    desc: "أدوات أسنان استانلس ستيل باكستانية الصنع",
    count: "",
    img: "images/p-endo.jpg",
  },
  {
    id: "ketabirka-chinese",
    name: "جتابيركا صيني",
    desc: "جتابيركا صيني الصنع بجودة موثوقة",
    count: "",
    img: "images/p-endo.jpg",
  },
  {
    id: "ketabirka-meta-2",
    name: "جتابيركا ميتا 2%",
    desc: "جتابيركا ميتا تركيز 2%",
    count: "",
    img: "images/p-endo.jpg",
  },
  {
    id: "ketabirka-meta-4",
    name: "جتابيركا ميتا 4%",
    desc: "جتابيركا ميتا تركيز 4%",
    count: "",
    img: "images/p-endo.jpg",
  },
  {
    id: "ketabirka-meta-6",
    name: "جتابيركا ميتا 6%",
    desc: "جتابيركا ميتا تركيز 6%",
    count: "",
    img: "images/p-endo.jpg",
  },
  {
    id: "paper-point-2",
    name: "بيبر بوينت 2%",
    desc: "بيبر بوينت تركيز 2% لعلاج الجذور",
    count: "",
    img: "images/p-endo.jpg",
  },
  {
    id: "paper-point-4",
    name: "بيبر بوينت 4%",
    desc: "بيبر بوينت تركيز 4% لعلاج الجذور",
    count: "",
    img: "images/p-endo.jpg",
  },
  {
    id: "paper-point-6",
    name: "بيبر بوينت 6%",
    desc: "بيبر بوينت تركيز 6% لعلاج الجذور",
    count: "",
    img: "images/p-endo.jpg",
  },
];

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "جوانتي فحص لاتكس مقاس M",
    cat: "gloves",
    price: 180,
    rating: 4.9,
    sold: 340,
    img: "images/c-consumables.jpg",
    badge: "الأكثر مبيعاً",
    desc: "علبة 100 جوانتي فحص لاتكس، مقاسات متعددة، حماية موثوقة أثناء الكشف والعلاج.",
  },
  {
    id: 2,
    name: "ماسك طبي 3 طبقات",
    cat: "masks",
    price: 45,
    rating: 4.8,
    sold: 520,
    img: "images/c-consumables.jpg",
    desc: "علبة 50 كمامة طبية معتمدة، حماية إضافية أثناء العلاج.",
  },
  {
    id: 3,
    name: "رابر بيز عادي (طقم كامل)",
    cat: "rubber-base-regular",
    price: 950,
    rating: 4.8,
    sold: 210,
    img: "images/p-composite.jpg",
    desc: "مادة طبع Rubber Base عادية بدقة طبع عالية للتيجان والجسور.",
  },
  {
    id: 4,
    name: "رابر بيز ادشن سيليكون",
    cat: "rubber-base-addition-silicone",
    price: 1450,
    rating: 4.9,
    sold: 150,
    img: "images/p-composite.jpg",
    badge: "جديد",
    desc: "مادة طبع سيليكون إضافي بدقة فائقة للحالات الدقيقة.",
  },
  {
    id: 5,
    name: "كيت كومبوزيت تجميلي 8 سرنجات",
    cat: "composite",
    price: 2150,
    rating: 4.9,
    sold: 860,
    img: "images/p-composite.jpg",
    desc: "كومبوزيت نانو هايبرد 8 سرنجات بدرجات A1 إلى A3.5 مع بوند وإتشانت.",
  },
  {
    id: 6,
    name: "الجينات لأخذ المقاسات",
    cat: "alginate",
    price: 220,
    rating: 4.7,
    sold: 300,
    img: "images/c-consumables.jpg",
    desc: "مادة الجينات لأخذ المقاسات بدقة وسهولة.",
  },
  {
    id: 7,
    name: "طقم انسترومنت باكستاني استانلس",
    cat: "instruments-pakistani",
    price: 650,
    rating: 4.6,
    sold: 190,
    img: "images/p-endo.jpg",
    desc: "أدوات أسنان استانلس ستيل باكستانية الصنع.",
  },
  {
    id: 8,
    name: "جتابيركا صيني",
    cat: "ketabirka-chinese",
    price: 90,
    rating: 4.6,
    sold: 240,
    img: "images/p-endo.jpg",
    desc: "جتابيركا صيني الصنع بجودة موثوقة.",
  },
  {
    id: 9,
    name: "جتابيركا ميتا 2%",
    cat: "ketabirka-meta-2",
    price: 110,
    rating: 4.7,
    sold: 130,
    img: "images/p-endo.jpg",
    desc: "جتابيركا ميتا تركيز 2%.",
  },
  {
    id: 10,
    name: "بيبر بوينت 2%",
    cat: "paper-point-2",
    price: 70,
    rating: 4.7,
    sold: 175,
    img: "images/p-endo.jpg",
    desc: "بيبر بوينت تركيز 2% لعلاج الجذور.",
  },
];

export const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

/**
 * يقبل ملف استيراد بأي من الشكلين:
 * - منتج كامل: { name, cat, price, oldPrice?, rating?, sold?, img/imageUrl, badge?, desc? }
 * - منتج مبسّط (اسم وصورة فقط): { name, imageUrl }
 * وأي حقل ناقص بياخد قيمة افتراضية آمنة عشان المنتج يظهر صح في المتجر.
 */
export function normalizeImportedProduct(raw: Record<string, unknown>): Omit<Product, "id"> | null {
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const img = typeof raw.img === "string" ? raw.img : typeof raw.imageUrl === "string" ? raw.imageUrl : "";
  if (!name || !img) return null;

  const cat = typeof raw.cat === "string" && categories.some((c) => c.id === raw.cat) ? raw.cat : "consumables";
  const price = typeof raw.price === "number" && raw.price > 0 ? raw.price : 0;
  const oldPrice = typeof raw.oldPrice === "number" && raw.oldPrice > 0 ? raw.oldPrice : undefined;
  const rating = typeof raw.rating === "number" ? raw.rating : 4.8;
  const sold = typeof raw.sold === "number" ? raw.sold : 0;
  const badge = typeof raw.badge === "string" && raw.badge.trim() ? raw.badge : undefined;
  const desc = typeof raw.desc === "string" ? raw.desc : "";

  return { name, cat, price, oldPrice, rating, sold, img, badge, desc };
}

export const branches = [
  {
    city: "مدينة نصر",
    address: "٦٠ شارع الطيران",
    phones: ["01121300354", "01151605515", "01153859919"],
    hours: "يومياً ١٠ص — ١٠م",
  },
  {
    city: "القصر العيني",
    address: "٣٠ شارع بستان الفاضل",
    phones: ["01065624098"],
    hours: "يومياً ١٠ص — ١٠م",
  },
  {
    city: "٦ أكتوبر",
    address: "١٢ ب أبراج علي الدين — سيتي مول",
    phones: ["01006747210"],
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
  { id: "vodafone", name: "فودافون كاش", note: "هيتواصل معاك المندوب على واتساب بالرقم" },
  { id: "instapay", name: "إنستاباي InstaPay", note: "هيتواصل معاك المندوب على واتساب بالتفاصيل" },
  { id: "orange", name: "أورانج كاش", note: "هيتواصل معاك المندوب على واتساب بالرقم" },
  { id: "etisalat", name: "اتصالات كاش", note: "هيتواصل معاك المندوب على واتساب بالرقم" },
  { id: "card", name: "فيزا / ماستركارد", note: "عن الاستلام أو بالفرع" },
  { id: "cod", name: "الدفع عند الاستلام", note: "كاش مع المندوب" },
];

export const DEFAULT_WHATSAPP = "201151605515";
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
