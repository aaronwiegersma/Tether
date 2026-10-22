"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type NdefReaderConstructor = new () => {
  write: (message: { records: { recordType: string; data: string }[] }) => Promise<void>;
};

export function NfcWriter({ url }: { url: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const supported = typeof window !== "undefined" && "NDEFReader" in window;

  async function write() {
    const Reader = (window as Window & { NDEFReader?: NdefReaderConstructor }).NDEFReader;
    if (!Reader) {
      setMessage("This browser cannot write NFC stickers. Use the steps below.");
      return;
    }

    setPending(true);
    setMessage("Hold the sticker against your phone.");
    try {
      const writer = new Reader();
      await writer.write({ records: [{ recordType: "url", data: url }] });
      setMessage("The sticker now opens this tool.");
    } catch {
      setMessage("The sticker was not written. You can still copy the address into an NFC app.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {supported ? (
        <Button type="button" onClick={write} disabled={pending}>
          {pending ? "Waiting for sticker…" : "Write with this phone"}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          This browser cannot program NFC stickers. That is normal on iPhone and most desktop
          browsers. Use a blank NFC sticker and a writing app instead.
        </p>
      )}
      {message ? <p className="text-sm">{message}</p> : null}
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Copy this tool&apos;s address.</li>
        <li>Open an NFC writing app such as NFC Tools.</li>
        <li>Add a URL record, paste the address, and write it to a blank sticker.</li>
        <li>Tap the sticker with a phone. It opens the same page as the QR code.</li>
      </ol>
    </div>
  );
}
