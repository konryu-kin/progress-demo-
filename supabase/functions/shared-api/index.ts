import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GUEST_ID = "00000000-0000-4000-8000-000000000001";
const BUCKET_NAME = "progress-media";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(
  body: Record<string, unknown>,
  key: string,
  maxLength: number,
): string {
  const value = body[key];
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new ApiError(`Invalid ${key}`, 400);
  }
  return value.trim();
}

function requiredId(body: Record<string, unknown>, key: string): string {
  const value = requiredString(body, key, 36);
  if (!UUID_PATTERN.test(value)) throw new ApiError(`Invalid ${key}`, 400);
  return value;
}

function optionalText(
  body: Record<string, unknown>,
  key: string,
  maxLength: number,
): string | undefined {
  if (!(key in body)) return undefined;
  const value = body[key];
  if (typeof value !== "string" || value.length > maxLength) {
    throw new ApiError(`Invalid ${key}`, 400);
  }
  return value.trim();
}

function validateUrl(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length > 2048) {
    throw new ApiError(`Invalid ${field}`, 400);
  }
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") throw new Error();
  } catch {
    throw new ApiError(`Invalid ${field}`, 400);
  }
  return value;
}

function validateImageUrls(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 5) {
    throw new ApiError("Invalid imageUrls", 400);
  }
  return value.map((url) => validateUrl(url, "imageUrls"));
}

function validateMinutes(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 1440
  ) {
    throw new ApiError("Activity time must be between 0 and 1440 minutes", 400);
  }
  return value;
}

function validateStartDate(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ||
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
  ) {
    throw new ApiError("Invalid startedAt", 400);
  }
  const latestTimeZoneDate = new Date(Date.now() + 14 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  if (value > latestTimeZoneDate) {
    throw new ApiError("Start date cannot be in the future", 400);
  }
  return value;
}

