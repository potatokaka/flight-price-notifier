import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flight Price Notifier 機票降價通知" },
      {
        name: "description",
        content:
          "設定台北出發的航線與目標價，票價一降到你的預算，我們就寄 email 通知你。",
      },
      { property: "og:title", content: "Flight Price Notifier 機票降價通知" },
      {
        property: "og:description",
        content:
          "設定台北出發的航線與目標價，票價一降到你的預算，我們就寄 email 通知你。",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    title: "盯緊熱門航線",
    subtitle: "Always-on route watching",
    body: "持續監控台北出發的熱門航線（東京、首爾），自動抓最低票價。",
  },
  {
    title: "達標自動通知",
    subtitle: "Target-price email alerts",
    body: "低於你設定的目標價，就寄 email 提醒你，附上立即訂購連結。",
  },
  {
    title: "隨時取消",
    subtitle: "Cancel anytime",
    body: "月訂閱制，不想用隨時停，沒有綁約。",
  },
];

function Landing() {
  return (
    <div className="flex min-h-screen flex-col hero-surface">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-5 pb-24 pt-24 text-center sm:pt-32">
          <Reveal>
            <span className="inline-flex rounded-full border border-border bg-secondary/60 px-4 py-1.5 text-xs font-medium text-muted-foreground">
              台北出發 · 東京 / 首爾熱門航線
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-7xl">
              <span className="gradient-text">Flight Price Notifier</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-6 max-w-2xl text-xl font-medium sm:text-2xl">
              設定航線與目標價，機票降價就通知你
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
              Set a route and a target price — we email you when the fare drops.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/signup"
                className="rounded-full btn-primary px-6 py-3 text-sm font-semibold hover:brightness-110"
              >
                開始使用 / Get started
              </Link>
              <Link
                to="/signin"
                className="rounded-full border border-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-accent"
              >
                Sign in / 登入
              </Link>
            </div>
          </Reveal>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-28">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 120}>
                <article className="h-full card-surface rounded-2xl border border-border/60 p-7 transition-transform duration-300 hover:-translate-y-1">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {feature.title}
                  </h2>
                  <p className="mt-1 text-sm text-primary-glow">{feature.subtitle}</p>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
