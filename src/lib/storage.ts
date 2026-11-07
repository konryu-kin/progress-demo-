import { supabase, isSupabaseConfigured } from "./supabase";

export const BUCKET_NAME = "progress-media";

/**
 * ファイルを Supabase Storage にアップロードし、公開URLを取得する
 * （Supabase 未設定時は DataURL (base64) にフォールバック）
 */
export async function uploadImageFile(
  file: File,
  folder: "posts" | "records" | "avatars" = "posts"
): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    // ローカルモード（Base64 DataURL）
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to read file as data URL"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  // Supabase Storage モード
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Supabase Storage upload error:", uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return data.publicUrl;
}

