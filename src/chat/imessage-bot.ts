import { AdvancedIMessageKit, MessageResponse } from "@photon-ai/advanced-imessage-kit";
import { config } from "../config";
import { generateReply } from "./chat-engine";
import { getUser, registerInteraction, setUserTimezone } from "../knowledge/active-users";
import { computeOffsetMinutes, formatOffset, parseLocalTime } from "../onboarding/timezone";

const ONBOARDING_PROMPT =
  "Hey. Before we get into it — what's your local time right now? Reply with something like \"3:00 PM\" or \"15:30\". I'll send you a few thoughts a day at the right hours.";
const ONBOARDING_RETRY =
  "I couldn't read that as a time. Try \"3:00 PM\", \"15:30\", or just \"9 am\".";

function welcomeMessage(offsetMinutes: number): string {
  return `Got it — you're at ${formatOffset(offsetMinutes)}. Three things.

One: I'll send four thoughts a day at 8am, noon, 7pm, and 11pm your time. Read them or don't.

Two: ask me about wealth, happiness, work, books, decisions, anything you're stuck on. That's where I can be useful. Outside that, I won't pretend.

Three: I'll go quiet if you do. Two days of silence and the daily ones stop until you write back.

Start anywhere.`;
}

function pickReaction(text: string): string | null {
  const t = text.toLowerCase();

  if (/❤|♥|💕|💖|🙏/.test(text) || /\b(thank|thanks|thx|appreciate|love this|amazing|wow|beautiful)\b/.test(t)) {
    return "love";
  }

  if (/😂|🤣|😆|🤪/.test(text) || /\b(haha+|lol|lmao|hilarious|funny)\b/.test(t)) {
    return "laugh";
  }

  if (text.trim().endsWith("?")) return null;

  const r = Math.random();
  if (r < 0.65) return null;
  if (r < 0.85) return "like";
  if (r < 0.95) return "love";
  return "emphasize";
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, (match) => match.replace(/`/g, ""))
    .replace(/^#{1,6}\s/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

const MAX_MESSAGES_PER_REPLY = 2;

async function sendMultiPart(
  sdk: AdvancedIMessageKit,
  chatGuid: string,
  text: string
): Promise<void> {
  const paragraphs = text.split("\n\n").map((p) => p.trim()).filter(Boolean);
  const parts =
    paragraphs.length <= MAX_MESSAGES_PER_REPLY
      ? paragraphs
      : [
          paragraphs[0],
          paragraphs.slice(1).join(" "),
        ];

  for (const part of parts) {
    await sdk.messages.sendMessage({
      chatGuid,
      message: stripMarkdown(part),
    });
  }
}

export async function startChatBot(): Promise<AdvancedIMessageKit> {
  const sdk = new AdvancedIMessageKit({
    serverUrl: config.photon.serverUrl,
    apiKey: config.photon.apiKey,
  });

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

    await sdk.chats.markChatRead(chatGuid).catch((err) =>
      console.error("Failed to mark chat as read:", err)
    );

    const wasNew = !getUser(handle);
    registerInteraction(handle, chatGuid);
    const user = getUser(handle)!;

    if (wasNew) {
      await sdk.messages.sendMessage({ chatGuid, message: ONBOARDING_PROMPT });
      return;
    }

    if (!user.onboardingComplete) {
      const local = parseLocalTime(userText);
      if (!local) {
        await sdk.messages.sendMessage({ chatGuid, message: ONBOARDING_RETRY });
        return;
      }
      const offset = computeOffsetMinutes(local, new Date());
      setUserTimezone(handle, offset);
      await sdk.messages.sendMessage({ chatGuid, message: welcomeMessage(offset) });
      return;
    }

    try {
      await sdk.chats.startTyping(chatGuid);

      const reaction = pickReaction(userText);
      if (reaction) {
        await sdk.messages.sendReaction({
          chatGuid,
          messageGuid: message.guid,
          reaction,
        }).catch((err) => console.error("Failed to send reaction:", err));
      }

      const reply = await generateReply(handle, userText);

      await sdk.chats.stopTyping(chatGuid);

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
