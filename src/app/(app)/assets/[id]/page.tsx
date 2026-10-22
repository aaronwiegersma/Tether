import Link from "next/link";
import { notFound } from "next/navigation";
import { AssetActions } from "@/components/asset-actions";
import { CopyButton } from "@/components/copy-button";
import { Flash } from "@/components/flash";
import { LocationMark } from "@/components/location-mark";
import { NfcWriter } from "@/components/nfc-writer";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";
import { requireContext } from "@/lib/auth/session";
import { TRACKING_OPTIONS } from "@/lib/assets/constants";
import { getAppUrl } from "@/lib/env";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { signedPhoto } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Tool" };

export default async function AssetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ panel?: string; error?: string; done?: string }>;
}) {
  const context = await requireContext();
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: asset } = await supabase
    .from("assets")
    .select(`
      *,
      category:asset_categories(name),
      home_location:locations!assets_home_location_id_fkey(id, name, color, icon),
      current_location:locations!assets_current_location_id_fkey(id, name, color, icon),
      assignee:profiles!assets_assigned_user_id_fkey(full_name)
    `)
    .eq("id", id)
    .eq("organization_id", context.organization.id)
    .maybeSingle();

  if (!asset) notFound();

  const home = one(asset.home_location);
  const current = one(asset.current_location);
  const assignee = one(asset.assignee);
  const category = one(asset.category);
  const tagUrl = `${getAppUrl()}/tag/${asset.public_token}`;
  const tracking = TRACKING_OPTIONS.find((item) => item.value === asset.tracking_method);

  const [{ data: locations }, { data: members }, { data: activity }, { data: financial }, photo] = await Promise.all([
    supabase.from("locations").select("id, name").eq("organization_id", context.organization.id).is("archived_at", null).order("name"),
    supabase.from("organization_members").select("user_id, profile:profiles(id, full_name)").eq("organization_id", context.organization.id),
    supabase.from("asset_activity").select("id, summary, created_at, actor:profiles!asset_activity_actor_id_fkey(full_name)").eq("asset_id", asset.id).order("created_at", { ascending: false }).limit(30),
    can(context.role, "assets")
      ? supabase.from("asset_financials").select("purchase_price").eq("asset_id", asset.id).maybeSingle()
      : Promise.resolve({ data: null }),
    signedPhoto(asset.photo_path),
  ]);

  const people = (members ?? []).map((member) => {
    const profile = one(member.profile);
    return { id: profile?.id || member.user_id, full_name: profile?.full_name || "Unnamed" };
  });

  return (
    <div className="space-y-6">
      <Flash error={query.error} done={query.done} />
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted sm:w-40">
          {photo ? (
            // Signed storage URLs are temporary and should not go through the image optimizer.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm text-muted-foreground">No photo</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{asset.name}</h1>
            <StatusBadge status={asset.status} />
          </div>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{asset.asset_code}</p>
          {category?.name ? <p className="mt-1 text-sm text-muted-foreground">{category.name}</p> : null}
          {asset.archived_at ? <p className="mt-2 text-sm">This tool is archived.</p> : null}
        </div>
      </div>

      {asset.away_from_home ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
          <p className="font-medium">Away from home</p>
          <p className="mt-1 text-sm">
            Return to {home?.name || "its home location"}. It is currently {current?.name || "in an unknown place"}.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <PlaceCard title="Home · return here" location={home} />
        <PlaceCard title="Current location" location={current} />
      </div>

      <dl className="grid gap-3 rounded-xl border border-border p-4 text-sm sm:grid-cols-2">
        <Info label="Assigned to" value={assignee?.full_name || "Nobody"} />
        <Info label="Manufacturer" value={asset.manufacturer || "—"} />
        <Info label="Model" value={asset.model || "—"} />
        <Info label="Serial number" value={asset.serial_number || "—"} />
        <Info label="Purchased" value={formatDate(asset.purchase_date)} />
        {financial?.purchase_price != null ? (
          <Info label="Purchase price" value={formatMoney(financial.purchase_price)} />
        ) : null}
        <Info label="Tracking" value={tracking?.label || asset.tracking_method} />
      </dl>

      {asset.description ? <p className="text-sm">{asset.description}</p> : null}
      {asset.notes ? <p className="text-sm text-muted-foreground">{asset.notes}</p> : null}

      {!asset.archived_at ? (
        <AssetActions
          assetId={asset.id}
          status={asset.status}
          homeLocationId={asset.home_location_id}
          role={context.role}
          userId={context.userId}
          locations={locations ?? []}
          people={people}
          panel={query.panel}
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={`/assets/labels?ids=${asset.id}`}>Print label</Link>
        </Button>
        {can(context.role, "assets") ? (
          <>
            <Button asChild variant="outline">
              <Link href={`/assets/${asset.id}/edit`}>Edit</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/assets/${asset.id}?panel=archive`}>Archive</Link>
            </Button>
          </>
        ) : null}
      </div>

      {(asset.tracking_method === "bluetooth" || asset.tracking_method === "gps") && (
        <section className="rounded-xl border border-border p-4">
          <h2 className="font-medium">Hardware tracking is not connected</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This record is marked for {asset.tracking_method === "gps" ? "GPS" : "Bluetooth"}, but Toolbox
            does not talk to tags or devices yet. There is no live location, battery, or last-seen time.
          </p>
        </section>
      )}

      <section className="rounded-xl border border-border p-4">
        <h2 className="font-medium">QR and NFC address</h2>
        <p className="mt-1 break-all font-mono text-sm">{tagUrl}</p>
        <div className="mt-3">
          <CopyButton value={tagUrl} label="Copy address" />
        </div>
        <div className="mt-4">
          <NfcWriter url={tagUrl} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium">History</h2>
        <ol className="space-y-3 border-l border-border pl-4">
          {(activity ?? []).length === 0 ? (
            <li className="text-sm text-muted-foreground">No history yet.</li>
          ) : (
            activity?.map((item) => (
              <li key={item.id}>
                <p className="text-sm">{item.summary}</p>
                <p className="text-xs text-muted-foreground">
                  {one(item.actor)?.full_name || "Someone"} · {formatDateTime(item.created_at)}
                </p>
              </li>
            ))
          )}
        </ol>
      </section>
    </div>
  );
}

function PlaceCard({
  title,
  location,
}: {
  title: string;
  location: { name: string; color: string; icon: string } | null;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-lg font-medium">
        {location ? (
          <LocationMark color={location.color} icon={location.icon} name={location.name} size={20} />
        ) : (
          "Not set"
        )}
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
