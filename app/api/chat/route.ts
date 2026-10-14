import { llm, llmModel } from "../../../lib/llm";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function isChatMessage(value: unknown): value is ChatMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "role" in value &&
    (value.role === "user" || value.role === "assistant") &&
    "content" in value &&
    typeof value.content === "string" &&
    value.content.trim().length > 0
  );
}

function isChatMessageArray(value: unknown): value is ChatMessage[] {
  return Array.isArray(value) && value.length > 0 && value.every(isChatMessage);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("messages" in body) ||
    !isChatMessageArray(body.messages)
  ) {
    return Response.json(
      { error: "Please provide a non-empty message string." },
      { status: 400 },
    );
  }

  try {
    const completion = await llm.chat.completions.create({
      model: llmModel,
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Answer clearly and concisely.",
        },
        ...body.messages,
      ],
    });

    const answer = completion.choices[0]?.message.content;
    if (!answer) {
      throw new Error("The model returned no answer.");
    }

    return Response.json({ answer });
  } catch (error) {
    console.error("LLM request failed:", error);
    return Response.json(
      { error: "Unable to get a response from the LLM" },
      { status: 502 },
    );
  }
}
