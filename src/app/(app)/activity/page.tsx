import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireContext } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Activity" };

export default async function ActivityPage() {
  const context = await requireContext();
  const supabase = await createClient();
  const { data: activity } = await supabase
    .from("asset_activity")
    .select("id, summary, action_type, created_at, asset_id, previous_value, new_value, actor:profiles!asset_activity_actor_id_fkey(full_name), asset:assets(name, asset_code)")
    .eq("organization_id", context.organization.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <PageHeader
        title="Activity"
        description="A timeline of tools added, moved, checked out, returned, and requests reviewed."
      />
      <ol className="space-y-4 border-l border-border pl-4">
        {(activity ?? []).length === 0 ? (
          <li className="text-sm text-muted-foreground">Nothing has been recorded yet.</li>
        ) : (
          activity?.map((item) => {
            const actor = one(item.actor);
            const asset = one(item.asset);
            return (
              <li key={item.id}>
                <p className="text-sm font-medium">{item.summary}</p>
                <p className="text-xs text-muted-foreground">
                  {actor?.full_name || "Someone"}
                  {asset ? (
                    <>
                      {" · "}
                      <Link href={`/assets/${item.asset_id}`} className="underline">
                        {asset.name} ({asset.asset_code})
                      </Link>
                    </>
                  ) : null}
                  {" · "}
                  {formatDateTime(item.created_at)}
                </p>
              </li>
            );
          })
        )}
      </ol>
    </div>
  );
}

function one<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
