import { Quote, Star } from "lucide-react";
import { testimonials } from "@/data/data";
import { SectionHead } from "./ui";
import { cn } from "@/utils/cn";

function Card({ t }: { t: (typeof testimonials)[number] }) {
  return (
    <figure className="relative w-[320px] shrink-0 rounded-[1.5rem] border border-white/[0.07] bg-ink-800/70 p-6 backdrop-blur-sm transition-colors hover:border-volt-500/30 md:w-[380px]">
      <Quote className="absolute left-5 top-5 size-7 text-volt-500/20" />
      <div className="flex gap-1" dir="ltr">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="size-4 fill-gold-400 text-gold-400" />
        ))}
      </div>
      <blockquote className="mt-4 min-h-24 text-sm leading-loose text-frost-300 md:text-[15px]">{t.text}</blockquote>
      <figcaption className="mt-5 flex items-center gap-3 border-t border-white/[0.07] pt-4">
        <span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-volt-400 to-volt-700 font-display text-lg font-black text-ink-950">
          {t.initial}
        </span>
        <div>
          <p className="font-display text-sm font-extrabold">{t.name}</p>
          <p className="text-xs text-frost-500">{t.role}</p>
        </div>
      </figcaption>
    </figure>
  );
}

export default function Testimonials() {
  const rowA = testimonials.slice(0, 3);
  const rowB = testimonials.slice(3);

  return (
    <section id="testimonials" className="relative overflow-hidden bg-ink-900/50 py-24 md:py-32">
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-l from-transparent via-volt-500/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHead
          center
          kicker="آراء العملاء"
          title={
            <>
              دكاترة ومُعمل <span className="text-volt-400">بيتكلموا عنا</span>
            </>
          }
          desc="أكتر من 950 عيادة ومعمل أسنان في 12 محافظة اختاروا إيجي دنت مورد رئيسي — دي شهادتهم."
        />
      </div>

      <div className="mt-14 space-y-5">
        {[
          { list: rowA, rev: false, dur: "38s" },
          { list: rowB, rev: true, dur: "44s" },
        ].map((row, ri) => (
          <div key={ri} className="relative overflow-hidden">
            <div
              className={cn("flex w-max gap-5 animate-marquee", row.rev && "marquee-rev")}
              style={{ animationDuration: row.dur }}
            >
              {[...row.list, ...row.list, ...row.list, ...row.list].map((t, i) => (
                <Card key={`${t.name}-${i}`} t={t} />
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-ink-900 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-ink-900 to-transparent" />
          </div>
        ))}
      </div>
    </section>
  );
}
