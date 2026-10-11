import { useState, type FormEvent } from "react";
import type { Plan, Subscription } from "@/lib/flightApi";

const twd = new Intl.NumberFormat("zh-TW");

interface PlanCardProps {
  plan: Plan;
  subscription: Subscription | null;
  onSave: (plan: Plan, targetPrice: number) => Promise<void>;
}

export function PlanCard({ plan, subscription, onSave }: PlanCardProps) {
  const subscribed = subscription !== null;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const showForm = !subscribed || editing;
  const inputId = `target-${plan.name}`;

  function startEdit() {
    setValue(subscription ? String(subscription.target_price) : "");
    setError(null);
    setEditing(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const price = Number(value);
    if (!Number.isInteger(price) || price <= 0) {
      setError("請輸入大於 0 的整數金額。");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(plan, price);
      setEditing(false);
      setValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗，請稍後再試。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="card-surface flex flex-col rounded-2xl border border-border/60 p-6 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{plan.label}</h2>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {plan.route} · 單程
          </p>
        </div>
        {subscribed ? (
          <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            已訂閱
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        近期最低約 <span className="font-semibold text-foreground">NT${twd.format(plan.referencePrice)}</span>
      </p>

      {subscription && !editing ? (
        <div className="mt-5 flex flex-1 flex-col justify-end gap-4">
          <div className="rounded-xl bg-secondary px-4 py-3">
            <p className="text-xs text-muted-foreground">你的目標價</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums">
              NT${twd.format(subscription.target_price)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">票價低於或等於這個金額時，我們會寄信通知你。</p>
          </div>
          <button
            type="button"
            onClick={startEdit}
            className="w-full rounded-xl border border-input px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
          >
            更新目標價
          </button>
        </div>
      ) : null}

      {showForm ? (
        <form onSubmit={handleSubmit} className="mt-5 flex flex-1 flex-col justify-end gap-3" noValidate>
          <div className="space-y-1.5">
            <label htmlFor={inputId} className="text-sm font-medium">
              目標價（新台幣）
            </label>
            <div className="flex items-center rounded-xl border border-input bg-secondary focus-within:ring-2 focus-within:ring-ring">
              <span className="pl-4 text-sm text-muted-foreground">NT$</span>
              <input
                id={inputId}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={String(Math.round(plan.referencePrice * 0.9))}
                className="w-full min-w-0 bg-transparent px-2 py-2.5 text-sm tabular-nums outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            {editing ? (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-xl border border-input px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
              >
                取消
              </button>
            ) : null}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl btn-primary px-4 py-2.5 text-sm font-semibold hover:brightness-110 disabled:opacity-60"
            >
              {saving ? "儲存中…" : editing ? "儲存目標價" : "開始追蹤"}
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}
