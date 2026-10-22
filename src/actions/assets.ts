"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { can, organizationIdForWrite } from "@/lib/auth/permissions";
import { requireContext } from "@/lib/auth/session";
import { parseAssetCsv } from "@/lib/csv";
import { friendlyError } from "@/lib/errors";
import { canAddAssets } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function optional(value: string) {
  return value.length > 0 ? value : null;
}

const enabledTracking = new Set(["standard_label", "qr", "nfc"]);
const statuses = new Set([
  "available",
  "checked_out",
  "in_use",
  "missing",
  "under_repair",
  "retired",
]);

async function refreshAssets() {
  revalidatePath("/assets");
  revalidatePath("/dashboard");
  revalidatePath("/activity");
  revalidatePath("/locations");
}

export async function createAsset(formData: FormData) {
  const context = await requireContext();
  if (!can(context.role, "assets")) redirect("/assets?error=permission");

  const organizationId = organizationIdForWrite(
    context.organization.id,
    text(formData, "organization_id"),
  );

  if (!canAddAssets(context.assetCount, context.assetLimit)) {
    redirect("/assets/new?error=limit");
  }

  const name = text(formData, "name");
  if (name.length < 1) redirect("/assets/new?error=name");

  const tracking = text(formData, "tracking_method") || "qr";
  if (!enabledTracking.has(tracking)) redirect("/assets/new?error=tracking");

  const status = statuses.has(text(formData, "status")) ? text(formData, "status") : "available";
  const assignee = optional(text(formData, "assigned_user_id"));
  if (status === "checked_out" && !assignee) redirect("/assets/new?error=assignee");

  const supabase = await createClient();
  const categoryId = await ensureCategory(supabase, organizationId, text(formData, "category"));
  const home = optional(text(formData, "home_location_id"));
  const current = optional(text(formData, "current_location_id")) ?? home;

  const { data: asset, error } = await supabase
    .from("assets")
    .insert({
      organization_id: organizationId,
      name,
      category_id: categoryId,
      description: optional(text(formData, "description")),
      manufacturer: optional(text(formData, "manufacturer")),
      model: optional(text(formData, "model")),
      serial_number: optional(text(formData, "serial_number")),
      purchase_date: optional(text(formData, "purchase_date")),
      home_location_id: home,
      current_location_id: current,
      assigned_user_id: status === "available" ? null : assignee,
      status,
      tracking_method: tracking,
      notes: optional(text(formData, "notes")),
      created_by: context.userId,
    })
    .select("id")
    .single();

  if (error || !asset) {
    redirect(`/assets/new?error=${encodeURIComponent(friendlyError(error))}`);
  }

  await savePrice(supabase, organizationId, asset.id, text(formData, "purchase_price"));
  await savePhoto(supabase, organizationId, asset.id, formData.get("photo"));

  await supabase.from("asset_activity").insert({
    organization_id: organizationId,
    asset_id: asset.id,
    actor_id: context.userId,
    action_type: "asset_created",
    summary: `Added ${name}`,
    new_value: { name, status, home_location_id: home, current_location_id: current },
  });

  await supabase.from("asset_movements").insert({
    organization_id: organizationId,
    asset_id: asset.id,
    to_location_id: current,
    moved_by: context.userId,
    movement_type: "created",
  });

  await refreshAssets();
  redirect(`/assets/${asset.id}?done=created`);
}

