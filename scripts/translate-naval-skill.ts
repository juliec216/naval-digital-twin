import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SOURCE_DIR = path.join(__dirname, "../vendored/naval-skill-source");
const OUT_DIR = path.join(SOURCE_DIR, "translated");

const FILES = [
  "SKILL.md",
  "references/naval-ravikant-agent1-著作与系统思考.md",
  "references/naval-agent2-conversations.md",
  "references/naval-agent3-expression-dna.md",
  "references/quality-validation.md",
  "examples/demo-conversation.md",
];

const SYSTEM_PROMPT = `You are translating a Chinese Markdown document about Naval Ravikant's thought system into English.

Rules:
- Preserve Markdown structure exactly: headings, lists, tables, code fences, blockquotes, frontmatter, emoji.
- Naval Ravikant is the subject. When the source uses "我" (I) in role-played Naval voice, translate as "I" (Naval speaking in first person). Keep that voice — terse, aphoristic, paradoxical.
- Keep proper nouns and English-origin terms (specific knowledge, leverage, AngelList, etc.) in English.
- Do NOT translate code blocks or YAML frontmatter values that are technical identifiers (e.g. \`name: naval-perspective\`).
- Do NOT add commentary, headers, or any "Translation:" prefix. Output only the translated Markdown.
- Naval's voice should sound like English Naval, not literal Chinese-to-English. Where the original uses Chinese idioms, render the underlying meaning in Naval's English style.`;

async function translateFile(relPath: string): Promise<void> {
  const inPath = path.join(SOURCE_DIR, relPath);
  const outPath = path.join(OUT_DIR, relPath.replace(/[一-鿿]+/g, "zh"));

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const source = fs.readFileSync(inPath, "utf-8");
  console.log(`Translating ${relPath} (${source.length} chars)...`);

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 32000,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: source },
    ],
  });

  let translated = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      translated += event.delta.text;
    }
  }

  const final = await stream.finalMessage();
  fs.writeFileSync(outPath, translated);
  console.log(`  -> wrote ${outPath} (${translated.length} chars)`);
  console.log(`  tokens: in=${final.usage.input_tokens} out=${final.usage.output_tokens}`);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is missing.");
    process.exit(1);
  }

  let totalIn = 0;
  let totalOut = 0;
  for (const file of FILES) {
    try {
      await translateFile(file);
    } catch (err) {
      console.error(`Failed to translate ${file}:`, err);
    }
  }
  console.log("\nDone.");
}

main();
