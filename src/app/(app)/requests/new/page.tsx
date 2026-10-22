import { createRequest } from "@/actions/requests";
import { Flash } from "@/components/flash";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { fieldClass, Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "New request" };

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; type?: string }>;
}) {
  const context = await requireContext();
  const { error, type } = await searchParams;
  const purchase = type === "purchase";
  const supabase = await createClient();
  const orgId = context.organization.id;
  const [{ data: assets }, { data: locations }] = await Promise.all([
    supabase.from("assets").select("id, name, asset_code").eq("organization_id", orgId).is("archived_at", null).order("name"),
    supabase.from("locations").select("id, name").eq("organization_id", orgId).is("archived_at", null).order("name"),
  ]);

  return (
    <div>
      <PageHeader title="Request a tool" description="Ask for something the company already owns, or ask to buy a new one." />
      <Flash error={error} />
      <div className="mb-4 flex gap-2">
        <Button asChild variant={purchase ? "outline" : "default"} size="sm">
          <a href="/requests/new">Existing tool</a>
        </Button>
        <Button asChild variant={purchase ? "default" : "outline"} size="sm">
          <a href="/requests/new?type=purchase">Buy a new tool</a>
        </Button>
      </div>
      <form action={createRequest} className="max-w-xl space-y-4">
        <input type="hidden" name="request_type" value={purchase ? "new_tool" : "existing_tool"} />
        {purchase ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="tool_name">Tool name</Label>
              <Input id="tool_name" name="tool_name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" name="quantity" type="number" min="1" defaultValue="1" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product_url">Product link (optional)</Label>
              <Input id="product_url" name="product_url" type="url" placeholder="https://" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estimated_cost">Estimated cost (optional)</Label>
              <Input id="estimated_cost" name="estimated_cost" type="number" min="0" step="0.01" />
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="asset_id">Tool</Label>
            <select id="asset_id" name="asset_id" className={fieldClass} required>
              <option value="">Choose a tool</option>
              {assets?.map((asset) => (
                <option key={asset.id} value={asset.id}>{asset.name} ({asset.asset_code})</option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="location_id">Needed at</Label>
          <select id="location_id" name="location_id" className={fieldClass}>
            <option value="">Any location</option>
            {locations?.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reason">Reason</Label>
          <Textarea id="reason" name="reason" />
        </div>
        <Button type="submit" size="lg">Submit request</Button>
      </form>
    </div>
  );
}
