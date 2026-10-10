import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function SignInPage() {
  usePageMeta({
    title: "Sign in | Flight Price Notifier",
    description:
      "登入 Flight Price Notifier，管理你的航線與目標價提醒。",
  });
  return (
    <div className="flex min-h-screen flex-col hero-surface">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <AuthForm mode="signin" />
      </main>
      <SiteFooter />
    </div>
  );
}
