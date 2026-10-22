import Link from "next/link";
import type { ReactNode } from "react";
import { SetupNotice } from "@/components/setup-notice";

export function AuthScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <SetupNotice />
      <Link href="/" className="mb-6 font-semibold">
        Toolbox
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">{subtitle}</p>
      {children}
    </main>
  );
}
