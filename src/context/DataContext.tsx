import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { RecordItem, PostItem, User, RecordStats } from "@/types";
import { calculateDay, toLocalDateString } from "@/lib/utils";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { invokeSharedApi } from "@/lib/sharedApi";
import type { Database } from "@/types/database";

type RecordRow = Database["public"]["Tables"]["records"]["Row"];
type PostRow = Database["public"]["Tables"]["posts"]["Row"];
const GUEST_ID = "00000000-0000-4000-8000-000000000001";

const DEFAULT_USER: User = {
  id: GUEST_ID,
  name: "Guest",
  avatarUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=120&h=120&q=80",
};

const SAMPLE_NOTE_IMG =
  "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=600&q=80";
const SAMPLE_CODE_IMG =
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80";
const SAMPLE_RUN_IMG =
  "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=600&q=80";

const INITIAL_RECORDS: RecordItem[] = [
  {
    id: "rec-1",
    title: "現コミュ 課題",
    description: "現代コミュニケーション論のレポート作成と参考文献の整理",
    coverImageUrl: SAMPLE_NOTE_IMG,
    startedAt: toLocalDateString(new Date(Date.now() - 19 * 24 * 60 * 60 * 1000)),
    createdAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rec-2",
    title: "個人開発 progress",
    description: "趣味の継続プロセスを共有・可視化するSNSアプリ開発",
    coverImageUrl: SAMPLE_CODE_IMG,
    startedAt: toLocalDateString(new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)),
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rec-3",
    title: "朝ラン＆筋トレ",
    description: "毎朝5kmランニングと体幹トレーニングの習慣化",
    coverImageUrl: SAMPLE_RUN_IMG,
    startedAt: toLocalDateString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_POSTS: PostItem[] = [
  {
    id: "post-1",
    recordId: "rec-1",
    userId: GUEST_ID,
    user: DEFAULT_USER,
    content: "もう少しでレポートが書き終わりそう〜",
    imageUrls: [SAMPLE_NOTE_IMG],
    activityMinutes: 0,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    likesCount: 0,
    isLiked: false,
  },
  {
    id: "post-2",
    recordId: "rec-2",
    userId: GUEST_ID,
    user: DEFAULT_USER,
    content: "UIデザインの方眼紙レイアウトとボトムナビゲーションを組んでみた！かなりいい感じ",
    imageUrls: [SAMPLE_CODE_IMG],
    activityMinutes: 0,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    likesCount: 0,
    isLiked: false,
  },
  {
    id: "post-3",
    recordId: "rec-1",
    userId: GUEST_ID,
    user: DEFAULT_USER,
    content: "第2章の構成案がまとまった。今日は参考文献の引用箇所をチェックしていく予定！",
    imageUrls: [SAMPLE_NOTE_IMG],
    activityMinutes: 0,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    likesCount: 0,
    isLiked: false,
  },
];

interface DataContextType {
  currentUser: User;
  records: RecordItem[];
  posts: PostItem[];
  isLoading: boolean;
  dataError: string | null;
  isCloudConnected: boolean;
  getRecordById: (id: string) => RecordItem | undefined;
  getPostsByRecordId: (recordId: string) => PostItem[];
  getRecordStats: (recordId: string) => RecordStats;
  togglePostLike: (id: string) => Promise<void>;
  addPost: (
    newPost: Omit<PostItem, "id" | "userId" | "user" | "createdAt" | "likesCount" | "isLiked">
  ) => Promise<PostItem>;
  updatePost: (id: string, updates: Partial<Pick<PostItem, "content" | "activityMinutes" | "imageUrls">>) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  addRecord: (newRecord: Omit<RecordItem, "id" | "createdAt" | "updatedAt">) => Promise<RecordItem>;
  updateRecord: (id: string, updates: Partial<Pick<RecordItem, "title" | "description" | "coverImageUrl" | "startedAt">>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  updateProfile: (updates: { name?: string; avatarUrl?: string }) => Promise<void>;
  isCreatePostOpen: boolean;
  setIsCreatePostOpen: (open: boolean) => void;
  selectedRecordIdForPost: string | null;
  setSelectedRecordIdForPost: (recordId: string | null) => void;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY_RECORDS = "progress_app_records_v1";
const STORAGE_KEY_POSTS = "progress_app_posts_v1";
const STORAGE_KEY_VISITOR_ID = "progress_app_visitor_id_v1";

function getVisitorId(): string {
  const saved = localStorage.getItem(STORAGE_KEY_VISITOR_ID);
  if (saved) return saved;
  const visitorId = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY_VISITOR_ID, visitorId);
  return visitorId;
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    return DEFAULT_USER;
  });

  const [records, setRecords] = useState<RecordItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) {
        const storedRecords = JSON.parse(saved) as RecordItem[];
        return storedRecords.map((record) => ({
          ...record,
          startedAt: record.startedAt || record.createdAt.slice(0, 10),
        }));
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_RECORDS;
  });

  const [posts, setPosts] = useState<PostItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POSTS);
      if (saved) {
        const storedPosts = JSON.parse(saved) as PostItem[];
        return storedPosts.map((post) => ({
          ...post,
          likesCount: post.likesCount ?? 0,
          isLiked: post.isLiked ?? false,
        }));
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_POSTS;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [selectedRecordIdForPost, setSelectedRecordIdForPost] = useState<string | null>(null);

  // Supabase からのデータ取得
  const fetchSupabaseData = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      setIsLoading(true);

      const [recordsResult, postsResult, profileResult] = await Promise.all([
        supabase.from("records").select("*").order("created_at", { ascending: false }),
        supabase.from("posts").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").eq("id", GUEST_ID).maybeSingle(),
      ]);

      if (recordsResult.error) throw recordsResult.error;
      if (postsResult.error) throw postsResult.error;
      if (profileResult.error) throw profileResult.error;

      const sharedUser = profileResult.data
        ? {
            id: profileResult.data.id,
            name: profileResult.data.name,
            avatarUrl: profileResult.data.avatar_url || DEFAULT_USER.avatarUrl,
          }
        : DEFAULT_USER;
      const likeStates = await invokeSharedApi<{
        likes: Record<string, { count: number; isLiked: boolean }>;
      }>("get-post-likes", { visitorId: getVisitorId() });

      if (recordsResult.data) {
        const mappedRecords: RecordItem[] = recordsResult.data.map((r: RecordRow) => ({
          id: r.id,
          userId: r.user_id,
          title: r.title,
          description: r.description || "",
          coverImageUrl: r.cover_image_url || "",
          startedAt: r.started_at,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
        setRecords(mappedRecords);
      }

      if (postsResult.data) {
        const mappedPosts: PostItem[] = postsResult.data.map((p: PostRow) => ({
          id: p.id,
          recordId: p.record_id,
          userId: p.user_id,
          user: sharedUser,
          content: p.content,
          activityMinutes: p.activity_minutes || 0,
          imageUrls: p.image_urls || [],
          createdAt: p.created_at,
          likesCount: likeStates.likes[p.id]?.count ?? 0,
          isLiked: likeStates.likes[p.id]?.isLiked ?? false,
        }));
        setPosts(mappedPosts);
      }
      setCurrentUser(sharedUser);
      setDataError(null);
    } catch (err) {
      console.error("Supabase data could not be loaded:", err);
      setDataError(
        "共有データを読み込めませんでした。Supabaseの設定とデプロイ状態を確認してください。"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured) {
      fetchSupabaseData();
    }
  }, [fetchSupabaseData]);

  // Supabase Realtime リアルタイム購読（クラウド変更の自動反映）
  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) return;

    const channel = client
      .channel("public-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => {
          fetchSupabaseData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "records" },
        () => {
          fetchSupabaseData();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [fetchSupabaseData]);

  // LocalStorage 保存（キャッシュまたはローカルモード用）
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    } catch (e) {
      console.error(e);
    }
  }, [records]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(posts));
    } catch (e) {
      console.error(e);
    }
  }, [posts]);

  const getRecordById = (id: string) => records.find((r) => r.id === id);

  const getPostsByRecordId = (recordId: string) =>
    posts
      .filter((p) => p.recordId === recordId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getRecordStats = (recordId: string): RecordStats => {
    const record = records.find((r) => r.id === recordId);
    const recordPosts = posts.filter((p) => p.recordId === recordId);

    const currentDay = record ? calculateDay(record.startedAt) : 1;
    const postCount = recordPosts.length;
    const totalMinutes = recordPosts.reduce((acc, curr) => acc + (curr.activityMinutes || 0), 0);

    return {
      currentDay,
      postCount,
      totalMinutes,
    };
  };

  const togglePostLike = async (id: string) => {
    const post = posts.find((item) => item.id === id);
    if (!post) return;

    if (isSupabaseConfigured) {
      const { likesCount, isLiked } = await invokeSharedApi<{
        likesCount: number;
        isLiked: boolean;
      }>("toggle-post-like", { postId: id, visitorId: getVisitorId() });
      setPosts((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, likesCount, isLiked } : item
        )
      );
      return;
    }

    setPosts((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              isLiked: !item.isLiked,
              likesCount: Math.max(0, item.likesCount + (item.isLiked ? -1 : 1)),
            }
          : item
      )
    );
  };

  const addPost = async (
    newPostData: Omit<
      PostItem,
      "id" | "userId" | "user" | "createdAt" | "likesCount" | "isLiked"
    >
  ) => {
    let createdPost: PostItem;
    if (isSupabaseConfigured) {
      const { post } = await invokeSharedApi<{ post: PostRow }>("create-post", newPostData);
      createdPost = {
        id: post.id,
        recordId: post.record_id,
        userId: post.user_id,
        user: currentUser,
        content: post.content,
        activityMinutes: post.activity_minutes,
        imageUrls: post.image_urls,
        createdAt: post.created_at,
        likesCount: 0,
        isLiked: false,
      };
    } else {
      createdPost = {
        ...newPostData,
        id: "post-" + Date.now(),
        userId: currentUser.id,
        user: currentUser,
        createdAt: new Date().toISOString(),
        likesCount: 0,
        isLiked: false,
      };
    }
    setPosts((prev) => [createdPost, ...prev]);
    return createdPost;
  };

  const updatePost = async (
    id: string,
    updates: Partial<Pick<PostItem, "content" | "activityMinutes" | "imageUrls">>
  ) => {
    if (isSupabaseConfigured) {
      await invokeSharedApi("update-post", {
        id,
        ...(updates.content !== undefined ? { content: updates.content } : {}),
        ...(updates.activityMinutes !== undefined
          ? { activityMinutes: updates.activityMinutes }
          : {}),
        ...(updates.imageUrls !== undefined ? { imageUrls: updates.imageUrls } : {}),
      });
    }
    setPosts((prev) => prev.map((post) => (post.id === id ? { ...post, ...updates } : post)));
  };

  const deletePost = async (id: string) => {
    if (isSupabaseConfigured) await invokeSharedApi("delete-post", { id });
    setPosts((prev) => prev.filter((post) => post.id !== id));
  };

  const addRecord = async (
    newRecordData: Omit<RecordItem, "id" | "createdAt" | "updatedAt">
  ) => {
    let createdRecord: RecordItem;
    if (isSupabaseConfigured) {
      const { record } = await invokeSharedApi<{ record: RecordRow }>(
        "create-record",
        newRecordData
      );
      createdRecord = {
        id: record.id,
        userId: record.user_id,
        title: record.title,
        description: record.description,
        coverImageUrl: record.cover_image_url,
        startedAt: record.started_at,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      };
    } else {
      const now = new Date();
      createdRecord = {
        ...newRecordData,
        id: "rec-" + Date.now(),
        userId: currentUser.id,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    }
    setRecords((prev) => [...prev, createdRecord]);
    return createdRecord;
  };

  const updateRecord = async (
    id: string,
    updates: Partial<Pick<RecordItem, "title" | "description" | "coverImageUrl" | "startedAt">>
  ) => {
    if (isSupabaseConfigured) {
      await invokeSharedApi("update-record", {
        id,
        ...(updates.title !== undefined ? { title: updates.title } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        ...(updates.coverImageUrl !== undefined
          ? { coverImageUrl: updates.coverImageUrl }
          : {}),
        ...(updates.startedAt !== undefined ? { startedAt: updates.startedAt } : {}),
      });
    }
    setRecords((prev) =>
      prev.map((record) =>
        record.id === id
          ? { ...record, ...updates, updatedAt: new Date().toISOString() }
          : record
      )
    );
  };

  const deleteRecord = async (id: string) => {
    if (isSupabaseConfigured) await invokeSharedApi("delete-record", { id });
    setRecords((prev) => prev.filter((record) => record.id !== id));
    setPosts((prev) => prev.filter((post) => post.recordId !== id));
  };

  const updateProfile = async (updates: { name?: string; avatarUrl?: string }) => {
    if (isSupabaseConfigured) await invokeSharedApi("update-profile", updates);
    setCurrentUser((user) => ({
      ...user,
      ...(updates.name ? { name: updates.name } : {}),
      ...(updates.avatarUrl ? { avatarUrl: updates.avatarUrl } : {}),
    }));
  };

  return (
    <DataContext.Provider
      value={{
        currentUser,
        records,
        posts,
        isLoading,
        dataError,
        isCloudConnected: isSupabaseConfigured,
        getRecordById,
        getPostsByRecordId,
        getRecordStats,
        togglePostLike,
        addPost,
        updatePost,
        deletePost,
        addRecord,
        updateRecord,
        deleteRecord,
        updateProfile,
        isCreatePostOpen,
        setIsCreatePostOpen,
        selectedRecordIdForPost,
        setSelectedRecordIdForPost,
        refreshData: fetchSupabaseData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
