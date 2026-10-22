import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Scanner } from "@/components/scanner";
import { requireContext } from "@/lib/auth/session";
import { parseScanInput } from "@/lib/scan";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Scan" };

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const context = await requireContext();
  const { q } = await searchParams;

  if (q) {
    const parsed = parseScanInput(q);
    const supabase = await createClient();
    if (parsed?.kind === "token") {
      const { data } = await supabase.rpc("resolve_tag_for_member", { tag_token: parsed.token });
      if (data) redirect(`/assets/${data}?panel=actions`);
      const { data: pub } = await supabase.rpc("get_public_tag", { tag_token: parsed.token });
      if (pub) redirect(`/tag/${parsed.token}`);
    }
    if (parsed?.kind === "code") {
      const { data } = await supabase
        .from("assets")
        .select("id")
        .eq("organization_id", context.organization.id)
        .ilike("asset_code", parsed.code)
        .maybeSingle();
      if (data) redirect(`/assets/${data.id}?panel=actions`);
    }
    if (parsed?.kind === "text") {
      const escaped = parsed.text.replace(/[%_]/g, "");
      const { data } = await supabase
        .from("assets")
        .select("id")
        .eq("organization_id", context.organization.id)
        .or(`name.ilike.%${escaped}%,serial_number.ilike.%${escaped}%,asset_code.ilike.%${escaped}%`)
        .limit(2);
      if (data?.length === 1) redirect(`/assets/${data[0].id}?panel=actions`);
      if ((data?.length ?? 0) > 1) redirect(`/assets?q=${encodeURIComponent(parsed.text)}`);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Scan a tool"
        description="Point the camera at a Toolbox QR code, or type the ID if the camera is unavailable."
      />
      <Scanner error={q ? "No tool matched that scan." : undefined} />
    </div>
  );
}
