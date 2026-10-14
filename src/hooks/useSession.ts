import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function useAuthUser() {
  return useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user ?? null,
    staleTime: 60_000,
  });
}

export function useMyRole() {
  const { data: user } = useAuthUser();
  return useQuery({
    queryKey: ["auth", "role", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .maybeSingle();
      return (data?.role ?? "player") as "player" | "admin";
    },
    staleTime: 5 * 60_000,
  });
}

export function useMyProfile() {
  const { data: user } = useAuthUser();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });
}

export async function roleForCurrentUser() {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle();
  return (data?.role ?? "player") as "player" | "admin";
}