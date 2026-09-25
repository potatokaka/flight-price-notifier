import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const navigate = useNavigate();
  const isSignUp = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = isSignUp
      ? await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    setSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (!result.data.session) {
      setError("請先到信箱點擊確認連結，再回來登入。");
      return;
    }

    navigate({ to: "/app" });
  }

  return (
    <div className="mx-auto w-full max-w-md card-surface rounded-2xl border border-border/60 p-7">
      <h1 className="text-2xl font-semibold tracking-tight">
        {isSignUp ? "建立帳號 / Sign up" : "登入 / Sign in"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {isSignUp
          ? "用 email 註冊，開始追蹤你的機票目標價。"
          : "歡迎回來，繼續追蹤你的航線。"}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-input bg-secondary px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            密碼 / Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-input bg-secondary px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl btn-primary px-4 py-2.5 text-sm font-semibold hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? "處理中…" : isSignUp ? "註冊 / Sign up" : "登入 / Sign in"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {isSignUp ? (
          <>
            已經有帳號？{" "}
            <Link to="/signin" className="font-medium text-primary-glow hover:underline">
              登入
            </Link>
          </>
        ) : (
          <>
            還沒有帳號？{" "}
            <Link to="/signup" className="font-medium text-primary-glow hover:underline">
              註冊
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
