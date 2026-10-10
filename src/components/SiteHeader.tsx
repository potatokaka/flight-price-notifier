import { Link } from "react-router";
import { useAuthState } from "@/hooks/useAuthState";

export function SiteHeader() {
  const { user } = useAuthState();

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg btn-primary text-sm font-bold">
            ✈
          </span>
          <span className="text-sm font-semibold tracking-tight sm:text-base">
            Flight Price Notifier
          </span>
        </Link>

        {user ? (
          <Link
            to="/app"
            className="rounded-full btn-primary px-4 py-2 text-sm font-semibold hover:brightness-110"
          >
            前往儀表板
          </Link>
        ) : (
          <Link
            to="/signin"
            className="rounded-full btn-primary px-4 py-2 text-sm font-semibold hover:brightness-110"
          >
            Sign in / 登入
          </Link>
        )}
      </div>
    </header>
  );
}
