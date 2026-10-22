import Link from "next/link";
import { Flash } from "@/components/flash";
import { LocationMark } from "@/components/location-mark";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireContext } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const context = await requireContext();
  const flash = await searchParams;
  const supabase = await createClient();
  const orgId = context.organization.id;
  const active = supabase.from("assets").select("id", { count: "exact", head: true }).eq("organization_id", orgId).is("archived_at", null);

  const [available, checkedOut, missing, away, pending, activity, awayAssets, requests] = await Promise.all([
    active.eq("status", "available"),
    supabase.from("assets").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "checked_out").is("archived_at", null),
    supabase.from("assets").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "missing").is("archived_at", null),
    supabase.from("assets").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("away_from_home", true).is("archived_at", null),
    supabase.from("asset_requests").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "pending"),
    supabase
      .from("asset_activity")
      .select("id, summary, created_at, actor:profiles!asset_activity_actor_id_fkey(full_name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("assets")
      .select("id, name, asset_code, home_location:locations!assets_home_location_id_fkey(name, color, icon), current_location:locations!assets_current_location_id_fkey(name, color, icon)")
      .eq("organization_id", orgId)
      .eq("away_from_home", true)
      .is("archived_at", null)
      .limit(5),
    supabase
      .from("asset_requests")
      .select("id, tool_name, request_type, status, asset:assets(name)")
      .eq("organization_id", orgId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const stats = [
    ["Total assets", context.assetCount, "/assets"],
    ["Available", available.count ?? 0, "/assets?status=available"],
    ["Checked out", checkedOut.count ?? 0, "/assets?status=checked_out"],
    ["Missing", missing.count ?? 0, "/assets?status=missing"],
    ["Away from home", away.count ?? 0, "/assets?away=1"],
    ["Pending requests", pending.count ?? 0, "/requests"],
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`${context.organization.name} · ${context.assetCount} of ${context.assetLimit} assets on the ${context.plan} plan.`}
      />
      <Flash error={flash.error} done={flash.done} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(([label, value, href]) => (
          <Link key={String(label)} href={String(href)} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tools away from home</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(awayAssets.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Everything active is at its home location.</p>
            ) : (
              awayAssets.data?.map((asset) => {
                const home = one(asset.home_location);
                const current = one(asset.current_location);
                return (
                  <Link key={asset.id} href={`/assets/${asset.id}`} className="block rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{asset.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{asset.asset_code}</span>
                    </div>
                    <p className="mt-2 text-sm">
                      Home: {home ? <LocationMark color={home.color} icon={home.icon} name={home.name} /> : "Not set"}
                    </p>
                    <p className="mt-1 text-sm">
                      Now: {current ? <LocationMark color={current.color} icon={current.icon} name={current.name} /> : "Unknown"}
                    </p>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(requests.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No requests are waiting.</p>
            ) : (
              requests.data?.map((request) => (
                <Link key={request.id} href="/requests" className="block rounded-lg border border-border p-3 text-sm">
                  <span className="font-medium">
                    {request.request_type === "new_tool" ? request.tool_name : one(request.asset)?.name || "Tool"}
                  </span>
                  <StatusBadge status={request.status} />
                </Link>
              ))
            )}
            <Button asChild variant="outline">
              <Link href="/requests/new">New request</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(activity.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Activity will show up as tools are added and moved.</p>
          ) : (
            activity.data?.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 text-sm">
                <div>
                  <p>{item.summary}</p>
                  <p className="text-muted-foreground">{one(item.actor)?.full_name || "Someone"}</p>
                </div>
                <time className="shrink-0 text-muted-foreground">{formatDateTime(item.created_at)}</time>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
