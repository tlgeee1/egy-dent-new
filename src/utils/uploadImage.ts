// src/utils/uploadImage.ts
// ضغط الصورة لأقل من 1 ميجا (مناسب للموبايل) ثم رفعها على Cloudinary

const CLOUDINARY_CLOUD_NAME = "iblruqyz";
const CLOUDINARY_UPLOAD_PRESET = "egydent_unsigned";

const MAX_BYTES = 1024 * 1024; // 1 ميجا (هدف الضغط)
const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024; // حد Cloudinary المجاني للصورة الواحدة
const MAX_DIMENSION = 1600; // أكبر عرض/طول بالبكسل

type Loaded = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

// بيجرّب أكتر من طريقة لقراءة الصورة، لأن كل متصفح/جهاز بيدعم طريقة مختلفة
async function loadImage(file: File): Promise<Loaded> {
  // 1) createImageBitmap مع تصحيح اتجاه صور الموبايل
  try {
    const b = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    return { source: b, width: b.width, height: b.height, close: () => b.close() };
  } catch {
    /* نكمل للطريقة اللي بعدها */
  }

  // 2) createImageBitmap عادي
  try {
    const b = await createImageBitmap(file);
    return { source: b, width: b.width, height: b.height, close: () => b.close() };
  } catch {
    /* نكمل للطريقة اللي بعدها */
  }

  // 3) عنصر <img> (أكتر طريقة مدعومة على كل الأجهزة)
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("decode failed"));
      img.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

async function compressImage(file: File): Promise<File> {
  let img: Loaded;
  try {
    img = await loadImage(file);
  } catch {
    // المتصفح مقدرش يقرا الصورة (مثلاً HEIC من الآيفون) —
    // نرفع الأصلية زي ما هي وCloudinary هيحوّلها ويصغّرها عند العرض
    if (file.size <= MAX_ORIGINAL_BYTES) return file;
    throw new Error("الصورة كبيرة جداً (أكتر من 10 ميجا) — صغّرها أو صوّرها بجودة أقل");
  }

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    const render = (w: number, h: number) => {
      canvas.width = w;
      canvas.height = h;
      ctx.fillStyle = "#ffffff"; // خلفية بيضا للصور الشفافة
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img.source, 0, 0, w, h);
    };

    const toBlob = (quality: number) =>
      new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
          "image/jpeg",
          quality
        )
      );

    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    let w = Math.max(1, Math.round(img.width * scale));
    let h = Math.max(1, Math.round(img.height * scale));
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

    // لو الضغط طلّع حجم أكبر من الأصلية، نستخدم الأصلية
    if (blob.size >= file.size && file.size <= MAX_BYTES) return file;

    const name = (file.name || "image").replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    // أي مشكلة في الضغط: نرفع الأصلية بدل ما نوقف الرفع
    if (file.size <= MAX_ORIGINAL_BYTES) return file;
    throw new Error("مقدرتش أصغّر الصورة — جرّب صورة تانية");
  } finally {
    img.close();
  }
}

// بيترجم أشهر أخطاء Cloudinary لرسالة مفهومة
function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("preset not found")) return "اسم الـ Upload Preset غلط أو مش موجود في Cloudinary";
  if (m.includes("unsigned") || m.includes("whitelisted"))
    return "الـ Upload Preset لازم يكون Signing mode = Unsigned في Cloudinary";
  if (m.includes("cloud_name") || m.includes("cloud name")) return "اسم الـ Cloud Name غلط";
  if (m.includes("file size")) return "حجم الصورة أكبر من المسموح في Cloudinary";
  if (m.includes("invalid image") || m.includes("unsupported")) return "الصورة تالفة أو صيغتها مش مدعومة — جرّب JPG أو PNG";
  return `Cloudinary: ${msg}`;
}

/** بيضغط الصورة ويرفعها ويرجّع رابطها */
export async function uploadImage(file: File): Promise<string> {
  const toUpload = await compressImage(file);

  const formData = new FormData();
  formData.append("file", toUpload);
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
