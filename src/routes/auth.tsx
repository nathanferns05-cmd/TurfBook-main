import { PasswordChecklist } from "@/components/PasswordChecklist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { roleForCurrentUser } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { registerAccount } from "@/lib/accounts.functions";
import { isStrongPassword, PASSWORD_ERROR } from "@/lib/password";
import { isIndianPhone, normalizeIndianPhone, PHONE_ERROR } from "@/lib/phone";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Role = "player" | "admin";
type Mode = "signin" | "otp" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    role: (search.role === "admin" ? "admin" : "player") as Role,
    mode: (["signin", "otp", "signup", "forgot"].includes(String(search.mode))
      ? String(search.mode)
      : "signin") as Mode,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — TurfBook" },
      {
        name: "description",
        content: "Sign in with your password or a one-time code, or create your TurfBook player or turf owner account.",
      },
      { property: "og:title", content: "Sign in — TurfBook" },
      { property: "og:description", content: "Access your TurfBook player or turf owner account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { role, mode } = Route.useSearch();
  const navigate = useNavigate();
  const register = useServerFn(registerAccount);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [busy, setBusy] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const setMode = (next: Mode) => {
    setOtpSent(false);
    setOtp("");
    navigate({ to: "/auth", search: { role, mode: next } });
  };

  /** Only lets the user in through the login matching their account type. */
  const goHome = async () => {
    const actual = (await roleForCurrentUser()) ?? role;
    if (actual !== role) {
      await supabase.auth.signOut();
      toast.error(
        actual === "admin"
          ? "This is a turf owner account. Please use the Turf owner login."
          : "This is a player account. Please use the Player login.",
      );
      return false;
    }
    navigate({ to: actual === "admin" ? "/admin" : "/player", replace: true });
    return true;
  };

  const sendOtp = async (createUser = false) => {
    const target = email.trim().toLowerCase();
    if (!target) {
      toast.error("Enter your email first.");
      return false;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: target,
      options: { shouldCreateUser: createUser },
    });
    if (error) {
      toast.error(
        /signups not allowed|not found/i.test(error.message)
          ? "No account with this email. Create one first."
          : error.message,
      );
      return false;
    }
    setOtpSent(true);
    setOtp("");
    setCooldown(45);
    toast.success(`6-digit code sent to ${target}`);
    return true;
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp,
      type: "email",
    });
    setBusy(false);
    if (error) {
      toast.error(/expired/i.test(error.message) ? "Code expired. Send a new one." : "Wrong code. Try again.");
      return;
    }
    if (await goHome()) {
      toast.success("Verified!");
    } else {
      setOtpSent(false);
      setOtp("");
    }
  };

  const handleSendSignInOtp = async () => {
    setBusy(true);
    await sendOtp(false);
    setBusy(false);
  };

  const handlePasswordSignIn = async () => {
    if (!email.trim() || !password) {
      toast.error("Enter your email and password.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (error) {
      toast.error(
        /invalid login credentials/i.test(error.message)
          ? "Wrong email or password. Forgot it? Sign in with OTP instead."
          : error.message,
      );
      return;
    }
    await goHome();
  };

  const handleSignUp = async () => {
    if (!fullName.trim() || !phone.trim() || !email.trim() || !password) {
      toast.error("Please fill every field.");
      return;
    }
    if (!isIndianPhone(phone)) {
      toast.error(PHONE_ERROR);
      return;
    }
    if (!isStrongPassword(password)) {
      toast.error(PASSWORD_ERROR);
      return;
    }
    if (role === "admin" && !adminCode.trim()) {
      toast.error("Admin code is required for a turf owner account.");
      return;
    }
    setBusy(true);
    try {
      await register({
        data: {
          fullName: fullName.trim(),
          phone: normalizeIndianPhone(phone),
          email: email.trim().toLowerCase(),
          password,
          role,
          adminCode: adminCode.trim(),
        },
      });
      await sendOtp(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async () => {
    if (!email.trim()) {
      toast.error("Enter your email first.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Reset link sent. Check your inbox and set a new password.");
  };

  return (
    <main className="min-h-screen px-6 pb-16 pt-10">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Back
      </Link>

      <div className="mt-8">
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
            role === "admin" ? "bg-accent/15 text-accent" : "bg-primary/15 text-primary"
          }`}
        >
          {role === "admin" ? "Turf owner" : "Player"}
        </span>
        <h1 className="mt-3 text-4xl leading-none">
          {otpSent
            ? "VERIFY EMAIL"
            : mode === "signup"
              ? "CREATE ACCOUNT"
              : mode === "forgot"
                ? "RESET PASSWORD"
                : "WELCOME BACK"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {otpSent
            ? `We sent a 6-digit code to ${email.trim().toLowerCase()}`
            : mode === "signup"
              ? role === "admin"
                ? "Turf owners need a valid admin code to register."
                : "Book your first slot in under a minute."
              : mode === "forgot"
                ? "We'll email you a link to set a new password."
                : mode === "otp"
                  ? "Enter your email — we'll send a one-time code."
                  : "Sign in with your email and password."}
        </p>
      </div>

      <div className="card-surface mt-6 space-y-4 p-5">
        {otpSent ? (
          <>
            <div className="flex justify-center pt-1">
              <MailCheck className="size-10 text-primary" />
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button className="h-12 w-full text-base font-semibold" disabled={busy} onClick={verifyOtp}>
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              Verify & continue
            </Button>
            <div className="flex flex-col items-center gap-1 text-sm">
              <button
                className="text-primary disabled:text-muted-foreground"
                disabled={cooldown > 0 || busy}
                onClick={() => sendOtp(false)}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
              <button
                className="text-muted-foreground underline"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                }}
              >
                Change email
              </button>
            </div>
          </>
        ) : (
          <>
            {mode === "signup" && (
              <>
                <Field label="Full name">
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Rohit Sharma" />
                </Field>
                <Field label="Mobile number (India)">
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                      +91
                    </span>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ""))}
                      inputMode="tel"
                      autoComplete="tel-national"
                      maxLength={16}
                      placeholder="98XXXXXXXX"
                      className="pl-12"
                      aria-invalid={phone.trim() !== "" && !isIndianPhone(phone)}
                    />
                  </div>
                  {phone.trim() !== "" && !isIndianPhone(phone) && (
                    <p className="text-xs text-destructive">{PHONE_ERROR}</p>
                  )}
                </Field>
              </>
            )}

            <Field label="Email">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@email.com"
              />
            </Field>

            {mode === "signup" && (
              <Field label="Password">
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                />
                <PasswordChecklist password={password} />
              </Field>
            )}

            {mode === "signin" && (
              <Field label="Password">
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                />
              </Field>
            )}

            {mode === "signup" && role === "admin" && (
              <Field label="Admin code">
                <Input
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value.toUpperCase())}
                  placeholder="Enter your code"
                />
              </Field>
            )}

            <Button
              className="h-12 w-full text-base font-semibold"
              disabled={busy}
              onClick={
                mode === "signup"
                  ? handleSignUp
                  : mode === "forgot"
                    ? handleForgot
                    : mode === "otp"
                      ? handleSendSignInOtp
                      : handlePasswordSignIn
              }
            >
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              {mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset link"
                  : mode === "otp"
                    ? "Send OTP"
                    : "Sign in"}
            </Button>

            <div className="flex flex-col items-center gap-1 pt-1 text-sm">
              {mode === "signin" && (
                <>
                  <button className="text-muted-foreground underline" onClick={() => setMode("otp")}>
                    Forgot password? Sign in with OTP
                  </button>
                  <button className="text-primary" onClick={() => setMode("signup")}>
                    Create a new account
                  </button>
                </>
              )}
              {mode === "otp" && (
                <button className="text-muted-foreground underline" onClick={() => setMode("forgot")}>
                  Reset password by email instead
                </button>
              )}
              {mode !== "signin" && (
                <button className="text-primary" onClick={() => setMode("signin")}>
                  Back to password sign in
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function PasswordInput({
  value,
  onChange,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder="••••••••"
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}