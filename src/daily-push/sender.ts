import { AdvancedIMessageKit } from "@photon-ai/advanced-imessage-kit";
import { ActiveUser, getActiveUsers, markQuoteSent } from "../knowledge/active-users";
import { getRandomQuote } from "../rag/vectorstore";

const ENGAGEMENT_QUESTIONS: Record<string, string[]> = {
  wealth: [
    "What's one thing you could build today that would earn while you sleep?",
    "Are you renting out your time, or building equity? What would it take to shift?",
    "What specific knowledge do you have that no one else can be trained for?",
  ],
  happiness: [
    "What desire are you holding onto right now that's keeping you from peace?",
    "When was the last time you felt truly present — no past regrets, no future plans?",
    "What would your day look like if you dropped one expectation you're carrying?",
  ],
  philosophy: [
    "What's one belief you hold that you've never questioned from first principles?",
    "If you had to explain your life's purpose to a child, what would you say?",
    "What's one thing you're doing out of obligation instead of genuine interest?",
  ],
  decision_making: [
    "What's a decision you've been avoiding? If you can't decide, the answer is probably no.",
    "Are you optimizing for short-term comfort or long-term growth right now?",
    "What mental model has served you best this year?",
  ],
  reading: [
    "What's the last book that genuinely changed how you think?",
    "Are you reading what you love, or what you think you should read?",
    "What's one idea from your reading that you've actually applied?",
  ],
  relationships: [
    "Who in your life are you playing long-term games with?",
    "When did you last praise someone specifically instead of generally?",
    "Are you surrounding yourself with people who make you think bigger?",
  ],
  startups: [
    "What's one problem you see every day that no one's solving well?",
    "Are you following your curiosity or following the money right now?",
    "What would you build if you knew you couldn't fail?",
  ],
};

const TOPIC_LABEL: Record<string, string> = {
  wealth: "Wealth",
  happiness: "Happiness",
  philosophy: "Philosophy",
  decision_making: "Decision Making",
  reading: "Reading",
  relationships: "Relationships",
  startups: "Startups",
};

function pickQuestion(topic: string): string {
  const questions = ENGAGEMENT_QUESTIONS[topic] || ENGAGEMENT_QUESTIONS.philosophy;
  return questions[Math.floor(Math.random() * questions.length)];
}

export async function sendQuoteToUser(
  sdk: AdvancedIMessageKit,
  user: ActiveUser
): Promise<boolean> {
  const quote = getRandomQuote(user.quotesReceived);
  if (!quote) return false;

  const question = pickQuestion(quote.topic);
  const message = `Naval's Daily Insight — ${TOPIC_LABEL[quote.topic] || quote.topic}\n\n"${quote.text}"\n\n${question}`;

  try {
    await sdk.messages.sendMessage({
      chatGuid: user.chatGuid,
      message,
    });
    markQuoteSent(user.handle, quote.id);
    console.log(`Sent quote to ${user.handle}: "${quote.text.slice(0, 50)}..."`);
    return true;
  } catch (err) {
    console.error(`Failed to send quote to ${user.handle}:`, err);
    return false;
  }
}

export async function sendDailyQuotes(sdk: AdvancedIMessageKit): Promise<void> {
  const activeUsers = getActiveUsers().filter((u) => u.onboardingComplete);

  if (activeUsers.length === 0) {
    console.log("No onboarded active users to send daily quotes to.");
    return;
  }

  console.log(`Sending daily quotes to ${activeUsers.length} active user(s)...`);
  for (const user of activeUsers) {
    await sendQuoteToUser(sdk, user);
  }
}
