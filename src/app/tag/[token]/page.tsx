import Link from "next/link";
import { redirect } from "next/navigation";
import { LocationMark } from "@/components/location-mark";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { getUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { PublicTag } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TagPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const user = await getUserId();

  if (user) {
    const { data: assetId } = await supabase.rpc("resolve_tag_for_member", {
      tag_token: token,
    });
    if (assetId) redirect(`/assets/${assetId}?panel=actions`);
  }

  const { data } = await supabase.rpc("get_public_tag", { tag_token: token });
  const tag = data as PublicTag | null;

  if (!tag) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold">Tag not recognized</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This QR code or NFC sticker does not match an active tool.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <p className="text-sm text-muted-foreground">{tag.organization_name}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{tag.asset_name}</h1>
      <p className="mt-1 font-mono text-sm text-muted-foreground">{tag.asset_code}</p>
      <div className="mt-4">
        <StatusBadge status={tag.status} />
      </div>
      {tag.home_location ? (
        <div className="mt-8 rounded-2xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Return to</p>
          <p className="mt-2 text-xl font-medium">
            <LocationMark
              color={tag.home_location.color}
              icon={tag.home_location.icon}
              name={tag.home_location.name}
              size={22}
            />
          </p>
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          Return instructions are hidden by this company.
        </p>
      )}
      {!user ? (
        <Button asChild className="mt-8" variant="outline">
          <Link href={`/login?next=/tag/${token}`}>Employee sign in</Link>
        </Button>
      ) : null}
    </main>
  );
}
