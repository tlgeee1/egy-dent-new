import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useStore } from "@/context/StoreContext";

type ChatMsg = { role: "user" | "model"; text: string };

function getSmartReply(message: string, products: any[]): string {
  const msg = message.trim().toLowerCase();

  // 1) الترحيب
  if (
    msg.includes("السلام") ||
    msg.includes("صباح") ||
    msg.includes("مساء") ||
    msg.includes("هاي") ||
    msg.includes("هلو") ||
    msg.includes("ازيك") ||
    msg.includes("أهلاً") ||
    msg.includes("اهلا")
  ) {
    return "أهلاً وسهلاً بيك في إيجي دنت! 🦷✨\n\nأنا مساعدك الذكي لمستلزمات الأسنان، تقدر تسألني عن:\n• أسعار أي صنف أو خامة\n• المقارنة بين الأنواع والبدائل\n• عروض الفئات والكتالوج\n• الشحن وطرق الدفع\n\nإيه اللي محتاجه لعيادتك النهاردة؟";
  }

  // 2) عندكم إيه / المنتجات / الكتالوج العام
  if (
    msg.includes("عندكم ايه") ||
    msg.includes("عندك ايه") ||
    msg.includes("بتبيعو ايه") ||
    msg.includes("المنتجات") ||
    msg.includes("الكتالوج") ||
    msg.includes("الاصناف") ||
    msg.includes("الأصناف") ||
    msg === "ايه" ||
    msg === "إيه"
  ) {
    return (
      "متوفر عندنا في إيجي دنت كل مستلزمات عيادات ومعامل الأسنان بسعر الجملة 🦷:\n\n" +
      "1️⃣ جوانتيات وماسكات (لاتكس، نترايل أزرق وأسود، ماسكات طبية)\n" +
      "2️⃣ رابر بيز عادي (زيتا بلس، سيلكسيل، لايت، كتاليست)\n" +
      "3️⃣ رابر بيز ادشن سيليكون (كيت Elite HD، كروموبان، هندي، هان)\n" +
      "4️⃣ كمبوزيت بكل أنواعه (من الاقتصادي زي روبي وبرايم لحد شوفو وتكوياما واكسترا فيل)\n" +
      "5️⃣ ألجينات (كروموبان، زيتالجين، هيدروجم فايف، كيفكس، IQ)\n" +
      "6️⃣ أدوات وانسترومنت باكستاني عالية الجودة\n\n" +
      "قولي مهتم بأي قسم وأعرضلك كل أصنافه بأسعارها!"
    );
  }

  // 3) المقارنات
  if (msg.includes("فرق") || msg.includes("قارن") || msg.includes("مقارنة") || msg.includes("أحسن") || msg.includes("احسن") || msg.includes("افضل") || msg.includes("أفضل")) {
    // رابر بيز عادي vs ادشن سيليكون
    if (
      (msg.includes("رابر") || msg.includes("بيز") || msg.includes("طبعة") || msg.includes("طبعه")) &&
      (msg.includes("عادي") || msg.includes("سي رابر")) &&
      (msg.includes("ادشن") || msg.includes("اديشن") || msg.includes("سيليكون"))
    ) {
      return (
        "الفرق بين الرابر بيز العادي والادشن سيليكون 🦷:\n\n" +
        "🔹 الرابر بيز العادي (C-Silicone زي زيتا بلس وسيلكسيل):\n" +
        "• السعر: اقتصادي ومناسب للشغل اليومي (يبدأ من 490 ج للكتاليست لحد 1980 ج للعلبة الكبيرة).\n" +
        "• المميزات: سهل الخلط، تكلفة منخفضة، ممتاز للمقاسات المبدئية.\n" +
        "• العيوب: لازم يتصب سريعاً لأن انكماشه أسرع.\n\n" +
        "🔸 الادشن سيليكون (A-Silicone زي Elite HD وكروموبان ادشن):\n" +
        "• السعر: فئة احترافية (يبدأ من 1400 ج لحد 2980 ج للكيت الكامل).\n" +
        "• المميزات: دقة ميكرونية فائقة، ثبات أبعاد عالي جداً يفضل أيام بدون تشوه، مناسب للتيجان والجسور والفينير والزرعات.\n\n" +
        "💡 الخلاصة: للتيجان والتركيبات الدقيقة اختار الادشن، للروتين والـ Study Models العادي ممتاز وموفر."
      );
    }

    // روبي vs شوفو
    if ((msg.includes("روبي") || msg.includes("ruby")) && (msg.includes("شوفو") || msg.includes("shofu"))) {
      return (
        "المقارنة بين كمبوزيت روبي وشوفو 💎:\n\n" +
        "• كمبوزيت روبي (180 ج):\n" +
        "خيار اقتصادي جداً، مناسب للحشوات الخلفية البسيطة والعيادات اللي بتدور على تكلفة تشغيل قليلة.\n\n" +
        "• كمبوزيت شوفو Shofu (يبدأ من 950 ج للعادي و 1200 ج لـ LS و 1500 ج لـ A1):\n" +
        "خامة ياباني بريميوم، تقنية Giomer، لمعان وثبات لون فائق، ومقاومة عالية للتآكل ومثالي للشغل التجميلي والأسنان الأمامية.\n\n" +
        "💡 لو الحالة تجميلية واضحة شوفو يكسب بجدارة، لو حشوة خلفية سريعة روبي خيار موفر."
      );
    }

    // برايم vs ميتا
    if ((msg.includes("برايم") || msg.includes("prime")) && (msg.includes("ميتا") || msg.includes("meta"))) {
      return (
        "المقارنة بين برايم وميتا كمبوزيت:\n\n" +
        "• برايم (200 ج): اقتصادي، مناسب للـ Class I & II العادي.\n" +
        "• ميتا Meta (280 ج): كوري أصلي، بوليش أحسن، سهولة في الـ Handling ومش بيلزق في الانسترومنت.\n\n" +
        "💡 الميتا يعتبر أفضل صفقة كقيمة مقابل سعر بفارق 80 ج بس!"
      );
    }
  }

  // 4) الكمبوزيت وكل أنواعه والبدائل
  if (
    msg.includes("كمبوزيت") ||
    msg.includes("كومبوزيت") ||
    msg.includes("حشو ليزر") ||
    msg.includes("حشو ضوئي") ||
    msg.includes("composite")
  ) {
    const comps = products.filter(
      (p) =>
        (p.cat && p.cat.includes("composite")) ||
        (p.category && p.category.includes("كمبوزيت")) ||
        (p.name && p.name.includes("فيل")) ||
        (p.name && p.name.includes("شوفو")) ||
        (p.name && p.name.includes("فوكو"))
    );

    if (
      msg.includes("انواع") ||
      msg.includes("أنواع") ||
      msg.includes("تاني") ||
      msg.includes("تانية") ||
      msg.includes("غيره") ||
      msg.includes("قائمة") ||
      msg.includes("كل") ||
      msg === "عندكم كمبوزيت" ||
      msg === "كمبوزيت" ||
      msg === "مفيش انواع تانيه" ||
      msg === "مفيش انواع تانية"
    ) {
      if (comps.length > 0) {
        const sorted = [...comps].sort((a, b) => (a.price || 0) - (b.price || 0));
        const list = sorted.map((c) => `• ${c.name}: ${c.price} ج`).join("\n");
        return `متوفر عندنا تشكيلة واسعة من الكمبوزيت بالأسعار 🦷:\n\n${list}\n\nقولي بتدور على درجة معينة أو ماركة محددة؟`;
      }
      return (
        "أنواع الكمبوزيت المتوفرة عندنا من الأرخص للأعلى:\n\n" +
        "• روبي: 180 ج\n" +
        "• برايم: 200 ج\n" +
        "• ميتا: 280 ج\n" +
        "• شارم: 285 ج\n" +
        "• هندي: 350 ج\n" +
        "• برازيلي: 350 ج\n" +
        "• نوفا: 500 ج\n" +
        "• دي فيل: 500 ج\n" +
        "• افوكلار تيكونوم: 550 ج\n" +
        "• كير: 600 ج\n" +
        "• بروميدكا: 670 ج\n" +
        "• كيفكس: 650 ج\n" +
        "• زركون فيل: 650 ج\n" +
        "• زد فيل: 800 ج\n" +
        "• ايتينا: 800 ج\n" +
        "• سوبرا فوكو: 800 ج\n" +
        "• تكوياما عادي: 950 ج\n" +
        "• شوفو عادي: 950 ج\n" +
        "• بولو فيل فوكو: 980 ج\n" +
        "• شوفو LS: 1200 ج\n" +
        "• دنت سبلاي: 1250 ج\n" +
        "• شوفو A1: 1500 ج\n" +
        "• تكوياما اومنيكروما: 1600 ج\n" +
        "• جي سي: 1650 ج\n" +
        "• اكسترا فيل: 1750 ج\n" +
        "• جراندو فوكو: 2050 ج"
      );
    }
  }

  // 5) الجوانتيات والماسكات
  if (
    msg.includes("جوانت") ||
    msg.includes("نترايل") ||
    msg.includes("نتيرايل") ||
    msg.includes("لاتكس") ||
    msg.includes("ماسك") ||
    msg.includes("كمامات") ||
    msg.includes("قفاز")
  ) {
    if (msg.includes("اسود") || msg.includes("أسود")) {
      return "متوفر نترايل أسود فيت برو بسعر 170 جنيه للعلبة (جودة ممتازة وسماكة عالية للعمليات والعيادات).";
    }
    if (msg.includes("ازرق") || msg.includes("أزرق")) {
      return "متوفر نترايل أزرق نوعين:\n• فيت برو: 160 جنيه\n• سوبر كير: 160 جنيه";
    }
    if (msg.includes("لاتكس") || msg.includes("ابيض") || msg.includes("أبيض")) {
      return "متوفر لاتكس أبيض ماليزي بسعر 165 جنيه للعلبة.";
    }
    if (msg.includes("ماسك") || msg.includes("كمامة")) {
      return "أسعار الماسكات:\n• ماسك مصري: 50 ج\n• ماسك صيني: 65 ج\n• ماسك صيني ابيك أزرق: 120 ج\n• ماسك صيني ابيك أسود: 140 ج";
    }

    return (
      "أسعار الجوانتيات والماسكات الطبية:\n\n" +
      "• لاتكس أبيض ماليزي: 165 ج\n" +
      "• نتيرايل أزرق فيت برو: 160 ج\n" +
      "• نترايل أزرق سوبر كير: 160 ج\n" +
      "• نترايل أسود فيت برو: 170 ج\n" +
      "• ماسك مصري: 50 ج\n" +
      "• ماسك صيني: 65 ج\n" +
      "• ماسك ابيك أزرق: 120 ج\n" +
      "• ماسك ابيك أسود: 140 ج"
    );
  }

  // 6) الرابر بيز والسيليكون
  if (
    msg.includes("رابر") ||
    msg.includes("بيز") ||
    msg.includes("سيليكون") ||
    msg.includes("زيتا") ||
    msg.includes("سيلكسيل") ||
    msg.includes("زرماخ") ||
    msg.includes("طبعة")
  ) {
    return (
      "أسعار خامات الرابر بيز والطبعات:\n\n" +
      "🔹 رابر بيز عادي (C-Silicone):\n" +
      "• زيتا بلس كبير: 1980 ج\n" +
      "• سيلكسيل كبير: 1900 ج\n" +
      "• زيتا بلس صغير: 800 ج\n" +
      "• لايت زرماخ برتقالي: 550 ج\n" +
      "• لايت سيلكسيل: 520 ج\n" +
      "• كتاليست زرماخ: 520 ج\n" +
      "• كتاليست عادي: 490 ج\n\n" +
      "🔸 ادشن سيليكون (A-Silicone):\n" +
      "• كيت Elite HD إيطالي: 2980 ج\n" +
      "• كيت كروموبان ادشن: 2800 ج\n" +
      "• كيت هندي: 2500 ج\n" +
      "• كيت هان: 1650 ج\n" +
      "• كيت ادشن صغير كروموبان: 1400 ج\n" +
      "• لايت ادشن زرماخ: 650 ج"
    );
  }

  // 7) الألجينات
  if (msg.includes("الجينيت") || msg.includes("الserverجين") || msg.includes("الجينات") || msg.includes("كروموبان") || msg.includes("هيدروجم")) {
    return (
      "أسعار الألجينات المتوفرة:\n\n" +
      "• صيني: 170 ج\n" +
      "• كروموبان: 250 ج\n" +
      "• IQ: 260 ج\n" +
      "• زيتالجين Zetalgin: 270 ج\n" +
      "• تروبيكال جين: 425 ج\n" +
      "• كيفيكس Cavex: 460 ج\n" +
      "• هيدروجم فايف Hydrogum 5: 485 ج"
    );
  }

  // 8) الأدوات والانسترومنت
  if (msg.includes("ادوات") || msg.includes("أدوات") || msg.includes("انسترومنت") || msg.includes("مرايا") || msg.includes("بروب") || msg.includes("تويزر") || msg.includes("مقص")) {
    return (
      "أدوات وانسترومنت باكستاني ستانلس ستيل عالي الجودة:\n\n" +
      "• مرايا: 15 ج / يد مرايا: 20 ج\n" +
      "• بروب عادي / برودنتال: 30 ج\n" +
      "• تويزر عادي: 50 ج / تويزر لوك: 60 ج\n" +
      "• اكسكافيتور / كوندنسر / كارفر / اسكلر / كيوريت: 30 ج للقطعة\n" +
      "• مقص جراحي: 50 ج\n" +
      "• تيشو فورسبس: 85 ج / متركس هولدر: 85 ج\n" +
      "• رافع لثة / بون فايل / املجم كارير: 100 ج\n" +
      "• نيدل هولدر: 120 ج"
    );
  }

  // 9) أسعار منتج محدد بالاسم
  const words = msg.replace(/سعر|بكام|ثمن|عايز|محتاج|عندكم|عندك/g, "").trim().split(" ").filter((w) => w.length > 2);
  for (const word of words) {
    const found = products.find((p) => p.name && p.name.toLowerCase().includes(word));
    if (found) {
      return `✅ ${found.name}\n💰 السعر: ${found.price} جنيه${found.oldPrice ? `\n🏷️ السعر قبل الخصم: ${found.oldPrice} جنيه` : ""}${found.desc ? `\n\nℹ️ ${found.desc}` : ""}`;
    }
  }

  // 10) الشحن والتوصيل
  if (msg.includes("توصيل") || msg.includes("شحن") || msg.includes("ديليفري") || msg.includes("بتوصلوا")) {
    return "🚚 سياسة الشحن والتوصيل:\n\n• بنوصل لجميع محافظات مصر.\n• مدة التوصيل: خلال 24-48 ساعة للقاهرة والجيزة، و 2-4 أيام لباقي المحافظات.\n• 📦 الشحن مجاني للطلبات فوق الحد الأدنى المحدد في المتجر.\n• المعاينة متاحة عند الاستلام للتأكد من سلامة الأصناف.";
  }

  // 11) الدفع
  if (msg.includes("دفع") || msg.includes("كاش") || msg.includes("فودافون") || msg.includes("انستاباي") || msg.includes("فيزا") || msg.includes("تحويل")) {
    return "💳 طرق الدفع المتاحة في إيجي دنت:\n\n✅ الدفع عند الاستلام (Cash on Delivery)\n✅ فودافون كاش / أورنج كاش / اتصالات كاش\n✅ انستاباي InstaPay الفوري\n✅ تحويل بنكي مباشر\n✅ بطاقات فيزا وماستركارد";
  }

  // 12) الفروع والتواصل
  if (msg.includes("فرع") || msg.includes("فروع") || msg.includes("مكانكم") || msg.includes("عنوان") || msg.includes("مقر")) {
    return "📍 فروع إيجي دنت الرئيسية:\n\n🏢 فرع مدينة نصر\n🏢 فرع القصر العيني\n🏢 فرع 6 أكتوبر\n\n📱 للتواصل المباشر والطلبات: 01151605515 (واتساب وهاتف)";
  }

  // 13) الإرجاع والاستبدال
  if (msg.includes("ارجاع") || msg.includes("استرجاع") || msg.includes("استبدال") || msg.includes("ضمان")) {
    return "↩️ سياسة الإرجاع والاستبدال:\n\n• متاح الاسترجاع والاستبدال خلال 14 يوم من الاستلام.\n• يشترط أن يكون المنتج في عبوته الأصلية السليمة وغير مستخدم.\n• المنتجات أصلية 100% ومضمونة من الوكيل.";
  }

  // 14) شكر
  if (msg.includes("شكر") || msg.includes("تسلم") || msg.includes("تمام") || msg.includes("حبيبي") || msg.includes("شكرا")) {
    return "العفو يا دكتور، شرفتنا ونورتنا! 😊🦷\nلو محتاج تجهيز أي أوردر أو تسأل عن أي صنف تاني أنا معاك في أي وقت.";
  }

  // الرد العام لو السؤال مش مباشر
  return (
    "أنا معاك يا فندم! 🦷 تقدر تسألني بوضوح عن:\n\n" +
    "• أسعار أي منتج (مثال: بكام النترايل الأسود؟)\n" +
    "• أنواع فئة معينة (مثال: عندكم كمبوزيت إيه؟)\n" +
    "• مقارنات بين الخامات (مثال: الفرق بين رابر بيز عادي وادشن سيليكون؟)\n" +
    "• التوصيل والفروع وطرق الدفع\n\n" +
    "أو اضغط على زرار الواتساب تحت وهيتواصل معاك مسؤول المبيعات فوراً!"
  );
}

