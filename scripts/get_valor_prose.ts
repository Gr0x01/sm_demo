import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
  const { data } = await supabase.from("step_photos").select("prompt_prose").eq("id", "a9266d4d-07e9-4e64-abe5-eebd8d6e0ca9").single();
  console.log(JSON.stringify(data?.prompt_prose, null, 2));
}
run();
