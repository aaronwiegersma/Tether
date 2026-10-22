import Link from "next/link";
import { importAssets } from "@/actions/assets";
import { Flash } from "@/components/flash";
import { LocationMark } from "@/components/location-mark";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { fieldClass, Input } from "@/components/ui/input";
import { can } from "@/lib/auth/permissions";
import { requireContext } from "@/lib/auth/session";
import { STATUS_OPTIONS } from "@/lib/assets/constants";
import { limitMessage } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Assets" };

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireContext();
  const params = await searchParams;
  const q = (first(params.q) || "").replace(/[%_,.()]/g, "");
  const status = first(params.status) || "";
  const location = first(params.location) || "";
  const away = first(params.away) === "1";
  const error = first(params.error);
  const done = first(params.done);
  const supabase = await createClient();
  const orgId = context.organization.id;

  let query = supabase
    .from("assets")
    .select(
      "id, name, asset_code, status, serial_number, away_from_home, home_location:locations!assets_home_location_id_fkey(name, color, icon), current_location:locations!assets_current_location_id_fkey(name, color, icon)",
    )
    .eq("organization_id", orgId)
    .is("archived_at", null)
    .order("name");

  if (q) {
    query = query.or(
      `name.ilike.%${q}%,asset_code.ilike.%${q}%,serial_number.ilike.%${q}%`,
    );
  }
  if (status) query = query.eq("status", status);
  if (location && /^[0-9a-f-]{36}$/i.test(location)) {
    query = query.or(`home_location_id.eq.${location},current_location_id.eq.${location}`);
  }
  if (away) query = query.eq("away_from_home", true);

  const [{ data: assets }, { data: locations }] = await Promise.all([
    query,
    supabase.from("locations").select("id, name").eq("organization_id", orgId).is("archived_at", null).order("name"),
  ]);

  const message = limitMessage(context.assetCount, context.assetLimit, context.plan);

  return (
    <div>
      <PageHeader
        title="Assets"
        description="Every tool, where it belongs, and where it is now."
        action={
          can(context.role, "assets") ? (
            <Button asChild>
              <Link href="/assets/new">Add tool</Link>
            </Button>
          ) : null
        }
      />
      <Flash error={error} done={done} />
      {message ? (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
          {message} <Link href="/settings/billing" className="underline">View plans</Link>
        </p>
      ) : null}

      <form className="mb-4 grid gap-2 md:grid-cols-5" action="/assets">
        <Input name="q" defaultValue={q} placeholder="Name, ID, or serial" aria-label="Search assets" />
        <select name="status" defaultValue={status} className={fieldClass} aria-label="Status">
          <option value="">Any status</option>
          {STATUS_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <select name="location" defaultValue={location} className={fieldClass} aria-label="Location">
          <option value="">Any location</option>
          {locations?.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="away" value="1" defaultChecked={away} />
          Away from home
        </label>
        <Button type="submit" variant="outline">Filter</Button>
      </form>

      <form action="/assets/labels">
        <div className="mb-3 flex justify-end">
          <Button type="submit" variant="outline">Print selected labels</Button>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {(assets ?? []).length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No tools match. Add one, or clear the filters.</p>
          ) : (
            <ul className="divide-y divide-border">
              {assets?.map((asset) => {
                const home = one(asset.home_location);
                const current = one(asset.current_location);
                return (
                  <li key={asset.id} className="flex items-start gap-3 p-4">
                    <input type="checkbox" name="ids" value={asset.id} aria-label={`Select ${asset.name}`} className="mt-1" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/assets/${asset.id}`} className="font-medium hover:underline">{asset.name}</Link>
                        <span className="font-mono text-xs text-muted-foreground">{asset.asset_code}</span>
                        <StatusBadge status={asset.status} />
                        {asset.away_from_home ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                            Away from home
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>Home {home ? <LocationMark color={home.color} icon={home.icon} name={home.name} /> : "—"}</span>
                        <span>Now {current ? <LocationMark color={current.color} icon={current.icon} name={current.name} /> : "—"}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </form>

      {can(context.role, "assets") ? (
        <form action={importAssets} className="mt-6 rounded-xl border border-border p-4">
          <h2 className="font-medium">Import CSV</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Columns: name, category, description, manufacturer, model, serial_number, purchase_date,
            purchase_price, home_location, notes, tracking_method. Home location must already exist.
            Up to 200 rows.
          </p>
          <a className="mt-2 inline-block text-sm underline" href="/templates/asset-import-template.csv">
            Download template
          </a>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input type="file" name="file" accept=".csv,text/csv" required />
            <Button type="submit" variant="outline">Import</Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function one<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
