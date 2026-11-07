import { supabase } from "./supabase";
import type { Database } from "@/types/database";

type RecordRow = Database["public"]["Tables"]["records"]["Row"];
type PostRow = Database["public"]["Tables"]["posts"]["Row"];

type SharedApiAction =
  | "create-record"
  | "update-record"
  | "delete-record"
  | "create-post"
  | "update-post"
  | "delete-post"
  | "update-profile"
  | "create-upload-url"
  | "get-post-likes"
  | "toggle-post-like";

export async function invokeSharedApi<T>(
  action: SharedApiAction,
  payload: Record<string, unknown> = {}
): Promise<T> {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await supabase.functions.invoke<T>("shared-api", {
    body: { action, ...payload },
  });

  if (error) {
    let responseMessage: string | undefined;
    if (error.context instanceof Response) {
      const body: unknown = await error.context.clone().json().catch(() => null);
      if (
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof body.error === "string"
      ) {
        responseMessage = body.error;
      }
    }
    throw new Error(responseMessage || error.message);
  }

  if (data === null) {
    throw new Error("The shared API returned an empty response");
  }

  return data;
}

export type { PostRow, RecordRow, SharedApiAction };
