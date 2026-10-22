import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveLocation } from "@/actions/locations";
import { Flash } from "@/components/flash";
import { LocationMark } from "@/components/location-mark";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";
import { requireContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Location" };

export default async function LocationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const context = await requireContext();
  const { id } = await params;
  const { done } = await searchParams;
  const supabase = await createClient();
  const { data: location } = await supabase
    .from("locations")
    .select("id, name, address, description, color, icon, archived_at")
    .eq("id", id)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (!location) notFound();

  const { data: assets } = await supabase
    .from("assets")
    .select("id, name, asset_code, status, home_location_id, current_location_id, away_from_home")
    .eq("organization_id", context.organization.id)
    .or(`home_location_id.eq.${id},current_location_id.eq.${id}`)
    .is("archived_at", null)
    .order("name");

  return (
    <div>
      <Flash done={done} />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            <LocationMark color={location.color} icon={location.icon} name={location.name} size={22} />
          </h1>
          {location.address ? <p className="mt-2 text-sm text-muted-foreground">{location.address}</p> : null}
          {location.description ? <p className="mt-1 text-sm text-muted-foreground">{location.description}</p> : null}
        </div>
        {can(context.role, "locations") ? (
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link href={`/locations/${id}/edit`}>Edit</Link></Button>
            <form action={archiveLocation}>
              <input type="hidden" name="location_id" value={id} />
              <Button type="submit" variant="ghost">Archive</Button>
            </form>
          </div>
        ) : null}
      </div>
      <h2 className="mb-3 font-medium">Tools</h2>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {(assets ?? []).length === 0 ? (
          <li className="p-4 text-sm text-muted-foreground">No tools are assigned here yet.</li>
        ) : (
          assets?.map((asset) => (
            <li key={asset.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <Link href={`/assets/${asset.id}`} className="font-medium hover:underline">{asset.name}</Link>
                <p className="text-xs text-muted-foreground">
                  {asset.home_location_id === id ? "Home" : "Visiting"}
                  {asset.current_location_id === id ? " · Here now" : " · Somewhere else"}
                  {asset.away_from_home ? " · Away from home" : ""}
                </p>
              </div>
              <StatusBadge status={asset.status} />
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
