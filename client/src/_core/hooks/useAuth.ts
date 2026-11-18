import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = { redirectOnUnauthenticated?: boolean; redirectPath?: string };

export function useAuth(_options?: UseAuthOptions) {
  const utils = trpc.useUtils();
  const [sessionReady, setSessionReady] = useState(false);
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false, enabled: sessionReady });
  const logoutMutation = trpc.auth.logout.useMutation({ onSuccess: () => utils.auth.me.setData(undefined, null) });

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().finally(() => { if (mounted) setSessionReady(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      setSessionReady(true);
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "SIGNED_OUT") {
        void utils.auth.me.invalidate();
      }
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [utils]);

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
    user: meQuery.data ?? null,
    loading: !sessionReady || meQuery.isLoading || logoutMutation.isPending,
    error: meQuery.error ?? logoutMutation.error ?? null,
    isAuthenticated: Boolean(meQuery.data),
  }), [meQuery.data, meQuery.error, meQuery.isLoading, logoutMutation.error, logoutMutation.isPending, sessionReady]);

  return { ...state, refresh: () => meQuery.refetch(), logout };
}
