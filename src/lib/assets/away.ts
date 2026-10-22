export function isAwayFromHome(asset: {
  status: string;
  current_location_id: string | null;
  home_location_id: string | null;
  archived_at?: string | null;
}) {
  if (asset.archived_at) return false;
  if (asset.status === "retired") return false;
  return asset.current_location_id !== asset.home_location_id;
}