async function readJson(request: Request): Promise<unknown> {
  if (!request.body) throw new ApiError("Request body is required", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > 16 * 1024) {
      await reader.cancel();
      throw new ApiError("Request is too large", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError("Invalid JSON body", 400);
  }
}

async function hashIp(ip: string, secret: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${secret}:${ip}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 16 * 1024) return respond({ error: "Request is too large" }, 413);

  try {
    const body = await readJson(request);
    if (!isObject(body) || typeof body.action !== "string") {
      throw new ApiError("Invalid request", 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new ApiError("Server configuration is incomplete", 503);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const forwardedIp = request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const { data: allowed, error: rateLimitError } = await admin.rpc(
      "consume_guest_api_rate_limit",
      {
        p_ip_hash: await hashIp(forwardedIp, serviceRoleKey),
        p_max_requests: body.action === "create-upload-url" ? 10 : 60,
        p_window_seconds: 60,
      },
    );
    if (rateLimitError) {
      console.error("Guest API rate limiter failed:", rateLimitError);
      throw new ApiError("API protection is not configured; apply supabase/schema.sql", 503);
    }
    if (!allowed) throw new ApiError("Too many requests; try again shortly", 429);

    switch (body.action) {
      case "create-record": {
        const title = requiredString(body, "title", 120);
        const description = optionalText(body, "description", 1000) ?? "";
        const coverImageUrl = validateUrl(body.coverImageUrl ?? "", "coverImageUrl");
        const startedAt = validateStartDate(body.startedAt);
        const { data, error } = await admin
          .from("records")
          .insert({
            user_id: GUEST_ID,
            title,
            description,
            cover_image_url: coverImageUrl,
            started_at: startedAt,
          })
          .select("*")
          .single();
        if (error) throw error;
        return respond({ record: data });
      }

      case "update-record": {
        const id = requiredId(body, "id");
        const updates: Record<string, unknown> = {};
        const title = optionalText(body, "title", 120);
        const description = optionalText(body, "description", 1000);
        if (title !== undefined) {
          if (!title) throw new ApiError("Title cannot be empty", 400);
          updates.title = title;
        }
        if (description !== undefined) updates.description = description;
        if ("coverImageUrl" in body) {
          updates.cover_image_url = validateUrl(body.coverImageUrl, "coverImageUrl");
        }
        if ("startedAt" in body) updates.started_at = validateStartDate(body.startedAt);
        if (Object.keys(updates).length === 0) throw new ApiError("No changes supplied", 400);
        updates.updated_at = new Date().toISOString();
        const { data, error } = await admin
          .from("records")
          .update(updates)
          .eq("id", id)
          .select("*")
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new ApiError("Record not found", 404);
        return respond({ record: data });
      }

      case "delete-record": {
        const id = requiredId(body, "id");
        const { data, error } = await admin
          .from("records")
          .delete()
          .eq("id", id)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new ApiError("Record not found", 404);
        return respond({ success: true });
      }

      case "create-post": {
        const recordId = requiredId(body, "recordId");
        const content = requiredString(body, "content", 2000);
        const activityMinutes = validateMinutes(body.activityMinutes);
        const imageUrls = validateImageUrls(body.imageUrls);
        const { data, error } = await admin
          .from("posts")
          .insert({
            record_id: recordId,
            user_id: GUEST_ID,
            content,
            activity_minutes: activityMinutes,
            image_urls: imageUrls,
          })
          .select("*")
          .single();
        if (error?.code === "23503") throw new ApiError("Record not found", 404);
        if (error) throw error;
        return respond({ post: data });
      }

      case "update-post": {
        const id = requiredId(body, "id");
        const updates: Record<string, unknown> = {};
        const content = optionalText(body, "content", 2000);
        if (content !== undefined) {
          if (!content) throw new ApiError("Post content cannot be empty", 400);
          updates.content = content;
        }
        if ("activityMinutes" in body) {
          updates.activity_minutes = validateMinutes(body.activityMinutes);
        }
        if ("imageUrls" in body) updates.image_urls = validateImageUrls(body.imageUrls);
        if (Object.keys(updates).length === 0) throw new ApiError("No changes supplied", 400);
        updates.updated_at = new Date().toISOString();
        const { data, error } = await admin
          .from("posts")
          .update(updates)
          .eq("id", id)
          .select("*")
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new ApiError("Post not found", 404);
        return respond({ post: data });
      }

      case "delete-post": {
        const id = requiredId(body, "id");
        const { data, error } = await admin
          .from("posts")
          .delete()
          .eq("id", id)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new ApiError("Post not found", 404);
        return respond({ success: true });
      }

      case "update-profile": {
        const updates: Record<string, unknown> = {};
        const name = optionalText(body, "name", 80);
        if (name !== undefined) {
          if (!name) throw new ApiError("Name cannot be empty", 400);
          updates.name = name;
        }
        if ("avatarUrl" in body) updates.avatar_url = validateUrl(body.avatarUrl, "avatarUrl");
        if (Object.keys(updates).length === 0) throw new ApiError("No changes supplied", 400);
        updates.updated_at = new Date().toISOString();
        const { data, error } = await admin
          .from("profiles")
          .update(updates)
          .eq("id", GUEST_ID)
          .select("*")
          .single();
        if (error) throw error;
        return respond({ profile: data });
      }

      case "create-upload-url": {
        const folder = body.folder;
        const contentType = body.contentType;
        const size = body.size;
        if (!["posts", "records", "avatars"].includes(String(folder))) {
          throw new ApiError("Invalid image folder", 400);
        }
        if (
          !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
            String(contentType),
          ) ||
          typeof size !== "number" ||
          !Number.isInteger(size) ||
          size < 1 ||
          size > MAX_IMAGE_BYTES
        ) {
          throw new ApiError("Unsupported image or image exceeds 5 MB", 400);
        }
        const extension: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "image/gif": "gif",
        };
        const path = `${folder}/${crypto.randomUUID()}.${extension[String(contentType)]}`;
        const { data, error } = await admin.storage
          .from(BUCKET_NAME)
          .createSignedUploadUrl(path, { upsert: false });
        if (error) throw error;
        const { data: publicUrl } = admin.storage.from(BUCKET_NAME).getPublicUrl(path);
        return respond({ path: data.path, token: data.token, publicUrl: publicUrl.publicUrl });
      }

      case "get-post-likes": {
        const visitorId = requiredId(body, "visitorId");
        const { data, error } = await admin.rpc("get_guest_post_like_states", {
          p_visitor_id: visitorId,
        });
        if (error) throw error;
        const likes = Object.fromEntries(
          data.map((state: { post_id: string; like_count: number; is_liked: boolean }) => [
            state.post_id,
            { count: state.like_count, isLiked: state.is_liked },
          ]),
        );
        return respond({ likes });
      }

      case "toggle-post-like": {
        const postId = requiredId(body, "postId");
        const visitorId = requiredId(body, "visitorId");
        const { data, error } = await admin.rpc("toggle_guest_post_like", {
          p_post_id: postId,
          p_visitor_id: visitorId,
        });
        if (error?.message.includes("post not found")) {
          throw new ApiError("Post not found", 404);
        }
        if (error) throw error;
        const result = data[0];
        if (!result) throw new ApiError("Post not found", 404);
        return respond({ likesCount: result.like_count, isLiked: result.is_liked });
      }

      default:
        throw new ApiError("Unknown action", 400);
    }
  } catch (error) {
    if (error instanceof ApiError) return respond({ error: error.message }, error.status);
    console.error("Shared API request failed:", error);
    return respond({ error: "The request could not be completed" }, 500);
  }
});
