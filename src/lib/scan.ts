export type ScanParse =
  | { kind: "token"; token: string }
  | { kind: "code"; code: string }
  | { kind: "text"; text: string };

const TOKEN = /^[a-f0-9]{32,128}$/i;
const CODE = /^AST-\d+$/i;

export function parseScanInput(raw: string): ScanParse | null {
  const value = raw.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const tagIndex = parts.findIndex((part) => part === "tag");
    if (tagIndex >= 0 && parts[tagIndex + 1]) {
      return { kind: "token", token: decodeURIComponent(parts[tagIndex + 1]) };
    }
  } catch {
    // Not a URL. Fall through to token, asset code, or text search.
  }

  if (CODE.test(value)) {
    return { kind: "code", code: value.toUpperCase() };
  }

  if (TOKEN.test(value)) {
    return { kind: "token", token: value.toLowerCase() };
  }

  return { kind: "text", text: value };
}

export function tagPath(token: string) {
  return `/tag/${token}`;
}
