import { queryQuotes } from "./vectorstore";
import { buildRAGPrompt } from "./prompt-templates";

export async function retrieveContext(
  userMessage: string
): Promise<{ prompt: string; quotes: string[] }> {
  const { texts } = await queryQuotes(userMessage, 5);

  return {
    prompt: buildRAGPrompt(userMessage, texts),
    quotes: texts,
  };
}
