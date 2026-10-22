import Link from "next/link";
import QRCode from "qrcode";
import { LocationMark } from "@/components/location-mark";
import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
import { requireContext } from "@/lib/auth/session";
import { LABEL_SIZES, type LabelSize } from "@/lib/assets/constants";
import { getAppUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Labels" };

const dimensions: Record<LabelSize, string> = {
  small: "h-[1in] w-[2in]",
  medium: "h-[2in] w-[3in]",
  large: "h-[2.5in] w-[4in]",
};

export default async function LabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string | string[]; size?: string }>;
}) {
  const context = await requireContext();
  const params = await searchParams;
  const ids = (Array.isArray(params.ids) ? params.ids : params.ids ? [params.ids] : [])
    .flatMap((value) => value.split(","))
    .filter(Boolean);
  const size: LabelSize = params.size === "small" || params.size === "large" ? params.size : "medium";

  const supabase = await createClient();
  const { data: assets } = await supabase
    .from("assets")
    .select("id, name, asset_code, public_token, home_location:locations!assets_home_location_id_fkey(name, color, icon)")
    .eq("organization_id", context.organization.id)
    .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  const labels = await Promise.all(
    (assets ?? []).map(async (asset) => {
      const url = `${getAppUrl()}/tag/${asset.public_token}`;
      const qr = await QRCode.toDataURL(url, { margin: 0, width: 280, errorCorrectionLevel: "M" });
      const home = Array.isArray(asset.home_location) ? asset.home_location[0] : asset.home_location;
      return { ...asset, url, qr, home };
    }),
  );

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Labels</h1>
          <p className="text-sm text-muted-foreground">
            Print this page or choose Save as PDF. Each code opens the same address an NFC sticker would use.
          </p>
        </div>
        <div className="flex gap-2">
          {LABEL_SIZES.map((item) => (
            <Button key={item.id} asChild variant={item.id === size ? "default" : "outline"} size="sm">
              <Link href={`/assets/labels?ids=${ids.join(",")}&size=${item.id}`}>
                {item.label}
              </Link>
            </Button>
          ))}
          <PrintButton />
        </div>
      </div>
      {labels.length === 0 ? (
        <p className="text-sm text-muted-foreground">Select tools from the assets list to print labels.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {labels.map((label) => (
            <article
              key={label.id}
              className={`${dimensions[size]} flex gap-2 overflow-hidden rounded-md border border-black bg-white p-2 text-black`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={label.qr} alt="" className="h-full w-auto" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-semibold uppercase">{context.organization.name}</p>
                <p className="truncate text-sm font-semibold leading-tight">{label.name}</p>
                <p className="font-mono text-[10px]">{label.asset_code}</p>
                {label.home ? (
                  <p className="mt-1 text-[11px] leading-tight">
                    Return to{" "}
                    <LocationMark
                      color={label.home.color}
                      icon={label.home.icon}
                      name={label.home.name}
                      size={12}
                    />
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
