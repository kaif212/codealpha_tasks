import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Taskboard" },
      { name: "description", content: "Sign in or create your Taskboard account." },
      { property: "og:title", content: "Sign in — Taskboard" },
      { property: "og:description", content: "Sign in or create your Taskboard account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate({ to: "/dashboard" });
    }
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    if (!cleanEmail) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (cleanPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    setBusy(true);

    if (mode === "up") {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: name.trim() },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("weak_password") || error.message.toLowerCase().includes("easy to guess")) {
          toast.error("Password is too weak or common. Please use a stronger password with letters, numbers, and symbols.");
        } else {
          toast.error(error.message);
        }
        setBusy(false);
        return;
      }

      // Supabase returns user with empty identities when email is already registered
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        toast.error("An account with this email already exists. Please sign in instead.");
        setMode("in");
        setBusy(false);
        return;
      }

      // If Supabase auto-confirmed the email (session is returned immediately)
      if (data?.session) {
        toast.success("Account created successfully! Redirecting...");
        navigate({ to: "/dashboard" });
        setBusy(false);
        return;
      }

      // Supabase requires email confirmation before login
      setUnconfirmedEmail(cleanEmail);
      toast.success("Confirmation email sent! Please verify your email before logging in.", { duration: 8000 });
      setMode("in");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("email not confirmed") || (error as { code?: string }).code === "email_not_confirmed") {
          setUnconfirmedEmail(cleanEmail);
          toast.error("Email not confirmed. Please check your inbox to confirm your account, or resend the link below.", {
            duration: 8000,
          });
        } else if (msg.includes("invalid login credentials")) {
          setUnconfirmedEmail(cleanEmail);
          toast.error(
            "Invalid email or password. If you just registered, make sure you confirmed the verification email sent to your inbox.",
            { duration: 8000 }
          );
        } else {
          toast.error(error.message);
        }
        setBusy(false);
        return;
      }

      if (data?.session) {
        toast.success("Signed in successfully!");
        navigate({ to: "/dashboard" });
      }
    }
    setBusy(false);
  };

  const handleResendConfirmation = async () => {
    const targetEmail = (unconfirmedEmail || email).trim().toLowerCase();
    if (!targetEmail) {
      toast.error("Please enter your email address first.");
      return;
    }

    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: targetEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setResending(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Verification link sent to ${targetEmail}! Please check your Inbox and Spam folder.`, {
        duration: 8000,
      });
    }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth`,
    });
    if (r.error) {
      toast.error(String(r.error.message ?? r.error));
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="font-display text-3xl font-bold">
            {mode === "in" ? "Welcome back" : "Create account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "in"
              ? "Sign in with your email and password"
              : "Enter your details to create a new account"}
          </p>

          {/* Email Confirmation Notice Banner */}
          {unconfirmedEmail && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-500">Email Verification Required</p>
                  <p className="text-xs text-muted-foreground">
                    Supabase sends a confirmation link to <span className="font-semibold text-foreground">{unconfirmedEmail}</span>.
                    You must click the link in your email before logging in.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Don't see it? Check your <strong>Spam/Junk</strong> folder or click below to resend.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-8 text-xs"
                    onClick={handleResendConfirmation}
                    disabled={resending}
                  >
                    <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`} />
                    {resending ? "Sending..." : "Resend confirmation email"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "up" && (
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "up" && (
                  <span className="text-xs text-muted-foreground">Min. 6 chars</span>
                )}
              </div>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete={mode === "in" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mode === "up" && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Use a strong password (avoid simple words or sequences like 123456).
                </p>
              )}
            </div>

            <Button className="w-full" disabled={busy}>
              {busy ? "Please wait..." : mode === "in" ? "Sign in" : "Sign up"}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={google}>
            Continue with Google
          </Button>

          <button
            type="button"
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              setMode(mode === "in" ? "up" : "in");
              setUnconfirmedEmail(null);
            }}
          >
            {mode === "in" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
