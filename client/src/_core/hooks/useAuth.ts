import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = { redirectOnUnauthenticated?: boolean; redirectPath?: string };

export function useAuth(_options?: UseAuthOptions) {
  const utils = trpc.useUtils();
  const [sessionReady, setSessionReady] = useState(false);
  const [supabaseUser, setSupabaseUser] = useState<{ id: string; email?: string | null; user_metadata?: { name?: string; full_name?: string } } | null>(null);
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false, enabled: sessionReady });
  const logoutMutation = trpc.auth.logout.useMutation({ onSuccess: () => utils.auth.me.setData(undefined, null) });

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSupabaseUser(data.session?.user ?? null);
      setSessionReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setSupabaseUser(session?.user ?? null);
      setSessionReady(true);
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "SIGNED_OUT") {
        void utils.auth.me.invalidate();
      }
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [utils]);

  const clientUser = useMemo(() => {
    if (!supabaseUser) return null;
    const now = new Date();
    const name = supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? supabaseUser.email?.split("@")[0] ?? "PetFlow";
    return { id: 0, openId: supabaseUser.id, name, email: supabaseUser.email ?? null, loginMethod: "supabase", role: "user" as const, createdAt: now, updatedAt: now, lastSignedIn: now };
  }, [supabaseUser]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      await logoutMutation.mutateAsync().catch((error: unknown) => {
        if (!(error instanceof TRPCClientError) || error.data?.code !== "UNAUTHORIZED") throw error;
      });
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => ({
    user: meQuery.data ?? clientUser,
    loading: !sessionReady || (meQuery.isLoading && !clientUser) || logoutMutation.isPending,
    error: meQuery.error ?? logoutMutation.error ?? null,
    isAuthenticated: Boolean(meQuery.data ?? clientUser),
  }), [clientUser, meQuery.data, meQuery.error, meQuery.isLoading, logoutMutation.error, logoutMutation.isPending, sessionReady]);

  return { ...state, refresh: () => meQuery.refetch(), logout };
}
