import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function SignUpPage() {
  usePageMeta({
    title: "Sign up | Flight Price Notifier",
    description:
      "註冊 Flight Price Notifier，設定目標價，機票降價就收到 email 通知。",
  });
  return (
    <div className="flex min-h-screen flex-col hero-surface">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <AuthForm mode="signup" />
      </main>
      <SiteFooter />
    </div>
  );
}
