import { llmModel, llmModels } from "../../../lib/llm";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ models: llmModels, defaultModel: llmModel });
}
