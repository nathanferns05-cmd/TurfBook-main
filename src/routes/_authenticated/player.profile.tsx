import { Button } from "@/components/ui/button";
import { useAuthUser, useMyProfile } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { rupees, todayISO } from "@/lib/turf";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Mail, Phone, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/player/profile")({
  component: PlayerProfile,
});

function PlayerProfile() {
  const { data: user } = useAuthUser();
  const { data: profile } = useMyProfile();
  const navigate = useNavigate();

  const { data: bookings } = useQuery({
    queryKey: ["my-bookings-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("status, booking_date, amount_paid")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  const total = bookings?.length ?? 0;
  const today = todayISO();
  const active =
    bookings?.filter((b) => b.status === "confirmed" && b.booking_date >= today).length ?? 0;
  const paid = bookings?.reduce((sum, b) => sum + Number(b.amount_paid || 0), 0) ?? 0;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  const initial = (profile?.full_name || "P").charAt(0).toUpperCase();

  return (
    <main className="px-4 py-6">
      <h1 className="text-3xl leading-none">MY PROFILE</h1>

      <div className="card-surface mt-5 flex items-center gap-4 p-5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xl font-bold text-primary">
          {initial}
        </span>
        <div>
          <h2 className="font-display text-2xl leading-none">
            {profile?.full_name || "Player"}
          </h2>
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
            <User className="size-3.5" /> PLAYER
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 px-1 text-sm text-muted-foreground">
        <Mail className="size-4" /> {profile?.email || user?.email || "—"}
        <span className="mx-1">·</span>
        <Phone className="size-4" /> {profile?.phone || "—"}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="card-surface p-4 text-center">
          <p className="font-display text-2xl leading-none text-primary">{total}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Bookings
          </p>
        </div>
        <div className="card-surface p-4 text-center">
          <p className="font-display text-2xl leading-none text-primary">{active}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Active
          </p>
        </div>
        <div className="card-surface p-4 text-center">
          <p className="font-display text-2xl leading-none text-primary">{rupees(paid)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Paid
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        className="mt-5 h-12 w-full gap-2 text-destructive"
        onClick={handleSignOut}
      >
        <LogOut className="size-4" /> Sign out
      </Button>
    </main>
  );
}