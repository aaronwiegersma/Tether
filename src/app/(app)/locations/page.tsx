import Link from "next/link";
import { Flash } from "@/components/flash";
import { LocationMark } from "@/components/location-mark";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";
import { requireContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Locations" };

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const context = await requireContext();
  const flash = await searchParams;
  const supabase = await createClient();
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name, address, description, color, icon")
    .eq("organization_id", context.organization.id)
    .is("archived_at", null)
    .order("name");

  return (
    <div>
      <PageHeader
        title="Locations"
        description="Workshops, warehouses, trucks, and job sites. Colour and icon show up on tools and labels."
        action={
          can(context.role, "locations") ? (
            <Button asChild>
              <Link href="/locations/new">Add location</Link>
            </Button>
          ) : null
        }
      />
      <Flash error={flash.error} done={flash.done} />
      {(locations ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Add the places your tools live and travel between.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {locations?.map((location) => (
            <Link key={location.id} href={`/locations/${location.id}`} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-lg font-medium">
                <LocationMark color={location.color} icon={location.icon} name={location.name} size={20} />
              </p>
              {location.address ? <p className="mt-2 text-sm text-muted-foreground">{location.address}</p> : null}
              {location.description ? <p className="mt-1 text-sm text-muted-foreground">{location.description}</p> : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
