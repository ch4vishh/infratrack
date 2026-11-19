import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  avatar_url?: string | null;
};

type AuthValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  updateAvatar: (url: string | null) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  session: null,
  user: null,
  profile: null,
  avatarUrl: null,
  isAdmin: false,
  loading: true,
  refresh: async () => {},
  updateAvatar: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadUserData(userId: string | undefined) {
    if (!userId) {
      setProfile(null);
      setAvatarUrl(null);
      setIsAdmin(false);
      return;
    }
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    let localAvatar: string | null = null;
    try {
      localAvatar = localStorage.getItem("infratrack_avatar_" + userId);
    } catch {
      // ignore
    }
    const effectiveAvatar =
      localAvatar ||
      (prof as Profile | null)?.avatar_url ||
      (session?.user?.user_metadata?.avatar_url as string | undefined) ||
      null;

    setProfile(prof ? { ...(prof as Profile), avatar_url: effectiveAvatar } : null);
    setAvatarUrl(effectiveAvatar);
    setIsAdmin(!!roles?.some((r) => r.role === "admin"));
  }

  const updateAvatar = async (url: string | null) => {
    const userId = session?.user?.id;
    if (!userId) return;
    try {
      if (url) {
        localStorage.setItem("infratrack_avatar_" + userId, url);
      } else {
        localStorage.removeItem("infratrack_avatar_" + userId);
      }
    } catch {
      // ignore
    }
    setAvatarUrl(url);
    setProfile((prev) => (prev ? { ...prev, avatar_url: url } : null));

    try {
      await supabase.auth.updateUser({
        data: { avatar_url: url },
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // Never call other supabase APIs directly inside the callback.
      setTimeout(() => void loadUserData(next?.user?.id), 0);
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadUserData(data.session?.user?.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthValue = {
    session,
    user: session?.user ?? null,
    profile,
    avatarUrl,
    isAdmin,
    loading,
    refresh: () => loadUserData(session?.user?.id),
    updateAvatar,
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
      setAvatarUrl(null);
      setIsAdmin(false);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
