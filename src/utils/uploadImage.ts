// src/utils/uploadImage.ts
// ضغط الصورة لأقل من 1 ميجا (مناسب للموبايل) ثم رفعها على Cloudinary

const CLOUDINARY_CLOUD_NAME = "iblruqyz";
const CLOUDINARY_UPLOAD_PRESET = "egydent_unsigned";

const MAX_BYTES = 1024 * 1024; // 1 ميجا
const MAX_DIMENSION = 1600; // أكبر عرض/طول بالبكسل

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("اختار ملف صورة صحيح (jpg, png, webp...)");
  }

  let bitmap: ImageBitmap;
  try {
    // from-image = يصلّح اتجاه الصور اللي بتتصور من الموبايل
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("صيغة الصورة مش مدعومة — جرّب JPG أو PNG");
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("المتصفح مش قادر يعالج الصورة");

  const render = (w: number, h: number) => {
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = "#ffffff"; // خلفية بيضا للصور الشفافة
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
  };

  const toBlob = (quality: number) =>
    new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("فشل ضغط الصورة"))),
        "image/jpeg",
        quality
      )
    );

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  let w = Math.round(bitmap.width * scale);
  let h = Math.round(bitmap.height * scale);
  render(w, h);

  // نقلل الجودة تدريجياً لحد ما الحجم يبقى أقل من 1 ميجا
  let quality = 0.85;
  let blob = await toBlob(quality);
  while (blob.size > MAX_BYTES && quality > 0.45) {
    quality -= 0.1;
    blob = await toBlob(quality);
  }

  // لو لسه كبيرة نصغّر الأبعاد كمان
  while (blob.size > MAX_BYTES && w > 600) {
    w = Math.round(w * 0.8);
    h = Math.round(h * 0.8);
    render(w, h);
    blob = await toBlob(0.75);
  }

  bitmap.close();

  if (blob.size > MAX_BYTES) {
    throw new Error("مقدرتش أصغّر الصورة لأقل من 1 ميجا — جرّب صورة تانية");
  }

  const name = (file.name || "image").replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

// بيترجم أشهر أخطاء Cloudinary لرسالة مفهومة
function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("preset not found")) return "اسم الـ Upload Preset غلط أو مش موجود في Cloudinary";
  if (m.includes("unsigned") || m.includes("whitelisted"))
    return "الـ Upload Preset لازم يكون Signing mode = Unsigned في Cloudinary";
  if (m.includes("cloud_name") || m.includes("cloud name")) return "اسم الـ Cloud Name غلط";
  if (m.includes("file size")) return "حجم الصورة أكبر من المسموح في Cloudinary";
  return `Cloudinary: ${msg}`;
}

/** بيضغط الصورة ويرفعها ويرجّع رابطها */
export async function uploadImage(file: File): Promise<string> {
  const compressed = await compressImage(file);

  const formData = new FormData();
  formData.append("file", compressed);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  let res: Response;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error("مفيش اتصال بالإنترنت أو الشبكة مانعة الرفع — جرّب تاني");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) {
    throw new Error(friendlyError(data?.error?.message ?? `خطأ ${res.status}`));
  }

  // f_auto,q_auto,w_1000 = Cloudinary يختار أنسب صيغة وجودة وحجم لكل جهاز
  return (data.secure_url as string).replace("/upload/", "/upload/f_auto,q_auto,w_1000/");
}
