import { useStore } from "@/context/StoreContext";

/** زرار واتساب ثابت — بياخد الرقم من إعدادات المتجر (settings.whatsapp) */
export default function WhatsAppFloat() {
  const { settings } = useStore();
  const number = (settings.whatsapp || "").replace(/\D/g, "");
  if (!number) return null;

  const href = `https://wa.me/${number}?text=${encodeURIComponent("أهلاً إيجي دنت، عندي استفسار")}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل معنا على واتساب"
      className="fixed bottom-5 left-5 z-[140] grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_rgba(37,211,102,0.45)] transition-transform duration-300 hover:scale-110 active:scale-95 sm:bottom-6 sm:left-6"
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/40" aria-hidden="true" />
      <svg viewBox="0 0 32 32" className="size-7 fill-current" aria-hidden="true">
        <path d="M16.03 3C9.4 3 4 8.38 4 15c0 2.35.68 4.63 1.97 6.6L4 29l7.6-1.94A12.05 12.05 0 0 0 16.03 27C22.65 27 28 21.62 28 15S22.65 3 16.03 3Zm0 21.97c-1.9 0-3.75-.5-5.37-1.45l-.39-.23-4.51 1.15 1.2-4.4-.25-.4A9.9 9.9 0 0 1 6.1 15c0-5.46 4.46-9.9 9.93-9.9 5.48 0 9.93 4.44 9.93 9.9s-4.45 9.97-9.93 9.97Zm5.45-7.43c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.57-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
      </svg>
    </a>
  );
}
