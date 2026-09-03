import { Sparkle } from "lucide-react";
import { cn } from "@/utils/cn";

export default function Marquee({
  items,
  reverse = false,
  slow = false,
  className,
}: {
  items: string[];
  reverse?: boolean;
  slow?: boolean;
  className?: string;
}) {
  const row = (hidden: boolean) => (
    <div aria-hidden={hidden} className="flex w-max shrink-0 items-center">
      {items.map((t, i) => (
        <span key={i} className="flex items-center">
          <span className="whitespace-nowrap px-7 font-display text-lg font-extrabold text-frost-300 md:text-xl">
            {t}
          </span>
          <Sparkle className="size-4 shrink-0 text-volt-500" />
        </span>
      ))}
    </div>
  );

  return (
    <div className={cn("relative overflow-hidden border-y border-white/[0.07] bg-ink-900/60 py-5", className)}>
      <div className={cn("flex w-max", slow ? "animate-marquee-slow" : "animate-marquee", reverse && "marquee-rev")}>
        {row(false)}
        {row(true)}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-ink-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-ink-950 to-transparent" />
    </div>
  );
}
