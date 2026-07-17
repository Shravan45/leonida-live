import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pin = await request.json().catch(() => null);
  if (!pin) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!resendKey || !adminEmail) {
    console.error("RESEND_API_KEY or ADMIN_EMAIL not set — skipping email.");
    return NextResponse.json({ ok: true, skipped: true });
  }

  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from: "Leonida Live <onboarding@resend.dev>",
    to: adminEmail,
    subject: `New pin: ${pin.title}`,
    text: [
      `${pin.author_name ?? "Someone"} dropped a new ${pin.category} pin: "${pin.title}"`,
      pin.description ? `\n${pin.description}` : "",
      `\nLocation: ${pin.lat}, ${pin.lng}`,
    ].join(""),
  });

  if (error) {
    console.error("Failed to send new-pin email:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
