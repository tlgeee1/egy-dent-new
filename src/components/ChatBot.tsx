import { useEffect } from "react";

/**
 * شات Tawk.to — بيحل محل البوت القديم.
 * الاسم فضل "ChatBot" عشان أي مكان في المشروع بيستدعي <ChatBot /> يشتغل من غير تعديل.
 */
export default function ChatBot() {
  useEffect(() => {
    if (document.getElementById("tawk-script")) return;

    const script = document.createElement("script");
    script.id = "tawk-script";
    script.async = true;
    script.src = "https://embed.tawk.to/6abc160a926103343dfe96f3/1k3nbc6vi";
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");

    const firstScript = document.getElementsByTagName("script")[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.body.appendChild(script);
    }
  }, []);

  return null;
}
