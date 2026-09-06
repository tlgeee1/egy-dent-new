import { ArrowUpLeft, Heart, Mail, MapPin, Phone } from "lucide-react";
import { ToothMark } from "./ui";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-[var(--line-2)] bg-ink-900">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        {/* columns */}
        <div className="mt-16 grid gap-12 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
          <div>
            <a href="#hero" className="flex w-max items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-volt-400 to-volt-700">
                <ToothMark className="size-6 text-[var(--onaccent)]" />
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
            <p className="mt-5 max-w-xs text-sm leading-loose text-frost-300">
              من 2011 وإحنا الشريك الأول للعيادات والمعامل في مصر — منتجات أصلية، أسعار جملة،
              ودعم فني من أطباء بيفهموا شغلك.
            </p>
          </div>

          <div>
            <h4 className="font-display text-base font-extrabold text-[var(--text-primary)]">روابط سريعة</h4>
            <ul className="mt-5 space-y-3 text-sm text-frost-300">
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
            <h4 className="font-display text-base font-extrabold text-[var(--text-primary)]">الدعم</h4>
            <ul className="mt-5 space-y-3 text-sm text-frost-300">
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
            <h4 className="font-display text-base font-extrabold text-[var(--text-primary)]">تواصل معانا</h4>
            <ul className="mt-5 space-y-4 text-sm text-frost-300">
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
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-gold-400 bg-gold-400 px-5 py-3 text-sm font-bold text-[#3a2506] transition-all hover:gap-3 hover:bg-gold-500"
            >
              اطلب عرض سعر للعيادات
              <ArrowUpLeft className="size-4" />
            </a>
          </div>
        </div>
      </div>

      {/* giant wordmark */}
      <div className="relative border-t border-[var(--line-1)]">
        <p
          className="pointer-events-none select-none bg-gradient-to-b from-[var(--from-tint)] to-transparent bg-clip-text text-center font-display text-[13.5vw] font-black leading-[0.85] text-transparent [-webkit-text-stroke:0] lg:text-[15.5rem]"
          dir="ltr"
        >
          EGY DENT
        </p>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-between gap-3 border-t border-[var(--line-1)] bg-ink-950 px-5 py-5 md:flex-row lg:px-14">
          <p className="text-xs text-frost-400">© 2025 إيجي دنت — جميع الحقوق محفوظة</p>
          <p className="flex items-center gap-1.5 text-xs text-frost-400">
            صُنع بـ
            <Heart className="size-3.5 fill-red-400 text-red-400" />
            في مصر
          </p>
        </div>
      </div>
    </footer>
  );
}
