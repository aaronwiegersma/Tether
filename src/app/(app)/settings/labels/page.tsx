import { PageHeader } from "@/components/page-header";
import { requireContext } from "@/lib/auth/session";

export const metadata = { title: "Labels and trackers" };

const options = [
  {
    name: "Printable QR labels",
    detail: "Included. Print them from any tool or as a batch.",
    state: "Available",
  },
  {
    name: "Custom printed labels",
    detail: "Pre-printed sheets with your company name. Not sold in the app yet.",
    state: "Coming soon",
  },
  {
    name: "NFC stickers",
    detail: "Use any standard NFC sticker and write the tool address with a writing app.",
    state: "Bring your own",
  },
  {
    name: "Bluetooth tags",
    detail: "Live proximity tracking is not connected. No devices can be purchased or paired here.",
    state: "Coming soon",
  },
  {
    name: "GPS tracking devices",
    detail: "Upfront hardware and a later subscription. Not available, and no location is simulated.",
    state: "Coming soon",
  },
];

export default async function LabelsSettingsPage() {
  await requireContext();

  return (
    <div>
      <PageHeader
        title="Labels & trackers"
        description="Self-printed labels are free. Paid labels and trackers will be offered later. Nothing on this page places an order."
      />
      <ul className="space-y-3">
        {options.map((option) => (
          <li key={option.name} className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium">{option.name}</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{option.state}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{option.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
