import fs from "fs";
import path from "path";

interface Quote {
  id: string;
  text: string;
  topic: string;
  source: string;
}

// Topic rotation by day of week
const TOPIC_SCHEDULE: Record<number, string> = {
  0: "philosophy",    // Sunday
  1: "wealth",        // Monday
  2: "happiness",     // Tuesday
  3: "decision_making", // Wednesday
  4: "startups",      // Thursday
  5: "reading",       // Friday
  6: "relationships", // Saturday
};

export function getTodaysTopic(): string {
  const day = new Date().getDay();
  return TOPIC_SCHEDULE[day] || "philosophy";
}

export function getQuotesByTopic(topic: string): Quote[] {
  const sourcesDir = path.join(__dirname, "sources");

  const almanack: Quote[] = JSON.parse(
    fs.readFileSync(path.join(sourcesDir, "almanack-highlights.json"), "utf-8")
  );
  const tweets: Quote[] = JSON.parse(
    fs.readFileSync(path.join(sourcesDir, "twitter-quotes.json"), "utf-8")
  );
  const skill: Quote[] = JSON.parse(
    fs.readFileSync(path.join(sourcesDir, "naval-skill-quotes.json"), "utf-8")
  );

  return [...almanack, ...tweets, ...skill].filter((q) => q.topic === topic);
}
