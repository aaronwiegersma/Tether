import Link from "next/link";
import { reviewRequest } from "@/actions/requests";
import { Flash } from "@/components/flash";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/input";
import { can } from "@/lib/auth/permissions";
import { requireContext } from "@/lib/auth/session";
import { formatDateTime, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Requests" };

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const context = await requireContext();
  const flash = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("asset_requests")
    .select("id, request_type, tool_name, description, quantity, reason, product_url, estimated_cost, status, created_at, review_note, asset:assets(name), location:locations(name), requester:profiles!asset_requests_requested_by_fkey(full_name)")
    .eq("organization_id", context.organization.id)
    .order("created_at", { ascending: false });

  if (!can(context.role, "approve")) {
    query = query.eq("requested_by", context.userId);
  }

  const { data: requests } = await query;

  return (
    <div>
      <PageHeader
        title="Requests"
        description={can(context.role, "approve") ? "Review tool requests from your crew." : "Ask for a tool you need."}
        action={<Button asChild><Link href="/requests/new">New request</Link></Button>}
      />
      <Flash error={flash.error} done={flash.done} />
      <div className="space-y-3">
        {(requests ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          requests?.map((request) => {
            const asset = one(request.asset);
            const location = one(request.location);
            const requester = one(request.requester);
            return (
              <article key={request.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium">
                    {request.request_type === "new_tool" ? request.tool_name : asset?.name || "Tool"}
                  </h2>
                  <StatusBadge status={request.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {request.request_type === "new_tool" ? "Purchase" : "Existing tool"} · Qty {request.quantity}
                  {location?.name ? ` · ${location.name}` : ""} · {requester?.full_name || "Someone"} · {formatDateTime(request.created_at)}
                </p>
                {request.reason ? <p className="mt-2 text-sm">{request.reason}</p> : null}
                {request.description ? <p className="mt-1 text-sm text-muted-foreground">{request.description}</p> : null}
                {request.estimated_cost != null && can(context.role, "approve") ? (
                  <p className="mt-1 text-sm">Estimate {formatMoney(request.estimated_cost)}</p>
                ) : null}
                {request.product_url ? (
                  <a className="mt-1 inline-block text-sm underline" href={request.product_url}>Product link</a>
                ) : null}
                {request.review_note ? <p className="mt-2 text-sm">Note: {request.review_note}</p> : null}
                {can(context.role, "approve") && request.status === "pending" ? (
                  <form action={reviewRequest} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input type="hidden" name="request_id" value={request.id} />
                    <input name="review_note" placeholder="Note for the requester" className={fieldClass} />
                    <div className="flex gap-2">
                      <Button name="status" value="approved" type="submit">Approve</Button>
                      <Button name="status" value="rejected" type="submit" variant="outline">Reject</Button>
                      <Button name="status" value="fulfilled" type="submit" variant="secondary">Fulfilled</Button>
                    </div>
                  </form>
                ) : null}
                {can(context.role, "approve") && request.status === "approved" ? (
                  <form action={reviewRequest} className="mt-3">
                    <input type="hidden" name="request_id" value={request.id} />
                    <Button name="status" value="fulfilled" type="submit">Mark fulfilled</Button>
                  </form>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

function one<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
