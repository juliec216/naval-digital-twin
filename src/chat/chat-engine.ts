import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";
import { NAVAL_SYSTEM_PROMPT } from "../rag/prompt-templates";
import { retrieveContext } from "../rag/retriever";

const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });

interface Message {
  role: "user" | "assistant";
  content: string;
}

const conversationHistory: Map<string, Message[]> = new Map();
const MAX_HISTORY = 10;

export async function generateReply(
  contactId: string,
  userMessage: string
): Promise<string> {
  // Retrieve relevant Naval quotes via RAG
  const { prompt } = await retrieveContext(userMessage);

  // Get or create conversation history for this contact
  if (!conversationHistory.has(contactId)) {
    conversationHistory.set(contactId, []);
  }
  const history = conversationHistory.get(contactId)!;

  // Build messages with history + RAG-augmented user message
  const messages: Message[] = [
    ...history,
    { role: "user", content: prompt },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: NAVAL_SYSTEM_PROMPT,
    messages,
  });

  const reply =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Update conversation history (sliding window)
  history.push({ role: "user", content: userMessage });
  history.push({ role: "assistant", content: reply });
  if (history.length > MAX_HISTORY * 2) {
    history.splice(0, 2);
  }

  return reply;
}

export function clearHistory(contactId: string): void {
  conversationHistory.delete(contactId);
}
