import { PageHeader } from "@/components/page-header";
import { requireContext } from "@/lib/auth/session";
import { planLabel } from "@/lib/format";
import { usagePercent } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Plan" };

export default async function BillingPage() {
  const context = await requireContext();
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plan_definitions")
    .select("tier, name, asset_limit, description")
    .order("asset_limit");

  const percent = usagePercent(context.assetCount, context.assetLimit);

  return (
    <div>
      <PageHeader
        title="Plan"
        description="Toolbox is priced by how many assets you track. Card payments are not connected yet."
      />
      <div className="mb-6 rounded-xl border border-border p-4">
        <p className="text-sm text-muted-foreground">Current plan</p>
        <p className="text-2xl font-semibold">{planLabel(context.plan)}</p>
        <p className="mt-2 text-sm">
          {context.assetCount} of {context.assetLimit} active assets
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
        {context.assetCount >= context.assetLimit ? (
          <p className="mt-3 text-sm">
            You have reached the limit. Archive a tool or move to a larger plan when billing is available.
          </p>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {plans?.map((plan) => (
          <article key={plan.tier} className="rounded-xl border border-border p-4">
            <h2 className="font-medium">{plan.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
            <p className="mt-3 text-sm">{plan.asset_limit.toLocaleString()} assets</p>
            {plan.tier === context.plan ? (
              <p className="mt-2 text-xs font-medium text-primary">Current</p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Upgrade coming soon</p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
