import { llm, llmModel } from "../../../lib/llm";
import { TRIAGE_SYSTEM_PROMPT } from "../../../lib/prompt";

export async function POST(request: Request) {
  const { ticket } = await request.json();
  const ticketText = `${ticket.subject}\n\n${ticket.body}`;

  const completion = await llm.chat.completions.create({
    model: llmModel,
    messages: [
      { role: "system", content: TRIAGE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `<ticket>\n${ticketText}\n</ticket>`,
      },
    ],
  });

  const answer = completion.choices[0]?.message.content ?? "";

  return new Response(answer, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
