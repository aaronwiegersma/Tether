import Link from "next/link";
import { redirect } from "next/navigation";
import { SetupNotice } from "@/components/setup-notice";
import { Button } from "@/components/ui/button";
import { getUserId } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getUserId();
  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <SetupNotice />
      <p className="text-sm font-medium text-primary">Tool tracking for real crews</p>
      <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
        Know where every tool is supposed to be.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        Toolbox keeps a simple record of your equipment, its home, where it is right now,
        and who has it. Scan a QR code or tap an NFC sticker to check it out.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/signup">Create your company</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
      <ul className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          ["Home vs current", "A drill can belong to the warehouse and still be at a job site."],
          ["QR and NFC", "The same web address works on a printed label or a standard NFC sticker."],
          ["Clear roles", "Owners, managers, and employees only see what their job needs."],
        ].map(([title, body]) => (
          <li key={title} className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-medium">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
