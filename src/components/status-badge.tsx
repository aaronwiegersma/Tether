import { Badge } from "@/components/ui/badge";
import { statusMeta } from "@/lib/assets/constants";

export function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta(status);
  return <Badge className={meta.tone}>{meta.label}</Badge>;
}
