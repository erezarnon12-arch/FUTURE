import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { name, age, phone } = await req.json();

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "FUTURE App <onboarding@resend.dev>",
      to: "erezarnon12@gmail.com",
      subject: `פנייה חדשה מ-FUTURE — ${name}`,
      html: `
        <div dir="rtl" style="font-family: sans-serif; max-width: 500px;">
          <h2 style="color: #6366f1;">פנייה חדשה מהאתר</h2>
          <table style="width:100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold;">שם:</td><td style="padding: 8px;">${name}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">גיל:</td><td style="padding: 8px;">${age}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">טלפון:</td><td style="padding: 8px;">${phone}</td></tr>
          </table>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Email error:", err);
    return NextResponse.json({ error: "שגיאה בשליחת המייל" }, { status: 500 });
  }
}
