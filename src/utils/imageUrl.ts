/** صور Cloudinary بتتخزن بعرض 1000px — الكروت الصغيرة مش محتاجة كده، فبنطلب نسخة أصغر (أخف بكتير على الموبايل). أي رابط تاني بيرجع زي ما هو. */
export function thumb(url: string, width: number): string {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  const resized = url.replace(/\/upload\/f_auto,q_auto,w_\d+\//, `/upload/f_auto,q_auto:eco,w_${width}/`);
  if (resized !== url) return resized;
  if (/\/upload\/v\d+\//.test(url)) return url.replace("/upload/", `/upload/f_auto,q_auto:eco,w_${width}/`);
  return url;
}
