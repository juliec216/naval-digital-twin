import { AdvancedIMessageKit, MessageResponse } from "@photon-ai/advanced-imessage-kit";
import { config } from "../config";
import { generateReply } from "./chat-engine";
import { registerInteraction } from "../knowledge/active-users";

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, (match) => match.replace(/`/g, ""))
    .replace(/^#{1,6}\s/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

async function sendMultiPart(
  sdk: AdvancedIMessageKit,
  chatGuid: string,
  text: string
): Promise<void> {
  const parts = text.split("\n\n").filter((p) => p.trim());
  for (const part of parts) {
    await sdk.messages.sendMessage({
      chatGuid,
      message: stripMarkdown(part.trim()),
    });
  }
}

export async function startChatBot(): Promise<AdvancedIMessageKit> {
  const sdk = new AdvancedIMessageKit({
    serverUrl: config.photon.serverUrl,
    apiKey: config.photon.apiKey,
  });

  // Must connect to start receiving WebSocket events
  await sdk.connect();
  console.log("Naval chat bot connected to iMessage.");

  sdk.on("new-message", async (message: MessageResponse) => {
    if (message.isFromMe) return;

    const handle = message.handle?.address || "";
    const chatGuid = message.chats?.[0]?.guid || "";
    const userText = message.text;

    if (!userText || !chatGuid || !handle) {
      console.log("Skipping message — missing text, chatGuid, or handle.", {
        hasText: !!userText,
        hasChatGuid: !!chatGuid,
        hasHandle: !!handle,
      });
      return;
    }

    console.log(`Incoming from ${handle}: "${userText.slice(0, 80)}"`);

    // Register this user as active (starts daily quotes for them)
    registerInteraction(handle, chatGuid);

    try {
      // Show typing indicator
      await sdk.chats.startTyping(chatGuid);

      // Acknowledge with tapback
      await sdk.messages.sendReaction({
        chatGuid,
        messageGuid: message.guid,
        reaction: "like",
      });

      // Generate Naval-style reply
      const reply = await generateReply(handle, userText);

      // Stop typing
      await sdk.chats.stopTyping(chatGuid);

      // Send reply (multi-part if long)
      if (reply.length > 500) {
        await sendMultiPart(sdk, chatGuid, reply);
      } else {
        await sdk.messages.sendMessage({
          chatGuid,
          message: stripMarkdown(reply),
        });
      }

      console.log(`Replied to ${handle}: "${reply.slice(0, 80)}..."`);
    } catch (err) {
      console.error("Error handling message:", err);
      await sdk.chats.stopTyping(chatGuid).catch(() => {});
    }
  });

  return sdk;
}
