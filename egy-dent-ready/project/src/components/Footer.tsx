import { ArrowUpLeft, AtSign, Globe, Heart, Mail, MapPin, Phone, Play, Send } from "lucide-react";
import { Reveal, ToothMark } from "./ui";

const socials = [
  { icon: AtSign, label: "انستجرام" },
  { icon: Globe, label: "لينكدإن" },
  { icon: Play, label: "يوتيوب" },
  { icon: Send, label: "تليجرام" },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.07] bg-ink-900/70">
      {/* newsletter */}
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <Reveal>
          <div className="grid items-center gap-8 rounded-[2rem] border border-volt-500/20 bg-gradient-to-l from-volt-600/[0.12] to-transparent p-8 md:p-12 lg:grid-cols-2">
            <div>
              <h3 className="font-display text-3xl font-black leading-tight md:text-4xl">
                عروض حصرية كل أسبوع
                <br />
                <span className="text-volt-400">على ميلك مباشرة</span>
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-frost-400">
                اشترك في النشرة البريدية ويوصلك جديد المنتجات وعروض الجملة قبل أي حد.
              </p>
            </div>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                required
                placeholder="بريدك الإلكتروني"
                className="h-14 flex-1 rounded-2xl border border-white/10 bg-ink-950/60 px-5 text-sm outline-none transition-colors placeholder:text-frost-500 focus:border-volt-500/60"
              />
              <button className="h-14 rounded-2xl bg-gradient-to-l from-volt-400 to-volt-600 px-8 font-display font-black text-ink-950 shadow-[0_12px_32px_rgba(34,211,238,0.3)] transition-transform hover:scale-[1.03] active:scale-95">
                اشترك دلوقتي
              </button>
            </form>
          </div>
        </Reveal>

        {/* columns */}
        <div className="mt-16 grid gap-12 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
          <div>
            <a href="#hero" className="flex w-max items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-volt-400 to-volt-700">
                <ToothMark className="size-6 text-ink-950" />
              </span>
              <span className="leading-tight">
                <span className="block font-display text-xl font-black">
                  إيجي <span className="text-volt-400">دنت</span>
                </span>
                <span className="block text-[10px] font-semibold tracking-[0.3em] text-frost-500" dir="ltr">
                  EGY DENT STORE
                </span>
              </span>
            </a>
            <p className="mt-5 max-w-xs text-sm leading-loose text-frost-400">
              من 2011 وإحنا الشريك الأول للعيادات والمعامل في مصر — منتجات أصلية، أسعار جملة،
              ودعم فني من أطباء بيفهموا شغلك.
            </p>
            <div className="mt-6 flex gap-2.5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href="#hero"
                  aria-label={s.label}
                  className="grid size-11 place-items-center rounded-xl border border-white/10 text-frost-400 transition-all hover:-translate-y-1 hover:border-volt-500/50 hover:bg-volt-500/10 hover:text-volt-300"
                >
                  <s.icon className="size-4.5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display text-base font-extrabold text-white">روابط سريعة</h4>
            <ul className="mt-5 space-y-3 text-sm text-frost-400">
              {[
                ["الفئات", "#categories"],
                ["المنتجات المميزة", "#products"],
                ["العرض الخاص", "#offer"],
                ["آراء العملاء", "#testimonials"],
                ["فروعنا", "#branches"],
                ["لوحة التحكم", "#admin"],
              ].map(([l, h]) => (
                <li key={h}>
                  <a href={h} className="transition-colors hover:text-volt-300">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-base font-extrabold text-white">الدعم</h4>
            <ul className="mt-5 space-y-3 text-sm text-frost-400">
              {["سياسة الاستبدال والاسترجاع", "الشحن والتوصيل", "الأسئلة الشائعة", "شروط الاستخدام", "الخصوصية"].map((l) => (
                <li key={l}>
                  <a href="#hero" className="transition-colors hover:text-volt-300">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-base font-extrabold text-white">تواصل معانا</h4>
            <ul className="mt-5 space-y-4 text-sm text-frost-400">
              <li className="flex items-center gap-3">
                <Phone className="size-4.5 shrink-0 text-volt-400" />
                <span dir="ltr">0100 555 1280</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="size-4.5 shrink-0 text-volt-400" />
                <span dir="ltr">orders@egydent.com</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="size-4.5 shrink-0 translate-y-0.5 text-volt-400" />
                60 ش الطيران، مدينة نصر، القاهرة
              </li>
            </ul>
            <a
              href="#offer"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-gold-500/40 bg-gold-500/10 px-5 py-3 text-sm font-bold text-gold-400 transition-all hover:gap-3 hover:bg-gold-500/20"
            >
              اطلب عرض سعر للعيادات
              <ArrowUpLeft className="size-4" />
            </a>
          </div>
        </div>
      </div>

      {/* giant wordmark */}
      <div className="relative border-t border-white/[0.06]">
        <p
          className="pointer-events-none select-none bg-gradient-to-b from-white/[0.09] to-transparent bg-clip-text text-center font-display text-[13.5vw] font-black leading-[0.85] text-transparent [-webkit-text-stroke:0] lg:text-[15.5rem]"
          dir="ltr"
        >
          EGY DENT
        </p>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] bg-ink-950/70 px-5 py-5 backdrop-blur-md md:flex-row lg:px-14">
          <p className="text-xs text-frost-500">© 2025 إيجي دنت — جميع الحقوق محفوظة</p>
          <p className="flex items-center gap-1.5 text-xs text-frost-500">
            صُنع بـ
            <Heart className="size-3.5 fill-red-400 text-red-400" />
            في مصر
          </p>
        </div>
      </div>
    </footer>
  );
}
