import { isStrongPassword, PASSWORD_ERROR } from "@/lib/password";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const registerAccount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(2).max(80),
        phone: z.string().trim().min(7).max(20),
        email: z.string().trim().email().max(160),
        password: z.string().max(72).refine(isStrongPassword, PASSWORD_ERROR),
        role: z.enum(["player", "admin"]),
        adminCode: z.string().trim().max(64).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.role === "admin") {
      const code = (data.adminCode ?? "").toUpperCase();
      if (!code) throw new Error("Admin code is required for a turf owner account.");
      const { data: match, error } = await supabaseAdmin
        .from("admin_codes")
        .select("code")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw new Error("Could not verify the admin code. Please try again.");
      if (!match) throw new Error("Invalid admin code. Contact TurfBook support to get one.");
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, phone: data.phone },
    });

    if (createError || !created?.user) {
      const message = createError?.message ?? "Could not create the account.";
      throw new Error(
        /already/i.test(message) ? "An account with this email already exists." : message,
      );
    }

    const userId = created.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      full_name: data.fullName,
      phone: data.phone,
      email: data.email,
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Could not save your details. Please try again.");
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });
    if (roleError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Could not set up your account type. Please try again.");
    }

    return { ok: true as const, role: data.role };
  });