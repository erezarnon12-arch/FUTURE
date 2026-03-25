import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `אתה מומחה פיננסי של FUTURE — חברה לחינוך פיננסי מבוסס שלוש טבעות: טבעת העתיד (פנסיה, גמל, קרן השתלמות), טבעת הביטחון (קרן חירום, ביטוח, קרן כספית), וטבעת הצמיחה (שוק ההון, נדל"ן, השקעות אלטרנטיביות).

ענה על שאלות פיננסיות בצורה ברורה, מקצועית ובעברית.
- היה ישיר ולעניין
- הסבר מושגים בשפה פשוטה
- אל תמציא נתונים ספציפיים
- אם שאלה אינה קשורה לפיננסים, הפנה בחזרה לנושא`;

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query?.trim()) {
    return new Response("שאלה ריקה", { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messageStream = client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 600,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: query }],
        });

        for await (const chunk of messageStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
      } catch {
        controller.enqueue(new TextEncoder().encode("שגיאה בשרת, נסה שוב"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
