// بيصغّر صور Cloudinary على حسب مكان استخدامها (كارت صغير مش محتاج صورة 1000px).
// لو الرابط مش Cloudinary بيرجع زي ما هو من غير أي تغيير.
export function cdn(url: string | undefined, width: number): string {
  if (!url) return url ?? "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  return url.replace(/\/upload\/(?:(?:[a-z]{1,3}_[^/,]+,?)+\/)?/, `/upload/f_auto,q_auto,w_${width}/`);
}
