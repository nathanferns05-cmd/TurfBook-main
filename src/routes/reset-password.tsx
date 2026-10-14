import { PasswordChecklist } from "@/components/PasswordChecklist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { roleForCurrentUser } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { isStrongPassword, PASSWORD_ERROR } from "@/lib/password";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — TurfBook" },
      { name: "description", content: "Choose a new password for your TurfBook account." },
      { property: "og:title", content: "Set a new password — TurfBook" },
      { property: "og:description", content: "Choose a new password for your TurfBook account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async () => {
    if (!isStrongPassword(password)) {
      toast.error(PASSWORD_ERROR);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    const role = await roleForCurrentUser();
    navigate({ to: role === "admin" ? "/admin" : "/player" });
  };

  return (
    <main className="flex min-h-screen items-center px-6">
      <div className="card-surface w-full space-y-4 p-6">
        <h1 className="text-3xl leading-none">NEW PASSWORD</h1>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <PasswordChecklist password={password} />
        </div>
        <Button className="h-12 w-full font-semibold" disabled={busy} onClick={submit}>
          Update password
        </Button>
      </div>
    </main>
  );
}