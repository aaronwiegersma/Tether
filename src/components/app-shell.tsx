"use client";

import {
  Activity,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  MoreHorizontal,
  Package,
  ScanLine,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, switchOrganization } from "@/actions/auth";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assets", label: "Assets", icon: Package },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/requests", label: "Requests", icon: ClipboardList },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

const mobile = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/assets", label: "Assets", icon: Package },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/requests", label: "Requests", icon: ClipboardList },
];

function active(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

export function AppShell({
  children,
  orgName,
  fullName,
  email,
  role,
  organizations,
  activeOrgId,
}: {
  children: ReactNode;
  orgName: string;
  fullName: string;
  email: string;
  role: Role;
  organizations: { id: string; name: string }[];
  activeOrgId: string;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 text-foreground dark:bg-zinc-950">
      <div className="md:grid md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="no-print hidden border-r border-border bg-background md:flex md:min-h-screen md:flex-col">
          <div className="px-5 py-5">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
                T
              </span>
              Toolbox
            </Link>
            <p className="mt-3 truncate text-sm text-muted-foreground">{orgName}</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                    active(pathname, link.href)
                      ? "bg-muted font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-3">
            <ThemeToggle />
          </div>
        </aside>

        <div className="min-w-0">
          <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:px-8">
            <Link href="/dashboard" className="font-semibold md:hidden">
              Toolbox
            </Link>
            <form action="/search" className="min-w-0 flex-1">
              <label className="sr-only" htmlFor="global-search">
                Search tools
              </label>
              <input
                id="global-search"
                name="q"
                placeholder="Search name, ID, serial, location"
                className="h-10 w-full rounded-lg border border-border bg-muted/60 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </form>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="max-w-40 truncate">
                  {fullName || email}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>
                  {role} · {orgName}
                </DropdownMenuLabel>
                {organizations.length > 1
                  ? organizations.map((organization) => (
                      <DropdownMenuItem key={organization.id} asChild>
                        <form action={switchOrganization}>
                          <input type="hidden" name="organization_id" value={organization.id} />
                          <button type="submit" className="w-full text-left">
                            {organization.name}
                            {organization.id === activeOrgId ? " · current" : ""}
                          </button>
                        </form>
                      </DropdownMenuItem>
                    ))
                  : null}
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <form action={signOut}>
                    <button type="submit">Sign out</button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="print-sheet mx-auto w-full max-w-6xl px-4 py-6 pb-28 md:px-8 md:pb-10">
            {children}
          </main>
        </div>
      </div>

      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-5 items-end px-2 pt-2 pb-2">
          {mobile.slice(0, 2).map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex flex-col items-center gap-1 text-[11px]",
                  active(pathname, link.href) ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/scan"
            className="-mt-6 flex flex-col items-center gap-1 text-[11px] text-primary"
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <ScanLine className="size-6" />
            </span>
            Scan
          </Link>
          <Link
            href="/requests"
            className={cn(
              "flex flex-col items-center gap-1 text-[11px]",
              active(pathname, "/requests") ? "text-primary" : "text-muted-foreground",
            )}
          >
            <ClipboardList className="size-5" />
            Requests
          </Link>
          <button
            type="button"
            className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground"
            onClick={() => setMoreOpen(true)}
          >
            <MoreHorizontal className="size-5" />
            More
          </button>
        </div>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>More</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            {[
              ["/locations", "Locations"],
              ["/activity", "Activity"],
              ["/settings", "Settings"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className="rounded-lg border border-border px-4 py-3 text-sm font-medium"
              >
                {label}
              </Link>
            ))}
            <ThemeToggle />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
