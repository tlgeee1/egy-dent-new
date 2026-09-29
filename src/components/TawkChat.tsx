import { useEffect } from 'react';

export default function TawkChat() {
  useEffect(() => {
    // منع التحميل المتكرر
    if (document.getElementById('tawk-script')) {
      return;
    }

    // إنشاء السكريبت
    const script = document.createElement('script');
    script.id = 'tawk-script';
    script.async = true;
    script.src = 'https://embed.tawk.to/6abc160a926103343dfe96f3/1k3nbc6vi';
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');

    // إضافة السكريبت للصفحة
    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    }

    // التنظيف عند الخروج
    return () => {
      const existingScript = document.getElementById('tawk-script');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return null;
}
