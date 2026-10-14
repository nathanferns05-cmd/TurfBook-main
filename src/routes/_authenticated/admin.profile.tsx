import { Button } from "@/components/ui/button";
import { useAuthUser, useMyProfile } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Mail, Phone, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/profile")({
  component: AdminProfile,
});

function AdminProfile() {
  const { data: user } = useAuthUser();
  const { data: profile } = useMyProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  const initial = (profile?.full_name || "A").charAt(0).toUpperCase();

  return (
    <main className="px-4 py-6">
      <h1 className="text-3xl leading-none">OWNER PROFILE</h1>

      <div className="card-surface mt-5 flex items-center gap-4 p-5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xl font-bold text-primary">
          {initial}
        </span>
        <div>
          <h2 className="font-display text-2xl leading-none">
            {profile?.full_name || "Turf Owner"}
          </h2>
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
            <ShieldCheck className="size-3.5" /> TURF OWNER
          </span>
        </div>
      </div>

      <div className="card-surface mt-3 space-y-3 p-5 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="size-4" /> {profile?.email || user?.email || "—"}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="size-4" /> {profile?.phone || "—"}
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