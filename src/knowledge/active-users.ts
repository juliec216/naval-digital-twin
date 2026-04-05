import fs from "fs";
import path from "path";
import { config } from "../config";

export interface ActiveUser {
  handle: string;
  chatGuid: string;
  firstSeen: number;
  lastInteraction: number;
  quotesReceived: string[]; // IDs of quotes already sent
}

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, "../../data");
const STORE_PATH = path.join(DATA_DIR, "active-users.json");

let users: Map<string, ActiveUser> = new Map();

function ensureDataDir(): void {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function loadActiveUsers(): void {
  try {
    const data = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
    users = new Map(Object.entries(data));
  } catch {
    users = new Map();
  }
}

function save(): void {
  ensureDataDir();
  fs.writeFileSync(
    STORE_PATH,
    JSON.stringify(Object.fromEntries(users), null, 2)
  );
}

export function registerInteraction(handle: string, chatGuid: string): void {
  const existing = users.get(handle);
  if (existing) {
    existing.lastInteraction = Date.now();
    existing.chatGuid = chatGuid;
  } else {
    users.set(handle, {
      handle,
      chatGuid,
      firstSeen: Date.now(),
      lastInteraction: Date.now(),
      quotesReceived: [],
    });
    console.log(`New active user: ${handle}`);
  }
  save();
}

export function markQuoteSent(handle: string, quoteId: string): void {
  const user = users.get(handle);
  if (user) {
    user.quotesReceived.push(quoteId);
    save();
  }
}

export function getActiveUsers(): ActiveUser[] {
  const threshold =
    Date.now() - config.dailyQuote.inactivityDays * 24 * 60 * 60 * 1000;

  const active: ActiveUser[] = [];
  for (const [handle, user] of users) {
    if (user.lastInteraction >= threshold) {
      active.push(user);
    } else {
      console.log(
        `User ${handle} inactive for ${config.dailyQuote.inactivityDays}+ days — pausing quotes.`
      );
    }
  }
  return active;
}

export function getUser(handle: string): ActiveUser | undefined {
  return users.get(handle);
}
