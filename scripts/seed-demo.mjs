import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

loadEnvFile(".env.local");
loadEnvFile(".env");

if (process.env.ALLOW_DEMO_SEED !== "true") {
  console.error("Refusing to seed. Set ALLOW_DEMO_SEED=true and run this only against a development project.");
  process.exit(1);
}

if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
  console.error("Refusing to seed a production environment.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const password = "DemoPass123!";
const people = [
  ["owner@example-contracting.test", "Alex Owner"],
  ["manager@example-contracting.test", "Morgan Manager"],
  ["employee@example-contracting.test", "Riley Employee"],
];

const { data: existing } = await supabase
  .from("organizations")
  .select("id")
  .eq("slug", "example-contracting-ltd")
  .maybeSingle();

if (existing) {
  console.log("Example Contracting Ltd. already exists. No demo data was added.");
  process.exit(0);
}

const [ownerId, managerId, employeeId] = await Promise.all(
  people.map(([email, name]) => ensureUser(email, name)),
);

const { data: org, error: orgError } = await supabase
  .from("organizations")
  .insert({
    name: "Example Contracting Ltd.",
    slug: "example-contracting-ltd",
    public_return_location: true,
    next_asset_number: 9,
    created_by: ownerId,
  })
  .select("id")
  .single();

if (orgError || !org) throw orgError;

const organizationId = org.id;

await supabase.from("organization_members").insert([
  { organization_id: organizationId, user_id: ownerId, role: "owner" },
  { organization_id: organizationId, user_id: managerId, role: "manager" },
  { organization_id: organizationId, user_id: employeeId, role: "employee" },
]);

await supabase.from("subscriptions").insert({
  organization_id: organizationId,
  plan: "free",
  asset_limit: 10,
  status: "active",
});

const { data: locations, error: locationError } = await supabase
  .from("locations")
  .insert([
    { organization_id: organizationId, name: "Main Workshop", address: "12 Yard Lane", color: "#2563eb", icon: "circle", description: "Bench tools and daily kit" },
    { organization_id: organizationId, name: "Warehouse", address: "400 Industrial Road", color: "#16a34a", icon: "triangle", description: "Bulk storage" },
    { organization_id: organizationId, name: "Service Truck 1", color: "#ea580c", icon: "square", description: "Mobile kit" },
    { organization_id: organizationId, name: "Job Site A", address: "88 River Street", color: "#9333ea", icon: "diamond", description: "Active remodel" },
  ])
  .select("id, name");

if (locationError || !locations) throw locationError;

const locationId = Object.fromEntries(locations.map((location) => [location.name, location.id]));

const { data: categories } = await supabase
  .from("asset_categories")
  .insert([
    { organization_id: organizationId, name: "Power Tools" },
    { organization_id: organizationId, name: "Site Equipment" },
  ])
  .select("id, name");

const categoryId = Object.fromEntries((categories ?? []).map((category) => [category.name, category.id]));

const assetRows = [
  ["AST-0001", "Milwaukee Cordless Drill", "Power Tools", "Warehouse", "Warehouse", "available", null, "qr", "Milwaukee", "M18"],
  ["AST-0002", "DeWalt Circular Saw", "Power Tools", "Main Workshop", "Job Site A", "checked_out", employeeId, "qr", "DeWalt", "DCS570"],
  ["AST-0003", "Bosch Laser Level", "Site Equipment", "Main Workshop", "Main Workshop", "available", null, "qr", "Bosch", "GLL3-80"],
  ["AST-0004", "Extension Ladder", "Site Equipment", "Warehouse", "Service Truck 1", "available", null, "qr", null, null],
  ["AST-0005", "Generator", "Site Equipment", "Warehouse", "Job Site A", "checked_out", employeeId, "qr", "Honda", "EU22i"],
  ["AST-0006", "Pressure Washer", "Site Equipment", "Main Workshop", "Main Workshop", "under_repair", null, "qr", null, null],
  ["AST-0007", "Impact Driver", "Power Tools", "Service Truck 1", "Service Truck 1", "available", null, "nfc", "Milwaukee", "M18"],
  ["AST-0008", "Air Compressor", "Site Equipment", "Warehouse", "Warehouse", "available", null, "standard_label", null, null],
];

const { data: assets, error: assetError } = await supabase
  .from("assets")
  .insert(
    assetRows.map((row) => ({
      organization_id: organizationId,
      asset_code: row[0],
      public_token: randomBytes(24).toString("hex"),
      name: row[1],
      category_id: categoryId[row[2]],
      home_location_id: locationId[row[3]],
      current_location_id: locationId[row[4]],
      status: row[5],
      assigned_user_id: row[6],
      tracking_method: row[7],
      manufacturer: row[8],
      model: row[9],
      created_by: ownerId,
    })),
  )
  .select("id, asset_code, name, home_location_id, current_location_id");

if (assetError || !assets) throw assetError;

const byCode = Object.fromEntries(assets.map((asset) => [asset.asset_code, asset]));

await supabase.from("asset_financials").insert([
  { asset_id: byCode["AST-0001"].id, organization_id: organizationId, purchase_price: 189 },
  { asset_id: byCode["AST-0002"].id, organization_id: organizationId, purchase_price: 249 },
  { asset_id: byCode["AST-0005"].id, organization_id: organizationId, purchase_price: 1099 },
]);

await supabase.from("asset_assignments").insert([
  {
    organization_id: organizationId,
    asset_id: byCode["AST-0002"].id,
    user_id: employeeId,
    location_id: locationId["Job Site A"],
  },
  {
    organization_id: organizationId,
    asset_id: byCode["AST-0005"].id,
    user_id: employeeId,
    location_id: locationId["Job Site A"],
  },
]);

await supabase.from("asset_movements").insert(
  assets.map((asset) => ({
    organization_id: organizationId,
    asset_id: asset.id,
    to_location_id: asset.current_location_id,
    moved_by: ownerId,
    movement_type: asset.home_location_id === asset.current_location_id ? "created" : "move",
    notes: "Demo history",
  })),
);

await supabase.from("asset_requests").insert([
  {
    organization_id: organizationId,
    request_type: "new_tool",
    tool_name: "Angle grinder",
    description: "4.5 inch grinder for metalwork",
    quantity: 1,
    location_id: locationId["Main Workshop"],
    reason: "The shared grinder is under repair.",
    estimated_cost: 129,
    status: "pending",
    requested_by: employeeId,
  },
  {
    organization_id: organizationId,
    request_type: "existing_tool",
    asset_id: byCode["AST-0005"].id,
    quantity: 1,
    location_id: locationId["Job Site A"],
    reason: "Need power for the remodel.",
    status: "pending",
    requested_by: employeeId,
  },
  {
    organization_id: organizationId,
    request_type: "new_tool",
    tool_name: "Shop vacuum",
    quantity: 1,
    location_id: locationId["Warehouse"],
    reason: "Replace the retired vacuum.",
    status: "approved",
    requested_by: managerId,
    reviewed_by: ownerId,
    reviewed_at: new Date().toISOString(),
  },
]);

await supabase.from("asset_activity").insert([
  {
    organization_id: organizationId,
    actor_id: ownerId,
    action_type: "organization_created",
    summary: "Demo company created",
  },
  ...assets.map((asset) => ({
    organization_id: organizationId,
    asset_id: asset.id,
    actor_id: ownerId,
    action_type: "asset_created",
    summary: `Added ${asset.name}`,
  })),
  {
    organization_id: organizationId,
    asset_id: byCode["AST-0002"].id,
    actor_id: employeeId,
    action_type: "asset_checked_out",
    summary: "Checked out",
    new_value: { status: "checked_out" },
  },
  {
    organization_id: organizationId,
    asset_id: byCode["AST-0004"].id,
    actor_id: managerId,
    action_type: "asset_moved",
    summary: "Current location changed",
    previous_value: { current_location_id: locationId["Warehouse"] },
    new_value: { current_location_id: locationId["Service Truck 1"], home_location_id: locationId["Warehouse"] },
  },
]);

console.log("Demo company ready: Example Contracting Ltd.");
console.log("Owner    owner@example-contracting.test");
console.log("Manager  manager@example-contracting.test");
console.log("Employee employee@example-contracting.test");
console.log(`Password ${password}`);

async function ensureUser(email, fullName) {
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (created.data.user) return created.data.user.id;

  const listed = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = listed.data.users.find((user) => user.email === email);
  if (!found) throw created.error ?? new Error(`Could not create ${email}`);
  return found.id;
}

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1).replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
