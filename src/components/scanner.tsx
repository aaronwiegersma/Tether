"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Scanner({ error }: { error?: string }) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const regionId = "qr-reader";
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let scanner: { stop: () => Promise<void> } | null = null;
    let active = true;

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!active) return;
        const instance = new Html5Qrcode(regionId);
        scanner = instance;
        await instance.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 220, height: 220 } },
          (text) => {
            window.location.href = `/scan?q=${encodeURIComponent(text)}`;
          },
          () => undefined,
        );
      } catch {
        if (active) {
          setCameraError("Camera access is unavailable. Enter the tool ID instead.");
        }
      }
    }

    void start();

    return () => {
      active = false;
      void scanner?.stop().catch(() => undefined);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div
        id={regionId}
        className="overflow-hidden rounded-2xl border border-border bg-black"
      />
      {cameraError ? <p className="text-sm text-muted-foreground">{cameraError}</p> : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <form action="/scan" className="space-y-3">
        <label className="block text-sm font-medium" htmlFor="manual-id">
          Tool ID, serial number, or name
        </label>
        <Input id="manual-id" name="q" placeholder="AST-0001" autoComplete="off" />
        <Button type="submit" className="w-full" size="lg">
          Find tool
        </Button>
      </form>
    </div>
  );
}
