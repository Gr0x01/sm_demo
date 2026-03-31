import { getServiceClient } from "@/lib/supabase";

export async function getCursor(key: string): Promise<string> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("sync_cursors")
    .select("value")
    .eq("key", key)
    .single();

  if (error || !data) {
    throw new Error(`Failed to read cursor "${key}": ${error?.message}`);
  }
  return data.value;
}

export async function setCursor(key: string, value: string): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("sync_cursors")
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) {
    throw new Error(`Failed to update cursor "${key}": ${error.message}`);
  }
}
