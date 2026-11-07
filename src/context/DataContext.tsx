import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { RecordItem, PostItem, User, RecordStats } from "@/types";
import { calculateDay } from "@/lib/utils";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const CURRENT_USER: User = {
  id: "user-1",
  name: "guest user",
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
    createdAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rec-2",
    title: "個人開発 progress",
    description: "趣味の継続プロセスを共有・可視化するSNSアプリ開発",
    coverImageUrl: SAMPLE_CODE_IMG,
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rec-3",
    title: "朝ラン＆筋トレ",
    description: "毎朝5kmランニングと体幹トレーニングの習慣化",
    coverImageUrl: SAMPLE_RUN_IMG,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_POSTS: PostItem[] = [
  {
    id: "post-1",
    recordId: "rec-1",
    userId: "user-1",
    user: CURRENT_USER,
    content: "もう少しでレポートが書き終わりそう〜",
    imageUrls: [SAMPLE_NOTE_IMG],
    activityMinutes: 45,
    likesCount: 100000,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "post-2",
    recordId: "rec-2",
    userId: "user-1",
    user: CURRENT_USER,
    content: "UIデザインの方眼紙レイアウトとボトムナビゲーションを組んでみた！かなりいい感じ",
    imageUrls: [SAMPLE_CODE_IMG],
    activityMinutes: 90,
    likesCount: 1250,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "post-3",
    recordId: "rec-1",
    userId: "user-1",
    user: CURRENT_USER,
    content: "第2章の構成案がまとまった。今日は参考文献の引用箇所をチェックしていく予定！",
    imageUrls: [SAMPLE_NOTE_IMG],
    activityMinutes: 60,
    likesCount: 342,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

interface DataContextType {
  currentUser: User;
  records: RecordItem[];
  posts: PostItem[];
  isLoading: boolean;
  isCloudConnected: boolean;
  getRecordById: (id: string) => RecordItem | undefined;
  getPostsByRecordId: (recordId: string) => PostItem[];
  getRecordStats: (recordId: string) => RecordStats;
  addPost: (newPost: Omit<PostItem, "id" | "userId" | "user" | "createdAt" | "likesCount">) => Promise<PostItem>;
  updatePost: (id: string, updates: Partial<Pick<PostItem, "content" | "activityMinutes" | "imageUrls">>) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  addRecord: (newRecord: Omit<RecordItem, "id" | "createdAt" | "updatedAt">) => Promise<RecordItem>;
  updateRecord: (id: string, updates: Partial<Pick<RecordItem, "title" | "description" | "coverImageUrl">>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  isCreatePostOpen: boolean;
  setIsCreatePostOpen: (open: boolean) => void;
  selectedRecordIdForPost: string | null;
  setSelectedRecordIdForPost: (recordId: string | null) => void;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY_RECORDS = "progress_app_records_v1";
const STORAGE_KEY_POSTS = "progress_app_posts_v1";

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [records, setRecords] = useState<RecordItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_RECORDS;
  });

  const [posts, setPosts] = useState<PostItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POSTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_POSTS;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [selectedRecordIdForPost, setSelectedRecordIdForPost] = useState<string | null>(null);

  // Supabase からのデータ取得
  const fetchSupabaseData = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      setIsLoading(true);
      const { data: recData, error: recError } = await supabase
        .from("records")
        .select("*")
        .order("created_at", { ascending: false });

      if (recError) throw recError;

      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (postError) throw postError;

      if (recData) {
        const mappedRecords: RecordItem[] = recData.map((r: any) => ({
          id: r.id,
          title: r.title,
          description: r.description || "",
          coverImageUrl: r.cover_image_url || "",
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
        setRecords(mappedRecords);
      }

      if (postData) {
        const mappedPosts: PostItem[] = postData.map((p: any) => ({
          id: p.id,
          recordId: p.record_id,
          userId: p.user_id || CURRENT_USER.id,
          user: CURRENT_USER,
          content: p.content,
          activityMinutes: p.activity_minutes || 0,
          imageUrls: p.image_urls || [],
          likesCount: p.likes_count || 0,
          createdAt: p.created_at,
        }));
        setPosts(mappedPosts);
      }
    } catch (err) {
      console.warn("Supabase fetch failed, falling back to local data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured) {
      fetchSupabaseData();
    }
  }, [fetchSupabaseData]);

  // LocalStorage 保存（ローカルモード時またはオフラインキャッシュ）
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

    const currentDay = record ? calculateDay(record.createdAt) : 1;
    const postCount = recordPosts.length;
    const totalMinutes = recordPosts.reduce((acc, curr) => acc + (curr.activityMinutes || 0), 0);

    return {
      currentDay,
      postCount,
      totalMinutes,
    };
  };

  const addPost = async (
    newPostData: Omit<PostItem, "id" | "userId" | "user" | "createdAt" | "likesCount">
  ) => {
    let createdPost: PostItem;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("posts")
          .insert({
            record_id: newPostData.recordId,
            content: newPostData.content,
            activity_minutes: newPostData.activityMinutes,
            image_urls: newPostData.imageUrls,
          })
          .select()
          .single();

        if (error) throw error;

        createdPost = {
          id: data.id,
          recordId: data.record_id,
          userId: data.user_id || CURRENT_USER.id,
          user: CURRENT_USER,
          content: data.content,
          activityMinutes: data.activity_minutes || 0,
          imageUrls: data.image_urls || [],
          likesCount: data.likes_count || 0,
          createdAt: data.created_at,
        };
      } catch (err) {
        console.error("Supabase insert post failed, using local ID:", err);
        createdPost = {
          ...newPostData,
          id: "post-" + Date.now(),
          userId: CURRENT_USER.id,
          user: CURRENT_USER,
          likesCount: 0,
          createdAt: new Date().toISOString(),
        };
      }
    } else {
      createdPost = {
        ...newPostData,
        id: "post-" + Date.now(),
        userId: CURRENT_USER.id,
        user: CURRENT_USER,
        likesCount: 0,
        createdAt: new Date().toISOString(),
      };
    }

    setPosts((prev) => [createdPost, ...prev]);

    if (newPostData.imageUrls && newPostData.imageUrls.length > 0) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === newPostData.recordId
            ? { ...r, coverImageUrl: newPostData.imageUrls[0], updatedAt: new Date().toISOString() }
            : r
        )
      );
    }

    return createdPost;
  };

  const updatePost = async (
    id: string,
    updates: Partial<Pick<PostItem, "content" | "activityMinutes" | "imageUrls">>
  ) => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from("posts")
          .update({
            content: updates.content,
            activity_minutes: updates.activityMinutes,
            image_urls: updates.imageUrls,
          })
          .eq("id", id);
      } catch (err) {
        console.error("Supabase update post failed:", err);
      }
    }
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deletePost = async (id: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("posts").delete().eq("id", id);
      } catch (err) {
        console.error("Supabase delete post failed:", err);
      }
    }
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const addRecord = async (newRecordData: Omit<RecordItem, "id" | "createdAt" | "updatedAt">) => {
    let createdRecord: RecordItem;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("records")
          .insert({
            title: newRecordData.title,
            description: newRecordData.description || "",
            cover_image_url: newRecordData.coverImageUrl || "",
          })
          .select()
          .single();

        if (error) throw error;

        createdRecord = {
          id: data.id,
          title: data.title,
          description: data.description || "",
          coverImageUrl: data.cover_image_url || "",
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      } catch (err) {
        console.error("Supabase insert record failed, using local ID:", err);
        createdRecord = {
          ...newRecordData,
          id: "rec-" + Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    } else {
      createdRecord = {
        ...newRecordData,
        id: "rec-" + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    setRecords((prev) => [...prev, createdRecord]);
    return createdRecord;
  };

  const updateRecord = async (
    id: string,
    updates: Partial<Pick<RecordItem, "title" | "description" | "coverImageUrl">>
  ) => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from("records")
          .update({
            title: updates.title,
            description: updates.description,
            cover_image_url: updates.coverImageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
      } catch (err) {
        console.error("Supabase update record failed:", err);
      }
    }
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r))
    );
  };

  const deleteRecord = async (id: string) => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("records").delete().eq("id", id);
      } catch (err) {
        console.error("Supabase delete record failed:", err);
      }
    }
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setPosts((prev) => prev.filter((p) => p.recordId !== id));
  };

  return (
    <DataContext.Provider
      value={{
        currentUser: CURRENT_USER,
        records,
        posts,
        isLoading,
        isCloudConnected: isSupabaseConfigured,
        getRecordById,
        getPostsByRecordId,
        getRecordStats,
        addPost,
        updatePost,
        deletePost,
        addRecord,
        updateRecord,
        deleteRecord,
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
