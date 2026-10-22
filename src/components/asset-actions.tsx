import Link from "next/link";
import { archiveAsset, checkoutAsset, moveAsset, reportProblem, returnAsset } from "@/actions/assets";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fieldClass } from "@/components/ui/input";
import type { Role } from "@/lib/types";

type Place = { id: string; name: string };
type Person = { id: string; full_name: string };

export function AssetActions({
  assetId,
  status,
  homeLocationId,
  role,
  userId,
  locations,
  people,
  panel,
}: {
  assetId: string;
  status: string;
  homeLocationId: string | null;
  role: Role;
  userId: string;
  locations: Place[];
  people: Person[];
  panel?: string;
}) {
  if (panel === "checkout") {
    return (
      <form action={checkoutAsset} className="space-y-4 rounded-xl border border-border bg-card p-4">
        <input type="hidden" name="asset_id" value={assetId} />
        <h2 className="text-lg font-semibold">Check out this tool</h2>
        <p className="text-sm text-muted-foreground">
          This assigns the tool and marks it checked out.
        </p>
        {role === "employee" ? (
          <input type="hidden" name="assignee" value={userId} />
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="assignee">Assign to</Label>
            <select id="assignee" name="assignee" className={fieldClass} defaultValue={userId}>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.full_name || "Unnamed"}
                </option>
              ))}
            </select>
          </div>
        )}
        <LocationField locations={locations} label="Where is it now?" optional />
        <Note />
        <div className="flex gap-2">
          <Button type="submit" size="lg">Confirm check out</Button>
          <Button variant="outline" asChild><Link href={`/assets/${assetId}`}>Cancel</Link></Button>
        </div>
      </form>
    );
  }

  if (panel === "return") {
    return (
      <form action={returnAsset} className="space-y-4 rounded-xl border border-border bg-card p-4">
        <input type="hidden" name="asset_id" value={assetId} />
        <h2 className="text-lg font-semibold">Return this tool</h2>
        <p className="text-sm text-muted-foreground">
          This clears who has it. Returning it somewhere other than home keeps the away-from-home flag.
        </p>
        <LocationField locations={locations} label="Return location" defaultValue={homeLocationId ?? undefined} />
        <Note />
        <div className="flex gap-2">
          <Button type="submit" size="lg">Confirm return</Button>
          <Button variant="outline" asChild><Link href={`/assets/${assetId}`}>Cancel</Link></Button>
        </div>
      </form>
    );
  }

  if (panel === "move") {
    return (
      <form action={moveAsset} className="space-y-4 rounded-xl border border-border bg-card p-4">
        <input type="hidden" name="asset_id" value={assetId} />
        <h2 className="text-lg font-semibold">Move this tool</h2>
        <p className="text-sm text-muted-foreground">
          This changes where the tool is right now. Its home location stays the same.
        </p>
        <LocationField locations={locations} label="New current location" />
        <Note />
        <div className="flex gap-2">
          <Button type="submit" size="lg">Confirm move</Button>
          <Button variant="outline" asChild><Link href={`/assets/${assetId}`}>Cancel</Link></Button>
        </div>
      </form>
    );
  }

  if (panel === "report") {
    return (
      <form action={reportProblem} className="space-y-4 rounded-xl border border-border bg-card p-4">
        <input type="hidden" name="asset_id" value={assetId} />
        <h2 className="text-lg font-semibold">Report a problem</h2>
        <div className="space-y-1.5">
          <Label htmlFor="problem">What happened?</Label>
          <select id="problem" name="problem" className={fieldClass} defaultValue="missing">
            <option value="missing">Missing</option>
            <option value="under_repair">Under repair</option>
          </select>
        </div>
        <Note />
        <div className="flex gap-2">
          <Button type="submit" size="lg">Submit report</Button>
          <Button variant="outline" asChild><Link href={`/assets/${assetId}`}>Cancel</Link></Button>
        </div>
      </form>
    );
  }

  if (panel === "archive") {
    return (
      <form action={archiveAsset} className="space-y-4 rounded-xl border border-border bg-card p-4">
        <input type="hidden" name="asset_id" value={assetId} />
        <h2 className="text-lg font-semibold">Archive this tool?</h2>
        <p className="text-sm text-muted-foreground">
          Archived tools leave the active count and no longer appear in everyday lists.
        </p>
        <div className="flex gap-2">
          <Button type="submit" variant="destructive">Archive</Button>
          <Button variant="outline" asChild><Link href={`/assets/${assetId}`}>Cancel</Link></Button>
        </div>
      </form>
    );
  }

  const checkedOut = status === "checked_out";

  return (
    <div id="actions" className="grid grid-cols-2 gap-2">
      {checkedOut ? (
        <Button asChild size="lg"><Link href={`/assets/${assetId}?panel=return`}>Return tool</Link></Button>
      ) : (
        <Button asChild size="lg"><Link href={`/assets/${assetId}?panel=checkout`}>Check out</Link></Button>
      )}
      <Button asChild variant="outline" size="lg"><Link href={`/assets/${assetId}?panel=move`}>Move location</Link></Button>
      <Button asChild variant="outline" size="lg"><Link href={`/assets/${assetId}?panel=report`}>Report problem</Link></Button>
      {checkedOut ? (
        <Button asChild variant="secondary" size="lg"><Link href={`/assets/${assetId}?panel=checkout`}>Check out again</Link></Button>
      ) : (
        <Button asChild variant="secondary" size="lg"><Link href={`/assets/${assetId}?panel=return`}>Return tool</Link></Button>
      )}
    </div>
  );
}

function LocationField({
  locations,
  label,
  defaultValue,
  optional,
}: {
  locations: Place[];
  label: string;
  defaultValue?: string;
  optional?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="location_id">{label}</Label>
      <select
        id="location_id"
        name="location_id"
        className={fieldClass}
        defaultValue={defaultValue}
        required={!optional}
      >
        {optional ? <option value="">Keep current location</option> : null}
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function Note() {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="note">Note (optional)</Label>
      <Textarea id="note" name="note" />
    </div>
  );
}
