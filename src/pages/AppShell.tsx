import { useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuthState } from "@/hooks/useAuthState";
import { SiteFooter } from "@/components/SiteFooter";
import { usePageMeta } from "@/hooks/usePageMeta";

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
            <div className="mt-8 card-surface rounded-2xl border border-border/60 p-8">
              <p className="text-base leading-relaxed">
                你的航線追蹤儀表板即將上線 — 下一個里程碑會加上訂閱航線的功能。
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Your dashboard is coming soon. Route-subscription will be added in the
                next milestone.
              </p>
            </div>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
