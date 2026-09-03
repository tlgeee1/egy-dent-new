import { ArrowUpLeft, Clock, CreditCard, MapPin, Phone } from "lucide-react";
import { branches, payments } from "@/data/data";
import { Reveal, SectionHead } from "./ui";

export default function Branches() {
  return (
    <section id="branches" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead
            kicker="زورنا في أقرب فرع"
            title={
              <>
                3 فروع <span className="text-volt-400">في خدمتك</span>
              </>
            }
            desc="مخازننا ومعارضنا منتشرة في قلب القاهرة — عدّي علينا وشوف المنتجات بنفسك."
          />
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {branches.map((b, i) => (
            <Reveal key={b.city} delay={i * 0.1}>
              <div className="group relative h-full overflow-hidden rounded-[1.75rem] border border-[var(--line-2)] bg-ink-900 p-7 transition-all duration-500 hover:-translate-y-2 hover:border-volt-500/40 hover:shadow-[0_28px_70px_rgba(0,0,0,0.5)]">
                <div className="absolute -left-10 -top-10 size-36 rounded-full bg-volt-600/10 blur-2xl transition-all duration-500 group-hover:bg-volt-500/20" />

                <div className="relative">
                  <div className="flex items-start justify-between">
                    <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-volt-400 to-volt-700 text-[var(--onaccent)] shadow-[0_10px_26px_rgba(34,211,238,0.3)]">
                      <MapPin className="size-6" />
                    </span>
                    <span className="font-display text-4xl font-black text-[var(--text-faint)]" dir="ltr">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h3 className="mt-6 font-display text-2xl font-extrabold">{b.city}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-frost-400">{b.address}</p>

                  <div className="mt-6 space-y-2.5 border-t border-[var(--line-2)] pt-5 text-sm">
                    <p className="flex items-center gap-2.5 text-frost-300">
                      <Clock className="size-4 text-volt-400" />
                      {b.hours}
                    </p>
                    <a
                      href={`tel:${b.phone.replace(/\s/g, "")}`}
                      className="flex items-center gap-2.5 text-frost-300 transition-colors hover:text-volt-300"
                      dir="ltr"
                    >
                      <Phone className="size-4 text-volt-400" />
                      {b.phone}
                    </a>
                  </div>

                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-volt-300 transition-all group-hover:gap-3">
                    احصل على الاتجاهات
                    <ArrowUpLeft className="size-4" />
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* payments */}
        <Reveal delay={0.15}>
          <div className="mt-14 rounded-[2rem] border border-[var(--line-2)] bg-ink-900 p-8 md:p-10">
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-gold-500/10 text-gold-400">
                  <CreditCard className="size-6" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-extrabold">طرق دفع مرنة وآمنة</h3>
                  <p className="text-xs text-frost-500">اختار اللي يناسبك — كل الطرق متاحة</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {payments.map((p) => (
                  <span
                    key={p}
                    className="rounded-full border border-[var(--line-3)] bg-[var(--fill-2)] px-4 py-2 text-xs font-bold text-frost-300 transition-colors hover:border-volt-500/40 hover:text-volt-300 md:text-sm"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
