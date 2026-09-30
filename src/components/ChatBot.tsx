import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageCircle,
  X,
  ChevronRight,
  Send,
  Plus,
  Check,
  PackageSearch,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { useCart } from "@/context/CartContext";
import { fmt, type Product } from "@/data/data";

const FAQS: { q: string; a: string }[] = [
  {
    q: "التوصيل بياخد قد إيه؟",
    a: "التوصيل بيوصل خلال 24-48 ساعة للقاهرة والجيزة، و 2-4 أيام عمل لباقي المحافظات.",
  },
  {
    q: "المنتجات أصلية ومضمونة؟",
    a: "أيوه، كل منتجاتنا أصلية 100% ومستوردة من وكلاء معتمدين، ومضمونة بالكامل.",
  },
  {
    q: "طرق الدفع المتاحة إيه؟",
    a: "متاح الدفع عند الاستلام (كاش)، فودافون كاش، انستاباي، والتحويلات البنكية.",
  },
  {
    q: "الشحن مجاني؟",
    a: "الشحن مجاني للطلبات الكبيرة اللي بتتعدى الحد الأدنى المحدد في المتجر.",
  },
  {
    q: "سياسة الاستبدال والإرجاع؟",
    a: "متاح الاسترجاع والاستبدال خلال 14 يوم من الاستلام طالما المنتج في عبوته الأصلية السليمة.",
  },
];

type ChatMsg = {
  role: "user" | "model";
  text: string;
  items?: Product[];
};

type View = { screen: "menu" } | { screen: "answer"; index: number } | { screen: "ai" };

