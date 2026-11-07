import { supabase, isSupabaseConfigured } from "./supabase";
import { invokeSharedApi } from "./sharedApi";

export const BUCKET_NAME = "progress-media";

/**
 * ファイルを Supabase Storage にアップロードし、公開URLを取得する
 * （Supabase 未設定時は DataURL (base64) にフォールバック）
 */
export async function uploadImageFile(
  file: File,
  folder: "posts" | "records" | "avatars" = "posts"
): Promise<string> {
  if (file.size === 0 || file.size > 5 * 1024 * 1024) {
    throw new Error("画像は5MB以下のファイルを選択してください");
  }
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
    throw new Error("JPEG、PNG、WebP、GIF形式の画像を選択してください");
  }

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

  const signedUpload = await invokeSharedApi<{
    path: string;
    token: string;
    publicUrl: string;
  }>("create-upload-url", {
    folder,
    contentType: file.type,
    size: file.size,
  });
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .uploadToSignedUrl(signedUpload.path, signedUpload.token, file, {
      cacheControl: "3600",
      contentType: file.type,
    });
  if (error) throw error;
  return signedUpload.publicUrl;
}
