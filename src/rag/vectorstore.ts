import fs from "fs";
import path from "path";

interface Quote {
  id: string;
  text: string;
  topic: string;
  source: string;
  chapter?: string;
}

let allQuotes: Quote[] = [];

export async function initVectorStore(): Promise<void> {
  const sourcesDir = path.join(__dirname, "../knowledge/sources");

  const almanack: Quote[] = JSON.parse(
    fs.readFileSync(path.join(sourcesDir, "almanack-highlights.json"), "utf-8")
  );
  const tweets: Quote[] = JSON.parse(
    fs.readFileSync(path.join(sourcesDir, "twitter-quotes.json"), "utf-8")
  );
  const skill: Quote[] = JSON.parse(
    fs.readFileSync(path.join(sourcesDir, "naval-skill-quotes.json"), "utf-8")
  );

  allQuotes = [...almanack, ...tweets, ...skill];
  console.log(`Knowledge base loaded: ${allQuotes.length} quotes.`);
}

// Simple keyword + topic relevance scoring (no external DB needed)
function score(quote: Quote, query: string): number {
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/).filter((w) => w.length > 3);
  const textLower = quote.text.toLowerCase();

  let s = 0;
  for (const word of words) {
    if (textLower.includes(word)) s += 1;
  }

  // Topic keyword boost
  const topicKeywords: Record<string, string[]> = {
    wealth: ["money", "rich", "wealth", "earn", "income", "business", "invest", "leverage", "equity", "capital", "salary", "job"],
    happiness: ["happy", "happiness", "peace", "calm", "joy", "suffer", "desire", "content", "meditation", "mind"],
    philosophy: ["life", "truth", "meaning", "purpose", "death", "freedom", "honest", "reality", "identity"],
    decision_making: ["decide", "decision", "choice", "choose", "judgment", "think", "rational", "smart"],
    reading: ["read", "book", "learn", "education", "knowledge", "study"],
    relationships: ["people", "trust", "friend", "relationship", "love", "team"],
    startups: ["startup", "company", "product", "founder", "build", "create", "market"],
  };

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some((k) => queryLower.includes(k)) && quote.topic === topic) {
      s += 3;
    }
  }

  return s;
}

export async function queryQuotes(
  query: string,
  topK: number = 5
): Promise<{ texts: string[]; ids: string[] }> {
  const scored = allQuotes
    .map((q) => ({ quote: q, score: score(q, query) }))
    .sort((a, b) => b.score - a.score);

  // If no good matches, pick random quotes from a relevant topic or just top ones
  const results = scored.slice(0, topK);

  return {
    texts: results.map((r) => r.quote.text),
    ids: results.map((r) => r.quote.id),
  };
}

export function getRandomQuote(excludeIds: string[] = []): Quote | null {
  const available = allQuotes.filter((q) => !excludeIds.includes(q.id));
  if (available.length === 0) return allQuotes[Math.floor(Math.random() * allQuotes.length)];
  return available[Math.floor(Math.random() * available.length)];
}

export function getAllQuotes(): Quote[] {
  return allQuotes;
}
