import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">That link does not match a Toolbox page.</p>
      <Link href="/dashboard" className="mt-4 text-sm underline">
        Go to the dashboard
      </Link>
    </main>
  );
}
