import { config } from "./config";
import { initVectorStore } from "./rag/vectorstore";
import { startChatBot } from "./chat/imessage-bot";
import { startScheduler } from "./daily-push/scheduler";
import { loadActiveUsers } from "./knowledge/active-users";

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

  console.log("Loading knowledge base...");
  await initVectorStore();
  loadActiveUsers();

  console.log("Starting iMessage chat bot...");
  const sdk = await startChatBot();

  startScheduler(sdk);

  console.log("\nNaval Digital Twin is running.");
  console.log("- Chat bot: listening for iMessages (new users get onboarded)");
  console.log(
    `- Daily quotes: 4x per user-local day at ${config.dailyQuote.slots
      .map((s) => `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`)
      .join(", ")}`
  );
  console.log(`- Inactivity cutoff: ${config.dailyQuote.inactivityDays} days`);
  console.log("\nPress Ctrl+C to stop.\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
