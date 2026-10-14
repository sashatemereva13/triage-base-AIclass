import OpenAI from "openai";
import { llm, llmModel } from "../../../lib/llm";
import { PROMPT_VERSION, TRIAGE_V2_SYSTEM_PROMPT } from "../../../lib/promptV2";
import {
  TriageJsonSchema,
  TriageResultSchema,
  TriageTicketSchema,
} from "../../../lib/schema";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid request. Please check the ticket fields." },
      { status: 400 },
    );
  }

  const pastedTicket =
    typeof body === "object" && body !== null && "ticket" in body
      ? body.ticket
      : undefined;

  if (typeof pastedTicket !== "object" || pastedTicket === null) {
    return Response.json(
      { error: "Please paste a ticket object with a subject and body." },
      { status: 400 },
    );
  }

  const ticketFields = {
    subject: "subject" in pastedTicket ? pastedTicket.subject : "",
    body: "body" in pastedTicket ? pastedTicket.body : "",
  };

  const ticket = TriageTicketSchema.safeParse(ticketFields);
  if (!ticket.success) {
    return Response.json(
      {
        error:
          "The ticket must have a subject and a body (up to 5,000 characters).",
      },
      { status: 400 },
    );
  }

  try {
    const completion = await llm.chat.completions.create({
      model: llmModel,
      messages: [
        { role: "system", content: TRIAGE_V2_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(ticket.data) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "support_ticket_triage",
          strict: true,
          schema: TriageJsonSchema,
        },
      },
    });

    const content = completion.choices[0]?.message.content;
    if (!content) {
      return Response.json(
        { error: "The triage service returned no result. Please try again." },
        { status: 502 },
      );
    }

    let modelResult: unknown;
    try {
      modelResult = JSON.parse(content);
    } catch {
      return Response.json(
        {
          error:
            "The triage service returned an unreadable result. Please try again.",
        },
        { status: 502 },
      );
    }

    const result = TriageResultSchema.safeParse(modelResult);
    if (!result.success) {
      return Response.json(
        {
          error:
            "The triage service returned an invalid result. Please try again.",
        },
        { status: 502 },
      );
    }

    return Response.json({
      result: result.data,
      promptVersion: PROMPT_VERSION,
    });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 404) {
        return Response.json(
          {
            error:
              "The configured triage model was not found. Please contact support.",
          },
          { status: 502 },
        );
      }
      if (error.status === 401 || error.status === 403) {
        return Response.json(
          {
            error:
              "The triage service is not configured correctly. Please contact support.",
          },
          { status: 503 },
        );
      }
      return Response.json(
        {
          error:
            "The triage service is temporarily unavailable. Please try again.",
        },
        { status: 502 },
      );
    }

    // Keep exception details (and configuration) out of browser responses.
    return Response.json(
      { error: "Unable to triage this ticket right now. Please try again." },
      { status: 502 },
    );
  }
}
