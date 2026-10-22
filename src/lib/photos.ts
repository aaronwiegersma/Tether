import { createClient } from "@/lib/supabase/server";

export async function signedPhoto(path: string | null | undefined) {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("asset-photos").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
