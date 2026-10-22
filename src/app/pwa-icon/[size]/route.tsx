import { ImageResponse } from "next/og";
import { Mark } from "@/components/pwa-mark";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  const px = size === "512" ? 512 : 192;
  return new ImageResponse(<Mark size={px} />, { width: px, height: px });
}
