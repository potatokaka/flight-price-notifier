import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up | Flight Price Notifier" },
      {
        name: "description",
        content: "註冊 Flight Price Notifier，設定目標價，機票降價就收到 email 通知。",
      },
      { property: "og:title", content: "Sign up | Flight Price Notifier" },
      {
        property: "og:description",
        content: "註冊 Flight Price Notifier，設定目標價，機票降價就收到 email 通知。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
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
