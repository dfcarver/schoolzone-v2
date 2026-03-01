import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { subscriptionCache } from "@/lib/pushSubscriptionCache";

export async function POST(req: NextRequest) {
  const subscription = await req.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  if (supabaseAdmin) {
    await supabaseAdmin
      .from("push_subscriptions")
      .upsert({ endpoint: subscription.endpoint, subscription: JSON.stringify(subscription) }, { onConflict: "endpoint" });
  } else {
    // In-process fallback: store in module-level Set (resets on cold start)
    subscriptionCache.add(JSON.stringify(subscription));
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json();
  if (supabaseAdmin) {
    await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", endpoint);
  } else {
    for (const s of subscriptionCache) {
      if (JSON.parse(s).endpoint === endpoint) subscriptionCache.delete(s);
    }
  }
  return NextResponse.json({ ok: true });
}

