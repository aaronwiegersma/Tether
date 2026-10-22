import type { AssetStatus, TrackingMethod } from "@/lib/types";

export const STATUS_OPTIONS: { value: AssetStatus; label: string; tone: string }[] = [
  { value: "available", label: "Available", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900" },
  { value: "checked_out", label: "Checked out", tone: "bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:ring-blue-900" },
  { value: "in_use", label: "In use", tone: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-900" },
  { value: "missing", label: "Missing", tone: "bg-red-50 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-900" },
  { value: "under_repair", label: "Under repair", tone: "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900" },
  { value: "retired", label: "Retired", tone: "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700" },
];

export function statusMeta(status: string) {
  return (
    STATUS_OPTIONS.find((item) => item.value === status) ?? {
      value: status,
      label: status,
      tone: "bg-zinc-100 text-zinc-700 ring-zinc-200",
    }
  );
}

export const TRACKING_OPTIONS: {
  value: TrackingMethod;
  label: string;
  enabled: boolean;
  hint: string;
}[] = [
  {
    value: "standard_label",
    label: "Standard label",
    enabled: true,
    hint: "A printed name and return location. A QR code is still included.",
  },
  {
    value: "qr",
    label: "QR code",
    enabled: true,
    hint: "Scan the label to open this tool.",
  },
  {
    value: "nfc",
    label: "NFC",
    enabled: true,
    hint: "A standard NFC sticker that opens this tool's web address.",
  },
  {
    value: "bluetooth",
    label: "Bluetooth (coming soon)",
    enabled: false,
    hint: "Live Bluetooth tags are not connected yet.",
  },
  {
    value: "gps",
    label: "GPS (coming soon)",
    enabled: false,
    hint: "GPS devices are not connected yet.",
  },
];

export const LOCATION_COLORS = [
  "#2563eb",
  "#16a34a",
  "#ea580c",
  "#9333ea",
  "#dc2626",
  "#0891b2",
  "#ca8a04",
  "#475569",
];

export const LOCATION_ICONS = [
  { id: "circle", label: "Circle" },
  { id: "triangle", label: "Triangle" },
  { id: "square", label: "Square" },
  { id: "diamond", label: "Diamond" },
  { id: "hexagon", label: "Hexagon" },
  { id: "warehouse", label: "Warehouse" },
  { id: "truck", label: "Truck" },
  { id: "building", label: "Building" },
  { id: "wrench", label: "Wrench" },
] as const;

export const LABEL_SIZES = [
  { id: "small", label: "Small", detail: "2 × 1 in" },
  { id: "medium", label: "Medium", detail: "3 × 2 in" },
  { id: "large", label: "Large", detail: "4 × 2.5 in" },
] as const;

export type LabelSize = (typeof LABEL_SIZES)[number]["id"];
