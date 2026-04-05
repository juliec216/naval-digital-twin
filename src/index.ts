import { config } from "./config";
import { initVectorStore } from "./rag/vectorstore";
import { startChatBot } from "./chat/imessage-bot";
import { sendDailyQuotes } from "./daily-push/sender";
import { loadActiveUsers } from "./knowledge/active-users";

function msUntilNextSend(): number {
  const [hours, minutes] = config.dailyQuote.time.split(":").map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

async function main() {
  console.log("Starting Naval Digital Twin...\n");

  if (!config.photon.serverUrl || !config.photon.apiKey) {
    console.error("Missing Photon credentials. Check .env file.");
    process.exit(1);
  }
  if (!config.anthropic.apiKey) {
    console.error("Missing ANTHROPIC_API_KEY. Check .env file.");
    process.exit(1);
  }

  // Load knowledge base + active users
  console.log("Loading knowledge base...");
  await initVectorStore();
  loadActiveUsers();

  // Start iMessage chat bot
  console.log("Starting iMessage chat bot...");
  const sdk = await startChatBot();

  // Schedule daily quotes
  function scheduleDailyQuotes() {
    const ms = msUntilNextSend();
    const nextTime = new Date(Date.now() + ms);
    console.log(`Next daily quote batch at: ${nextTime.toLocaleString()}`);

    setTimeout(async () => {
      await sendDailyQuotes(sdk);
      // Schedule again for next day
      scheduleDailyQuotes();
    }, ms);
  }

  scheduleDailyQuotes();

  console.log("\nNaval Digital Twin is running.");
  console.log("- Chat bot: listening for iMessages (anyone who texts gets Naval)");
  console.log(`- Daily quotes: sent at ${config.dailyQuote.time} to active users`);
  console.log(`- Inactivity cutoff: ${config.dailyQuote.inactivityDays} days`);
  console.log("\nPress Ctrl+C to stop.\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
