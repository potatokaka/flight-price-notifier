import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuthState } from "@/hooks/useAuthState";
import { SiteFooter } from "@/components/SiteFooter";
import { usePageMeta } from "@/hooks/usePageMeta";
import { PlanCard } from "@/components/PlanCard";
import {
  PLANS,
  isPreviewMode,
  listSubscriptions,
  saveSubscription,
  type Plan,
  type Subscription,
} from "@/lib/flightApi";

export default function AppShell() {
  usePageMeta({
    title: "Dashboard | Flight Price Notifier",
    description:
      "你的航線追蹤儀表板 — Flight Price Notifier 會在票價達標時寄信通知你。",
  });
  const { user, loading } = useAuthState();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/signin");
  }, [loading, user, navigate]);

  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    listSubscriptions(user.email)
      .then((rows) => {
        if (!cancelled) setSubs(rows);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "讀取訂閱失敗。");
      });
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  async function handleSave(email: string, plan: Plan, targetPrice: number) {
    const saved = await saveSubscription(email, plan, targetPrice);
    setSubs((prev) => [...prev.filter((s) => s.route !== saved.route), saved]);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <div className="flex min-h-screen flex-col hero-surface">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg btn-primary text-sm font-bold">
              ✈
            </span>
            <span className="text-sm font-semibold tracking-tight sm:text-base">
              Flight Price Notifier
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Sign out / 登出
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-16">
        {loading || !user ? (
          <p className="text-sm text-muted-foreground">載入中…</p>
        ) : (
          <>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Hi {user.email}
            </h1>
            <p className="mt-3 max-w-xl text-base text-muted-foreground">
              選一條航線、設定你願意付的價格。票價一到，我們就寄信到 {user.email}。
            </p>

            {isPreviewMode ? (
              <p className="mt-6 max-w-xl rounded-xl border border-border bg-secondary px-4 py-3 text-sm">
                <span className="font-semibold">預覽模式：</span>
                後端尚未接上，設定只會暫存在這個頁面，重新整理就會消失，也不會寄出通知。
              </p>
            ) : null}

            {loadError ? (
              <p className="mt-6 max-w-xl rounded-xl border border-destructive/40 bg-destructive/15 px-4 py-3 text-sm">
                {loadError}
              </p>
            ) : null}

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {PLANS.map((plan) => (
                <PlanCard
                  key={plan.name}
                  plan={plan}
                  subscription={subs.find((s) => s.route === plan.route) ?? null}
                  onSave={(p, price) => handleSave(user.email ?? "", p, price)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
