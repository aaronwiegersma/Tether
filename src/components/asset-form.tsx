import type { ReactNode } from "react";
import { createAsset, updateAsset } from "@/actions/assets";
import { LocationMark } from "@/components/location-mark";
import { Button } from "@/components/ui/button";
import { fieldClass, Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_OPTIONS, TRACKING_OPTIONS } from "@/lib/assets/constants";

type Place = { id: string; name: string; color: string; icon: string };
type Person = { id: string; full_name: string };
type Category = { id: string; name: string };

export function AssetForm({
  mode,
  locations,
  people,
  categories,
  asset,
  price,
  categoryName,
}: {
  mode: "create" | "edit";
  locations: Place[];
  people: Person[];
  categories: Category[];
  asset?: {
    id: string;
    name: string;
    description: string | null;
    manufacturer: string | null;
    model: string | null;
    serial_number: string | null;
    purchase_date: string | null;
    home_location_id: string | null;
    current_location_id: string | null;
    assigned_user_id: string | null;
    status: string;
    tracking_method: string;
    notes: string | null;
  };
  price?: number | null;
  categoryName?: string | null;
}) {
  const action = mode === "create" ? createAsset : updateAsset;

  return (
    <form action={action} className="space-y-5">
      {asset ? <input type="hidden" name="asset_id" value={asset.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tool name" id="name">
          <Input id="name" name="name" required defaultValue={asset?.name} />
        </Field>
        <Field label="Category" id="category">
          <Input id="category" name="category" list="categories" defaultValue={categoryName ?? ""} />
          <datalist id="categories">
            {categories.map((category) => (
              <option key={category.id} value={category.name} />
            ))}
          </datalist>
        </Field>
        <Field label="Manufacturer" id="manufacturer">
          <Input id="manufacturer" name="manufacturer" defaultValue={asset?.manufacturer ?? ""} />
        </Field>
        <Field label="Model" id="model">
          <Input id="model" name="model" defaultValue={asset?.model ?? ""} />
        </Field>
        <Field label="Serial number" id="serial_number">
          <Input id="serial_number" name="serial_number" defaultValue={asset?.serial_number ?? ""} />
        </Field>
        <Field label="Purchase date" id="purchase_date">
          <Input id="purchase_date" name="purchase_date" type="date" defaultValue={asset?.purchase_date ?? ""} />
        </Field>
        <Field label="Purchase price" id="purchase_price" hint="Visible to owners and managers only.">
          <Input id="purchase_price" name="purchase_price" type="number" min="0" step="0.01" defaultValue={price ?? ""} />
        </Field>
        <Field label="Photo" id="photo">
          <Input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
        </Field>
        <Field label="Status" id="status">
          <select id="status" name="status" className={fieldClass} defaultValue={asset?.status ?? "available"}>
            {STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Assigned person" id="assigned_user_id">
          <select id="assigned_user_id" name="assigned_user_id" className={fieldClass} defaultValue={asset?.assigned_user_id ?? ""}>
            <option value="">Nobody</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>{person.full_name || "Unnamed"}</option>
            ))}
          </select>
        </Field>
        <Field label="Home location" id="home_location_id" hint="Where this tool belongs and should be returned.">
          <select id="home_location_id" name="home_location_id" className={fieldClass} defaultValue={asset?.home_location_id ?? ""}>
            <option value="">No home yet</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Current location" id="current_location_id" hint="Where it is right now. Leave blank to use the home location.">
          <select id="current_location_id" name="current_location_id" className={fieldClass} defaultValue={asset?.current_location_id ?? ""}>
            <option value="">Same as home</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-wrap gap-3">
        {locations.map((location) => (
          <span key={location.id} className="rounded-full border border-border px-2 py-1 text-xs">
            <LocationMark color={location.color} icon={location.icon} name={location.name} />
          </span>
        ))}
      </div>

      <Field label="Tracking" id="tracking_method">
        <select id="tracking_method" name="tracking_method" className={fieldClass} defaultValue={asset?.tracking_method ?? "qr"}>
          {TRACKING_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} disabled={!option.enabled && option.value !== asset?.tracking_method}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Description" id="description">
        <Textarea id="description" name="description" defaultValue={asset?.description ?? ""} />
      </Field>
      <Field label="Notes" id="notes">
        <Textarea id="notes" name="notes" defaultValue={asset?.notes ?? ""} />
      </Field>
      <Button type="submit" size="lg">{mode === "create" ? "Add tool" : "Save changes"}</Button>
    </form>
  );
}

function Field({
  label,
  id,
  hint,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
