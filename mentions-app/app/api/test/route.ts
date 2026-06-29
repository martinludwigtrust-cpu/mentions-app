import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("pg_stat_activity")
    .select("*")
    .limit(1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message });
  }

  return NextResponse.json({ ok: true, message: "Supabase connection works!" });
}
