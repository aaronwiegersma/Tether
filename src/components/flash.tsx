const doneMessages: Record<string, string> = {
  created: "Tool added.",
  saved: "Changes saved.",
  archived: "Archived.",
  "checked-out": "Checked out. It is now assigned.",
  returned: "Returned home. The assignment is cleared.",
  "returned-away": "Returned. It is not at its home location, so it stays flagged as away from home.",
  moved: "Current location updated. The home location did not change.",
  reported: "Problem reported. It is visible on the dashboard and in activity.",
  submitted: "Request submitted.",
  reviewed: "Request updated.",
  invited: "Invitation created. Copy the link and send it to your teammate.",
  role: "Role updated.",
  removed: "Person removed.",
};

export function Flash({
  error,
  done,
}: {
  error?: string;
  done?: string;
}) {
  if (!error && !done) return null;
  const success = done ? doneMessages[done] || done : null;

  return (
    <div className="mb-4 space-y-2">
      {success ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-100">
          {error === "limit"
            ? "You have reached the asset limit for this plan."
            : error === "permission"
              ? "You do not have permission to do that."
              : error === "name"
                ? "Enter a name."
                : error === "tracking"
                  ? "Bluetooth and GPS tracking are not available yet."
                  : error === "assignee"
                    ? "Choose who is checking this tool out."
                    : error === "asset"
                      ? "Choose a tool."
                      : error === "url"
                        ? "Product links need to start with http:// or https://."
                        : error === "email"
                          ? "Enter a valid email address."
                          : error}
        </p>
      ) : null}
    </div>
  );
}