export async function updateAsset(formData: FormData) {
  const context = await requireContext();
  if (!can(context.role, "assets")) redirect("/assets?error=permission");

  const organizationId = context.organization.id;
  const id = text(formData, "asset_id");
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("assets")
    .select("id, name, status, home_location_id, current_location_id, assigned_user_id, tracking_method")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!existing) redirect("/assets");

  const name = text(formData, "name");
  const tracking = text(formData, "tracking_method") || existing.tracking_method;
  if (!enabledTracking.has(tracking) && tracking !== existing.tracking_method) {
    redirect(`/assets/${id}/edit?error=tracking`);
  }

  const status = statuses.has(text(formData, "status")) ? text(formData, "status") : existing.status;
  const assignee = optional(text(formData, "assigned_user_id"));
  const home = optional(text(formData, "home_location_id"));
  const current = optional(text(formData, "current_location_id")) ?? home;
  const categoryId = await ensureCategory(supabase, organizationId, text(formData, "category"));

  const { error } = await supabase
    .from("assets")
    .update({
      name,
      category_id: categoryId,
      description: optional(text(formData, "description")),
      manufacturer: optional(text(formData, "manufacturer")),
      model: optional(text(formData, "model")),
      serial_number: optional(text(formData, "serial_number")),
      purchase_date: optional(text(formData, "purchase_date")),
      home_location_id: home,
      assigned_user_id: status === "checked_out" ? assignee : status === "available" ? null : assignee,
      status,
      tracking_method: enabledTracking.has(tracking) ? tracking : existing.tracking_method,
      notes: optional(text(formData, "notes")),
    })
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) redirect(`/assets/${id}/edit?error=${encodeURIComponent(friendlyError(error))}`);

  if (current && current !== existing.current_location_id) {
    await supabase.rpc("move_asset", {
      target_asset: id,
      to_location: current,
      note: "Updated from the asset form",
    });
  }

  await savePrice(supabase, organizationId, id, text(formData, "purchase_price"));
  await savePhoto(supabase, organizationId, id, formData.get("photo"));

  await supabase.from("asset_activity").insert({
    organization_id: organizationId,
    asset_id: id,
    actor_id: context.userId,
    action_type: "asset_edited",
    summary: `Edited ${name}`,
    previous_value: existing,
    new_value: { name, status, home_location_id: home, current_location_id: current },
  });

  await refreshAssets();
  redirect(`/assets/${id}?done=saved`);
}

export async function archiveAsset(formData: FormData) {
  const context = await requireContext();
  if (!can(context.role, "assets")) redirect("/assets?error=permission");
  const id = text(formData, "asset_id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("assets")
    .update({ archived_at: new Date().toISOString(), status: "retired" })
    .eq("id", id)
    .eq("organization_id", context.organization.id);

  if (!error) {
    await supabase.from("asset_activity").insert({
      organization_id: context.organization.id,
      asset_id: id,
      actor_id: context.userId,
      action_type: "asset_archived",
      summary: "Archived asset",
    });
  }

  await refreshAssets();
  redirect("/assets?done=archived");
}

export async function checkoutAsset(formData: FormData) {
  const context = await requireContext();
  const id = text(formData, "asset_id");
  const assignee =
    context.role === "employee" ? context.userId : optional(text(formData, "assignee")) || context.userId;
  const supabase = await createClient();
  const { error } = await supabase.rpc("checkout_asset", {
    target_asset: id,
    assignee,
    at_location: optional(text(formData, "location_id")),
    note: text(formData, "note"),
  });
  if (error) {
    redirect(`/assets/${id}?panel=checkout&error=${encodeURIComponent(friendlyError(error))}`);
  }
  await refreshAssets();
  redirect(`/assets/${id}?done=checked-out`);
}

export async function returnAsset(formData: FormData) {
  const context = await requireContext();
  const id = text(formData, "asset_id");
  const location = text(formData, "location_id");
  const supabase = await createClient();
  const { data: asset } = await supabase
    .from("assets")
    .select("home_location_id")
    .eq("id", id)
    .eq("organization_id", context.organization.id)
    .maybeSingle();

  const { error } = await supabase.rpc("return_asset", {
    target_asset: id,
    to_location: location,
    note: text(formData, "note"),
  });
  if (error) {
    redirect(`/assets/${id}?panel=return&error=${encodeURIComponent(friendlyError(error))}`);
  }
  await refreshAssets();
  const away = asset?.home_location_id !== location;
  redirect(`/assets/${id}?done=${away ? "returned-away" : "returned"}`);
}

export async function moveAsset(formData: FormData) {
  const id = text(formData, "asset_id");
  await requireContext();
  const supabase = await createClient();
  const { error } = await supabase.rpc("move_asset", {
    target_asset: id,
    to_location: text(formData, "location_id"),
    note: text(formData, "note"),
  });
  if (error) {
    redirect(`/assets/${id}?panel=move&error=${encodeURIComponent(friendlyError(error))}`);
  }
  await refreshAssets();
  redirect(`/assets/${id}?done=moved`);
}

export async function reportProblem(formData: FormData) {
  const id = text(formData, "asset_id");
  await requireContext();
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_asset_problem", {
    target_asset: id,
    problem: text(formData, "problem") || "missing",
    note: text(formData, "note"),
  });
  if (error) {
    redirect(`/assets/${id}?panel=report&error=${encodeURIComponent(friendlyError(error))}`);
  }
  await refreshAssets();
  redirect(`/assets/${id}?done=reported`);
}