export default function ChatBot() {
  const { settings, products, orders } = useStore();
  const { add } = useCart();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ screen: "menu" });
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [addedId, setAddedId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const waLink = settings.whatsapp
    ? `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent("أهلاً، بتواصل معاكم بخصوص استفسار من المتجر")}`
    : undefined;

  const toggle = () => {
    setOpen((v) => !v);
    if (open) setView({ screen: "menu" });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, view]);

  const handleAddToCart = (product: Product) => {
    add(product.id, 1);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  // محرك الإجابة والبحث التفاعلي والذكي مع ميزات طبية وفنية للأسنان
  const processQuery = (rawText: string): ChatMsg => {
    const q = rawText.trim().toLowerCase();

    // 1) الاستفسار عن البوند (Bonding Agents) - فني وطبي 🦷
    if (q.includes("بوند") || q.includes("بند") || q.includes("bond") || q.includes("أدهيسيف") || q.includes("ادهيسيف")) {
      return {
        role: "model",
        text: "بخصوص البوند (Adhesive Systems) وطريقة الاختيار الأنسب لحالتك 🦷:\n\n" +
              "🔹 الجيل الخامس (5th Gen - Total Etch):\n" +
              "• بيحتاج حمض تخريش منفصل (Etch 37%).\n" +
              "• قوة ربط ممتازة جداً بس حساس للرطوبة.\n\n" +
              "🔹 الجيل الثامن والـ Universal (8th Gen / Self-Etch):\n" +
              "• مريح وسريع، بيقلل حساسية ما بعد الحشو (Post-op Sensitivity).\n" +
              "• متوافق مع كل أنواع الكور والكمبوزيت والزركونيا.\n\n" +
              "💡 نصيحة: لحالات الفينير والحشوات الأمامية التجميلية اختار بوند بريميوم ياباني أو أمريكي.",
      };
    }

    // 2) الاستفسار الفني عن استخدامات الكمبوزيت (Anterior vs Posterior)
    if (q.includes("استخدام") || q.includes("استعمال") || q.includes("anterior") || q.includes("posterior") || q.includes("خلفي") || q.includes("امامي") || q.includes("أمامي")) {
      if (q.includes("كمبوزيت") || q.includes("حشو")) {
        const aestheticComps = products.filter((p) => p.name.includes("شوفو") || p.name.includes("تكوياما") || p.name.includes("جي سي")).slice(0, 3);
        return {
          role: "model",
          text: "تقسيم الكمبوزيت حسب مكان الحشو 🦷:\n\n" +
                "🎨 للأسنان الأمامية (Anterior - تجميلي):\n" +
                "• جزيئات نانو فائقة النعومة وتأثير كاميليون ليتماشى مع لون السن الطبيعي.\n" +
                "• الترشيحات: شوفو ياباني (Shofu)، تكوياما أومنيكروما، وجي سي.\n\n" +
                "🔨 للأسنان الخلفية (Posterior - قوة تحمل):\n" +
                "• مقاومة عالية للتآكل والمضغ (High Wear Resistance).\n" +
                "• الترشيحات: اكسترا فيل وجراندو فوكو.\n\n" +
                "👇 دي أبرز الخيارات التجميلية المتاحة للطلب الفوري:",
          items: aestheticComps,
        };
      }
    }

    // 3) فحص تتبع الطلب
    if (q.includes("eg-") || q.includes("طلب") || q.includes("اوردر") || q.includes("أوردر") || q.includes("تتبع")) {
      const foundOrder = orders.find(
        (o) => o.id.toLowerCase() === q || q.includes(o.id.toLowerCase())
      );

      if (foundOrder) {
        return {
          role: "model",
          text: `📦 بيانات طلبك رقم (${foundOrder.id}):\n\n• العميل: ${foundOrder.customer.name}\n• العيادة: ${foundOrder.customer.clinic}\n• الإجمالي: ${fmt(foundOrder.total)} جنيه\n• حالة الطلب الحالية: 🟢 [ ${foundOrder.status} ]\n\nلو محتاج استعجال كلمنا واتساب فوراً!`,
        };
      } else if (q.includes("eg-")) {
        return {
          role: "model",
          text: "لم نتمكن من العثور على طلب بهذا الكود. يرجى التأكد من الكود المكتوب أو التواصل معنا عبر الواتساب.",
        };
      }
    }

    // 4) المقارنات الطبية والتجارية بين الخامات
    if (q.includes("فرق") || q.includes("قارن") || q.includes("مقارنة") || q.includes("احسن") || q.includes("أحسن") || q.includes("افضل")) {
      if ((q.includes("رابر") || q.includes("بيز")) && (q.includes("ادشن") || q.includes("سيليكون") || q.includes("عادي"))) {
        const rubberProds = products.filter((p) => p.cat.includes("rubber") || p.name.includes("زيتا") || p.name.includes("elite")).slice(0, 3);
        return {
          role: "model",
          text: "الفرق بين الرابر بيز العادي والادشن سيليكون 🦷:\n\n" +
                "🔹 الرابر بيز العادي (C-Silicone زي زيتا بلس وسيلكسيل):\n" +
                "• اقتصادي وممتاز لمقاسات الدراسة والمقاسات الأولية، لازم يتصب في المعمل سريعاً.\n\n" +
                "🔸 الادشن سيليكون (A-Silicone زي Elite HD وكروموبان):\n" +
                "• دقة متناهية ميكرونية وثبات أبعاد يمتد لأيام دون أي انكماش، مثالي للتيجان والجسور والفينير.\n\n" +
                "👇 أشهر خامات الطبعات المتاحة للإضافة الفورية:",
          items: rubberProds,
        };
      }

      if ((q.includes("روبي") || q.includes("ruby")) && (q.includes("شوفو") || q.includes("shofu"))) {
        const compProds = products.filter((p) => p.name.includes("روبي") || p.name.includes("شوفو")).slice(0, 2);
        return {
          role: "model",
          text: "المقارنة بين روبي وشوفو كمبوزيت 💎:\n\n• روبي (180ج): اقتصادي جداً وممتاز للحشوات الخلفية العادية.\n• شوفو الياباني (950ج): بريميوم تجميلي بتقنية Giomer، لمعان وثبات فائق للأسنان الأمامية.\n\n👇 يمكنك إضافة أيهم للسلة مباشرة:",
          items: compProds,
        };
      }
    }

    // 5) البحث عن الكمبوزيت
    if (q.includes("كمبوزيت") || q.includes("كومبوزيت") || q.includes("حشو")) {
      const comps = products.filter((p) => p.cat.includes("composite") || p.name.includes("فيل") || p.name.includes("شوفو")).slice(0, 4);
      return {
        role: "model",
        text: `متوفر لدينا تشكيلة واسعة من الكمبوزيت من الاقتصادي حتى التجميلي البريميوم (${products.filter(p=>p.cat.includes("composite")).length} صنف). إليك أبرز الخيارات:`,
        items: comps,
      };
    }

    // 6) البحث عن الجوانتيات والماسكات
    if (q.includes("جوانت") || q.includes("نترايل") || q.includes("لاتكس") || q.includes("قفاز") || q.includes("ماسك")) {
      const gloves = products.filter((p) => p.name.includes("نترايل") || p.name.includes("لاتكس") || p.name.includes("ماسك")).slice(0, 4);
      return {
        role: "model",
        text: "متوفر جوانتيات طبية مستوردة وماسكات معتمدة بأعلى درجات الحماية والسماكة:",
        items: gloves,
      };
    }

    // 7) البحث عن الرابر بيز والطبعات
    if (q.includes("رابر") || q.includes("بيز") || q.includes("طبعة") || q.includes("سيليكون") || q.includes("زيتا")) {
      const impressions = products.filter((p) => p.cat.includes("rubber") || p.name.includes("زيتا") || p.name.includes("سيلكسيل") || p.name.includes("elite")).slice(0, 4);
      return {
        role: "model",
        text: "خامات الطبعات وسيليكون الأسنان (عادي وادشن سيليكون):",
        items: impressions,
      };
    }

    // 8) البحث عن الألجينات
    if (q.includes("الجينيت") || q.includes("الجنيت") || q.includes("جينات") || q.includes("كروموبان") || q.includes("هيدروجم")) {
      const alginates = products.filter((p) => p.cat.includes("alginate") || p.name.includes("كروموبان") || p.name.includes("زيتالجين") || p.name.includes("هيدروجم")).slice(0, 4);
      return {
        role: "model",
        text: "أفضل أنواع الألجينات الإيطالية والمستوردة سريعة الخلط وعالية الدقة:",
        items: alginates,
      };
    }

    // 9) البحث بالاسم المباشر لأي منتج
    const searchTerms = q.replace(/سعر|بكام|ثمن|عندكم|عايز|محتاج/g, "").trim().split(" ").filter((w) => w.length > 1);
    for (const term of searchTerms) {
      const matches = products.filter((p) => p.name.toLowerCase().includes(term));
      if (matches.length > 0) {
        return {
          role: "model",
          text: `وجدت لك المنتجات التالية المطابقة لبحثك:`,
          items: matches.slice(0, 4),
        };
      }
    }

    // 10) الاستفسارات العامة
    if (q.includes("شحن") || q.includes("توصيل") || q.includes("ديليفري")) {
      return {
        role: "model",
        text: "🚚 الشحن والتوصيل:\n\n• متاح الشحن لجميع محافظات مصر.\n• مدة التوصيل: خلال 24-48 ساعة للقاهرة والجيزة، و 2-4 أيام لباقي المحافظات.\n• شحن مجاني للطلبات المؤهلة الكبيرة.",
      };
    }

    if (q.includes("فرع") || q.includes("عنوان") || q.includes("مكان")) {
      return {
        role: "model",
        text: "📍 فروع إيجي دنت:\n\n🏢 فرع مدينة نصر\n🏢 فرع القصر العيني\n🏢 فرع 6 أكتوبر\n\n📱 تواصل معنا: 01151605515",
      };
    }

    if (q.includes("دفع") || q.includes("كاش") || q.includes("فودافون") || q.includes("انستاباي")) {
      return {
        role: "model",
        text: "💳 طرق الدفع:\n\n✅ الدفع عند الاستلام كاش\n✅ فودافون كاش والمحافظ الإلكترونية\n✅ انستاباي InstaPay\n✅ تحويل بنكي",
      };
    }

    return {
      role: "model",
      text: "أهلاً يا دكتور! 🦷 أنا مساعدك الذكي في متجر إيجي دنت.\n\nتقدر تسألني عن أي خامة أو تكتب اسم المنتج وتضيفه للسلة مباشرة من هنا، أو تتبع طلبك بكتابة رقم الأوردر!",
    };
  };

  const handleSend = (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText) return;

    setMessages((prev) => [...prev, { role: "user", text: queryText }]);
    if (!textToSend) setInput("");

    setTimeout(() => {
      const response = processQuery(queryText);
      setMessages((prev) => [...prev, response]);
    }, 250);
  };

  return (
    <>
      {/* زرار الشات العائم */}
      <button
        onClick={toggle}
        aria-label={open ? "إغلاق الشات" : "افتح المساعد الذكي"}
        className="fixed bottom-24 right-5 z-[150] grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-volt-400 to-volt-600 text-white shadow-[0_12px_32px_rgba(34,211,238,0.4)] transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ scale: 0, rotate: -90 }} 
