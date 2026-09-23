import { ArrowLeft } from "lucide-react";
import { categories } from "@/data/data";
import { Reveal, SectionHead } from "./ui";
import { useStore } from "@/context/StoreContext";

export default function Categories() {
  const { products, settings } = useStore();
  const countFor = (id: string) => products.filter((p) => p.cat === id && !p.showcaseOnly).length;

  return (
    <section id="categories" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead
            kicker="تسوّق حسب الفئة"
            title={
              <>
                كل أقسام عيادتك
                <span className="text-volt-400"> مغطّاة</span>
              </>
            }
            desc={`أكتر من ${products.length.toLocaleString("en-US")} منتج في ${categories.length} فئات رئيسية — من أول كرسي العيادة لآخر لفة الجفاز.`}
          />
          <Reveal delay={0.15}>
            <a
              href="#products"
              onClick={() => window.dispatchEvent(new CustomEvent("set-product-filter", { detail: "all" }))}
              className="group inline-flex items-center gap-2 rounded-full border border-[var(--line-3)] px-6 py-3 text-sm font-bold text-frost-300 transition-all hover:border-volt-500/40 hover:text-volt-300"
            >
              كل المنتجات
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            </a>
          </Reveal>
        </div>

        {/* hidden defs: the tooth-shaped clip path every category card uses */}
        <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
          <defs>
            <clipPath id="category-tooth-clip" clipPathUnits="objectBoundingBox">
              <path d="M0.06,0.30 C0.06,0.17 0.03,0.06 0.15,0.045 C0.22,0.02 0.28,0.12 0.35,0.12 C0.42,0.12 0.44,0.015 0.5,0.015 C0.56,0.015 0.58,0.12 0.65,0.12 C0.72,0.12 0.78,0.02 0.85,0.045 C0.97,0.06 0.94,0.17 0.94,0.30 L0.94,0.85 C0.94,0.94 0.87,1 0.78,1 L0.22,1 C0.13,1 0.06,0.94 0.06,0.85 Z" />
            </clipPath>
          </defs>
        </svg>

        <div className="mt-10 grid grid-cols-3 gap-3 sm:mt-14 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6">
          {categories.map((c, i) => (
            <Reveal key={c.id} delay={i * 0.04}>
              <a
                href="#products"
                onClick={() => window.dispatchEvent(new CustomEvent("set-product-filter", { detail: c.id }))}
                className="group relative block aspect-[4/5] w-full"
              >
                <div
                  className="absolute inset-0 overflow-hidden bg-ink-800 transition-transform duration-500 [filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.35))] group-hover:scale-[1.05]"
                  style={{ clipPath: "url(#category-tooth-clip)" }}
                >
                  <img
                    src={settings.categoryImages?.[c.id] || c.img}
                    alt={c.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110"
                  />
                  {/* الصورة كاملة الوضوح — طبقة سودا خفيفة في الشريط السفلي بس عشان الاسم يتقري.
                      ألوانها ثابتة (مش بتتغير مع الوضع الفاتح/الغامق) عشان الكتابة البيضا تبان دايماً */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-black/80 via-black/45 to-transparent" />
                  <div className="absolute inset-0 bg-volt-600/0 transition-colors duration-500 group-hover:bg-volt-600/10" />

                  {/* count chip */}
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white backdrop-blur-sm">
                    +{countFor(c.id).toLocaleString("en-US")}
                  </span>

                  {/* name, pinned to the bottom, high-contrast */}
                  <h3 className="absolute inset-x-0 bottom-0 px-1.5 pb-2.5 pt-1 text-center font-display text-[12px] font-black leading-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.85)] line-clamp-2 sm:text-[13px] md:text-sm">
                    {c.name}
                  </h3>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
