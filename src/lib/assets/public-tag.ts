export type PublicTagInput = {
  asset_name: string;
  asset_code: string;
  organization_name: string;
  status: string;
  show_return_location: boolean;
  home_location_name?: string | null;
  home_location_color?: string | null;
  home_location_icon?: string | null;
  purchase_price?: number | null;
  serial_number?: string | null;
  assigned_name?: string | null;
  notes?: string | null;
};

/** Fields that are allowed on a public QR/NFC page. */
export function toPublicTag(input: PublicTagInput) {
  const show = input.show_return_location && Boolean(input.home_location_name);
  return {
    asset_name: input.asset_name,
    asset_code: input.asset_code,
    organization_name: input.organization_name,
    status: input.status,
    show_return_location: input.show_return_location,
    home_location: show
      ? {
          name: input.home_location_name as string,
          color: input.home_location_color ?? "#2563eb",
          icon: input.home_location_icon ?? "circle",
        }
      : null,
  };
}
