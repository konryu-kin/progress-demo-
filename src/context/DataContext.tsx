import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { RecordItem, PostItem, User, RecordStats } from "@/types";
import { calculateDay } from "@/lib/utils";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const DEFAULT_USER: User = {
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
    user: DEFAULT_USER,
    content: "もう少しでレポートが書き終わりそう〜",
    imageUrls: [SAMPLE_NOTE_IMG],
    activityMinutes: 0,
    likesCount: 100000,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "post-2",
    recordId: "rec-2",
    userId: "user-1",
    user: DEFAULT_USER,
    content: "UIデザインの方眼紙レイアウトとボトムナビゲーションを組んでみた！かなりいい感じ",
    imageUrls: [SAMPLE_CODE_IMG],
    activityMinutes: 0,
    likesCount: 1250,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "post-3",
    recordId: "rec-1",
    userId: "user-1",
    user: DEFAULT_USER,
    content: "第2章の構成案がまとまった。今日は参考文献の引用箇所をチェックしていく予定！",
    imageUrls: [SAMPLE_NOTE_IMG],
    activityMinutes: 0,
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
const STORAGE_KEY_USER = "progress_app_user_v1";

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_USER;
  });

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

  // ユーザー情報の同期（Supabase Auth）
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser({
          id: user.id,
          name: user.user_metadata?.name || "guest user",
          avatarUrl: user.user_metadata?.avatar_url || DEFAULT_USER.avatarUrl,
        });
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          name: session.user.user_metadata?.name || "guest user",
          avatarUrl: session.user.user_metadata?.avatar_url || DEFAULT_USER.avatarUrl,
        });
      } else {
        setCurrentUser(DEFAULT_USER);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Supabase からのデータ取得
  const fetchSupabaseData = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      setIsLoading(true);

      const [recordsResult, postsResult] = await Promise.all([
        supabase.from("records").select("*").order("created_at", { ascending: false }),
        supabase.from("posts").select("*, profiles(*)").order("created_at", { ascending: false }),
      ]);

      if (recordsResult.error) throw recordsResult.error;
      if (postsResult.error) throw postsResult.error;

      if (recordsResult.data) {
        const mappedRecords: RecordItem[] = recordsResult.data.map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          title: r.title,
          description: r.description || "",
          coverImageUrl: r.cover_image_url || "",
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
        setRecords(mappedRecords);
      }

      if (postsResult.data) {
        const mappedPosts: PostItem[] = postsResult.data.map((p: any) => ({
          id: p.id,
          recordId: p.record_id,
          userId: p.user_id,
          user: p.profiles
            ? {
                id: p.profiles.id,
                name: p.profiles.name || "guest user",
                avatarUrl: p.profiles.avatar_url || DEFAULT_USER.avatarUrl,
              }
            : DEFAULT_USER,
          content: p.content,
          activityMinutes: p.activity_minutes || 0,
          imageUrls: p.image_urls || [],
          likesCount: p.likes_count || 0,
          createdAt: p.created_at,
        }));
        setPosts(mappedPosts);
      }
    } catch (err) {
      console.warn("Supabase fetch failed, falling back to local storage:", err);
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

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
            user_id: currentUser.id,
            content: newPostData.content,
            activity_minutes: newPostData.activityMinutes,
            image_urls: newPostData.imageUrls,
          })
          .select("*, profiles(*)")
          .single();

        if (error) throw error;

        createdPost = {
          id: data.id,
          recordId: data.record_id,
          userId: data.user_id,
          user: data.profiles
            ? {
                id: data.profiles.id,
                name: data.profiles.name || currentUser.name,
                avatarUrl: data.profiles.avatar_url || currentUser.avatarUrl,
              }
            : currentUser,
          content: data.content,
          activityMinutes: data.activity_minutes || 0,
          imageUrls: data.image_urls || [],
          likesCount: data.likes_count || 0,
          createdAt: data.created_at,
        };
      } catch (err) {
        console.error("Supabase insert post failed, fallback to local:", err);
        createdPost = {
          ...newPostData,
          id: "post-" + Date.now(),
          userId: currentUser.id,
          user: currentUser,
          likesCount: 0,
          createdAt: new Date().toISOString(),
        };
      }
    } else {
      createdPost = {
        ...newPostData,
        id: "post-" + Date.now(),
        userId: currentUser.id,
        user: currentUser,
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
            updated_at: new Date().toISOString(),
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
            user_id: currentUser.id,
            title: newRecordData.title,
            description: newRecordData.description || "",
            cover_image_url: newRecordData.coverImageUrl || "",
          })
          .select()
          .single();

        if (error) throw error;

        createdRecord = {
          id: data.id,
          userId: data.user_id,
          title: data.title,
          description: data.description || "",
          coverImageUrl: data.cover_image_url || "",
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      } catch (err) {
        console.error("Supabase insert record failed, fallback to local:", err);
        createdRecord = {
          ...newRecordData,
          id: "rec-" + Date.now(),
          userId: currentUser.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    } else {
      createdRecord = {
        ...newRecordData,
        id: "rec-" + Date.now(),
        userId: currentUser.id,
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

  const updateProfile = async (updates: { name?: string; avatarUrl?: string }) => {
    const updated = {
      ...currentUser,
      ...(updates.name ? { name: updates.name } : {}),
      ...(updates.avatarUrl ? { avatarUrl: updates.avatarUrl } : {}),
    };
    setCurrentUser(updated);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from("profiles")
          .update({
            ...(updates.name ? { name: updates.name } : {}),
            ...(updates.avatarUrl ? { avatar_url: updates.avatarUrl } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentUser.id);
      } catch (err) {
        console.error("Supabase update profile failed:", err);
      }
    }
  };

  return (
    <DataContext.Provider
      value={{
        currentUser,
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