export async function importAssets(formData: FormData) {
  const context = await requireContext();
  if (!can(context.role, "assets")) redirect("/assets?error=permission");
  const file = formData.get("file");
  if (!(file instanceof File)) redirect("/assets?error=import");

  const parsed = parseAssetCsv(await file.text());
  if (parsed.error) redirect(`/assets?error=${encodeURIComponent(parsed.error)}`);

  const rows = parsed.rows.slice(0, 200);
  const supabase = await createClient();
  const organizationId = context.organization.id;
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", organizationId)
    .is("archived_at", null);

  let imported = 0;
  const problems: string[] = [];

  for (const row of rows) {
    if (!canAddAssets(context.assetCount + imported, context.assetLimit)) {
      problems.push("Stopped at the plan limit.");
      break;
    }

    const home = locations?.find(
      (location) => location.name.toLowerCase() === row.home_location.toLowerCase(),
    );
    if (row.home_location && !home) {
      problems.push(`${row.name}: location “${row.home_location}” was not found.`);
      continue;
    }

    const tracking = enabledTracking.has(row.tracking_method) ? row.tracking_method : "qr";
    const categoryId = await ensureCategory(supabase, organizationId, row.category);
    const { data: asset, error } = await supabase
      .from("assets")
      .insert({
        organization_id: organizationId,
        name: row.name,
        category_id: categoryId,
        description: optional(row.description),
        manufacturer: optional(row.manufacturer),
        model: optional(row.model),
        serial_number: optional(row.serial_number),
        purchase_date: optional(row.purchase_date),
        home_location_id: home?.id ?? null,
        current_location_id: home?.id ?? null,
        tracking_method: tracking,
        notes: optional(row.notes),
        status: "available",
        created_by: context.userId,
      })
      .select("id")
      .single();

    if (error || !asset) {
      if (error?.message.includes("asset_limit_reached")) {
        problems.push("Stopped at the plan limit.");
        break;
      }
      problems.push(`${row.name}: could not be imported.`);
      continue;
    }

    await savePrice(supabase, organizationId, asset.id, row.purchase_price);
    imported += 1;
  }

  await refreshAssets();
  const summary = `Imported ${imported} asset${imported === 1 ? "" : "s"}.`;
  redirect(
    `/assets?done=${encodeURIComponent(summary)}${problems.length ? `&error=${encodeURIComponent(problems.slice(0, 3).join(" "))}` : ""}`,
  );
}

async function ensureCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  name: string,
) {
  const category = name.trim();
  if (!category) return null;
  const { data: existing } = await supabase
    .from("asset_categories")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("name", category)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("asset_categories")
    .insert({ organization_id: organizationId, name: category })
    .select("id")
    .single();
  return created?.id ?? null;
}

async function savePrice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  assetId: string,
  raw: string,
) {
  if (!raw) return;
  const price = Number(raw);
  if (Number.isNaN(price) || price < 0) return;
  await supabase.from("asset_financials").upsert({
    asset_id: assetId,
    organization_id: organizationId,
    purchase_price: price,
  });
}

async function savePhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  assetId: string,
  value: FormDataEntryValue | null,
) {
  if (!(value instanceof File) || value.size === 0) return;
  if (value.size > 5 * 1024 * 1024) return;
  const type = value.type;
  if (!["image/jpeg", "image/png", "image/webp"].includes(type)) return;
  const extension = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const path = `${organizationId}/${assetId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("asset-photos").upload(path, value, {
    contentType: type,
    upsert: false,
  });
  if (error) return;
  await supabase
    .from("assets")
    .update({ photo_path: path })
    .eq("id", assetId)
    .eq("organization_id", organizationId);
}
