import Link from "next/link";
import { LocationMark } from "@/components/location-mark";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requireContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const context = await requireContext();
  const { q = "" } = await searchParams;
  const term = q.trim();
  const supabase = await createClient();
  const orgId = context.organization.id;

  const escaped = term.replace(/[%_]/g, "");
  const [{ data: assets }, { data: locations }] = term
    ? await Promise.all([
        supabase
          .from("assets")
          .select("id, name, asset_code, status, serial_number, category:asset_categories(name)")
          .eq("organization_id", orgId)
          .is("archived_at", null)
          .or(`name.ilike.%${escaped}%,asset_code.ilike.%${escaped}%,serial_number.ilike.%${escaped}%`)
          .limit(25),
        supabase
          .from("locations")
          .select("id, name, color, icon")
          .eq("organization_id", orgId)
          .is("archived_at", null)
          .ilike("name", `%${escaped}%`)
          .limit(10),
      ])
    : [{ data: [] }, { data: [] }];

  return (
    <div>
      <PageHeader title="Search" description="Find a tool by name, ID, serial number, or a location by name." />
      <form action="/search" className="mb-6">
        <input
          name="q"
          defaultValue={term}
          placeholder="Search"
          className="h-11 w-full rounded-lg border border-border px-3"
        />
      </form>
      {term ? (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 font-medium">Tools</h2>
            {(assets ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No tools matched.</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {assets?.map((asset) => (
                  <li key={asset.id} className="flex items-center justify-between gap-3 p-3">
                    <Link href={`/assets/${asset.id}`} className="font-medium hover:underline">
                      {asset.name}
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{asset.asset_code}</span>
                    </Link>
                    <StatusBadge status={asset.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="mb-2 font-medium">Locations</h2>
            {(locations ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No locations matched.</p>
            ) : (
              <ul className="space-y-2">
                {locations?.map((location) => (
                  <li key={location.id}>
                    <Link href={`/locations/${location.id}`} className="text-sm hover:underline">
                      <LocationMark color={location.color} icon={location.icon} name={location.name} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Type a name, asset ID, or serial number.</p>
      )}
    </div>
  );
}
