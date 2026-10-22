export type Role = "owner" | "manager" | "employee";

export type AssetStatus =
  | "available"
  | "checked_out"
  | "in_use"
  | "missing"
  | "under_repair"
  | "retired";

export type TrackingMethod =
  | "standard_label"
  | "qr"
  | "nfc"
  | "bluetooth"
  | "gps";

export type RequestType = "existing_tool" | "new_tool";
export type RequestStatus = "pending" | "approved" | "rejected" | "fulfilled";
export type PlanTier = "free" | "starter" | "business" | "enterprise";

export type Location = {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  description: string | null;
  color: string;
  icon: string;
  archived_at: string | null;
};

export type Asset = {
  id: string;
  organization_id: string;
  asset_code: string;
  public_token: string;
  name: string;
  category_id: string | null;
  description: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  photo_path: string | null;
  home_location_id: string | null;
  current_location_id: string | null;
  assigned_user_id: string | null;
  status: AssetStatus;
  tracking_method: TrackingMethod;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  away_from_home: boolean;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
};

export type PublicTag = {
  asset_name: string;
  asset_code: string;
  organization_name: string;
  status: AssetStatus;
  show_return_location: boolean;
  home_location: { name: string; color: string; icon: string } | null;
};

export type AppContext = {
  userId: string;
  email: string;
  fullName: string;
  role: Role;
  organization: {
    id: string;
    name: string;
    slug: string;
    publicReturnLocation: boolean;
  };
  organizations: { id: string; name: string; role: Role }[];
  plan: PlanTier;
  assetLimit: number;
  assetCount: number;
};
