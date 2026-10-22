import { saveLocation } from "@/actions/locations";
import { LocationMark } from "@/components/location-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LOCATION_COLORS, LOCATION_ICONS } from "@/lib/assets/constants";

export function LocationForm({
  location,
}: {
  location?: {
    id: string;
    name: string;
    address: string | null;
    description: string | null;
    color: string;
    icon: string;
  };
}) {
  return (
    <form action={saveLocation} className="space-y-4">
      {location ? <input type="hidden" name="location_id" value={location.id} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={location?.name} placeholder="Main Workshop" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="address">Address (optional)</Label>
        <Input id="address" name="address" defaultValue={location?.address ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={location?.description ?? ""} />
      </div>
      <fieldset>
        <legend className="text-sm font-medium">Colour</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {LOCATION_COLORS.map((color) => (
            <label key={color} className="cursor-pointer">
              <input
                className="peer sr-only"
                type="radio"
                name="color"
                value={color}
                defaultChecked={location ? location.color.toLowerCase() === color : color === "#2563eb"}
              />
              <span
                className="block size-8 rounded-full ring-2 ring-transparent peer-checked:ring-foreground"
                style={{ background: color }}
              />
              <span className="sr-only">{color}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium">Shape or icon</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LOCATION_ICONS.map((icon) => (
            <label key={icon.id} className="cursor-pointer">
              <input
                className="peer sr-only"
                type="radio"
                name="icon"
                value={icon.id}
                defaultChecked={location ? location.icon === icon.id : icon.id === "circle"}
              />
              <span className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 peer-checked:border-primary peer-checked:bg-blue-50 dark:peer-checked:bg-blue-950">
                <LocationMark color={location?.color || "#2563eb"} icon={icon.id} name={icon.label} />
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" size="lg">{location ? "Save location" : "Add location"}</Button>
    </form>
  );
}