export default function ChatBot() {
  const { products } = useStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      const reply = getSmartReply(trimmed, products);
      setMessages((prev) => [...prev, { role: "model", text: reply }]);
      setLoading(false);
    }, 350);
  };

  return (
    <>
      {/* زرار الشات العائم — يمين الشاشة ومرتفع فوق الواتساب */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "إغلاق الشات" : "افتح الشات"}
        className="fixed bottom-24 right-5 z-[150] grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-volt-400 to-volt-600 text-white shadow-[0_12px_32px_rgba(34,211,238,0.4)] transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90 }} animate={{ rotate: 0 }}>
              <X className="size-6" />
            </motion.span>
          ) : (
            <motion.span key="c" initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <MessageCircle className="size-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* نافذة الشات */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-40 right-5 z-[150] flex w-[92vw] max-w-sm flex-col overflow-hidden rounded-[1.75rem] border border-[var(--line-3)] bg-ink-900 shadow-2xl sm:bottom-24 sm:right-6"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-[var(--line-2)] bg-gradient-to-l from-volt-500/10 to-transparent p-4">
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-700">
                <MessageCircle className="size-5 text-white" />
              </span>
              <div className="flex-1">
                <p className="font-display text-sm font-black">مساعد إيجي دنت 🦷</p>
                <p className="text-[11px] text-frost-500">جاهز للرد على كل استفساراتك فوراً</p>
              </div>
            </div>

            {/* Messages Body */}
            <div className="max-h-96 min-h-[16rem] overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="mb-2 text-xs text-frost-400">👋 أسئلة سريعة تقدر تضغط عليها:</p>
                  {[
                    "عندكم كمبوزيت إيه؟",
                    "ايه الفرق بين رابر بيز عادي وادشن سيليكون؟",
                    "بكام النترايل الأسود؟",
                    "عندكم منتجات إيه بالأسعار؟",
                  ].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="block w-full rounded-xl border border-[var(--line-3)] bg-ink-950/60 px-3 py-2 text-right text-xs font-bold text-frost-300 transition-colors hover:border-volt-500/50 hover:text-volt-300"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "text-left" : "text-right"}>
                    <span
                      className={
                        m.role === "user"
                          ? "inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-volt-500/15 px-3 py-2 text-sm text-frost-100"
                          : "inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-ink-950/70 px-3 py-2 text-sm leading-relaxed text-frost-200"
                      }
                    >
                      {m.text}
                    </span>
                  </div>
                ))}
                {loading && (
                  <div className="text-right">
                    <span className="inline-flex items-center gap-2 rounded-2xl bg-ink-950/70 px-3 py-2 text-sm text-frost-400">
                      <Loader2 className="size-3.5 animate-spin text-volt-400" />
                      بيكتب الرد...
                    </span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-2 border-t border-[var(--line-2)] p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب سؤالك هنا..."
                maxLength={300}
                disabled={loading}
                className="flex-1 rounded-xl border border-[var(--line-3)] bg-ink-950/60 px-3 py-2 text-sm text-frost-100 outline-none focus:border-volt-500/50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="إرسال"
                className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-volt-400 to-volt-600 text-white disabled:opacity-40"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </form>

            {/* Footer WhatsApp Link */}
            <div className="border-t border-[var(--line-2)] p-3">
              <a
                href="https://wa.me/201151605515?text=%D8%A3%D9%87%D9%84%D8%A7%D9%8B%D8%8C%20%D8%B9%D8%A7%D9%8A%D8%B2%20%D8%A3%D8%B3%D8%AA%D9%81%D8%B3%D8%B1%20%D8%B9%D9%86%20%D8%B7%D9%84%D8%A8"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-400 to-emerald-600 py-2.5 text-sm font-black text-white transition-transform hover:scale-[1.02]"
              >
                💬 تواصل واتساب مع المبيعات
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
