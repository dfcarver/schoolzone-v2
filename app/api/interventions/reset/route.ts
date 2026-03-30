import { supabase } from "../../../../lib/supabase";

export async function POST(): Promise<Response> {
  const { error } = await supabase.from("interventions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
