import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { subscriptionCache } from "../subscribe/route";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? "mailto:admin@schoolzone.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? ""
);

export async function POST(req: NextRequest) {
  const payload = await req.json();

  // Collect subscriptions from Supabase or in-memory fallback
  let rawSubs: string[] = [];
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin.from("push_subscriptions").select("subscription");
    rawSubs = (data ?? []).map((r) => r.subscription as string);
  } else {
    rawSubs = Array.from(subscriptionCache);
  }

  if (rawSubs.length === 0) {
    return NextResponse.json({ sent: 0, message: "No subscribers" });
  }

  const results = await Promise.allSettled(
    rawSubs.map((raw) => {
      const sub = JSON.parse(raw);
      return webpush.sendNotification(sub, JSON.stringify(payload));
    })
  );

  const sent   = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ sent, failed });
}
