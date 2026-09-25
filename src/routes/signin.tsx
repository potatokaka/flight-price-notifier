import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign in | Flight Price Notifier" },
      {
        name: "description",
        content: "登入 Flight Price Notifier，管理你的航線與目標價提醒。",
      },
      { property: "og:title", content: "Sign in | Flight Price Notifier" },
      {
        property: "og:description",
        content: "登入 Flight Price Notifier，管理你的航線與目標價提醒。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
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
