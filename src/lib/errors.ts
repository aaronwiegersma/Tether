const known: Record<string, string> = {
  asset_limit_reached:
    "This company has reached its asset limit. Archive a tool or upgrade the plan to add more.",
  forbidden: "You do not have permission to do that.",
  not_authenticated: "Please sign in again.",
  invalid_location: "Choose a location that belongs to your company.",
  invalid_assignee: "Choose a person from your company.",
  invalid_invitation: "This invitation is invalid or has expired.",
  email_mismatch: "Sign in with the email address that received the invitation.",
  last_owner: "Your company needs at least one owner.",
  cannot_remove_self: "Another owner has to remove you.",
  retired_asset: "Retired tools cannot be checked out.",
  invalid_name: "Enter a company name between 2 and 80 characters.",
  not_found: "That tool could not be found.",
  asset_required: "Choose the tool you want to request.",
  name_required: "Enter a name for the tool.",
};

export function friendlyError(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";
  for (const [code, text] of Object.entries(known)) {
    if (message.includes(code)) return text;
  }
  if (/row-level security|permission denied/i.test(message)) {
    return "You do not have permission to do that.";
  }
  return "Something went wrong. Please try again.";
}
