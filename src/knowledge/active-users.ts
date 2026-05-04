import fs from "fs";
import path from "path";
import { config } from "../config";
import { nowInUserTz } from "../onboarding/timezone";

export interface ActiveUser {
  handle: string;
  chatGuid: string;
  firstSeen: number;
  lastInteraction: number;
  quotesReceived: string[];
  timezoneOffsetMinutes: number | null;
  onboardingComplete: boolean;
  lastQuoteDate: string | null;
  slotsSentToday: number[];
  pauseNoticeSent: boolean;
}

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, "../../data");
const STORE_PATH = path.join(DATA_DIR, "active-users.json");

let users: Map<string, ActiveUser> = new Map();

function ensureDataDir(): void {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function withDefaults(raw: Partial<ActiveUser> & { handle: string; chatGuid: string }): ActiveUser {
  return {
    handle: raw.handle,
    chatGuid: raw.chatGuid,
    firstSeen: raw.firstSeen ?? Date.now(),
    lastInteraction: raw.lastInteraction ?? Date.now(),
    quotesReceived: raw.quotesReceived ?? [],
    timezoneOffsetMinutes: raw.timezoneOffsetMinutes ?? null,
    onboardingComplete: raw.onboardingComplete ?? false,
    lastQuoteDate: raw.lastQuoteDate ?? null,
    slotsSentToday: raw.slotsSentToday ?? [],
    pauseNoticeSent: raw.pauseNoticeSent ?? false,
  };
}

export function loadActiveUsers(): void {
  try {
    const data = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
    users = new Map(
      Object.entries(data).map(([handle, raw]) => [handle, withDefaults(raw as ActiveUser)])
    );
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

export function registerInteraction(handle: string, chatGuid: string): ActiveUser {
  const existing = users.get(handle);
  if (existing) {
    existing.lastInteraction = Date.now();
    existing.chatGuid = chatGuid;
    existing.pauseNoticeSent = false;
    save();
    return existing;
  }
  const user = withDefaults({ handle, chatGuid });
  users.set(handle, user);
  console.log(`New active user: ${handle}`);
  save();
  return user;
}

export function setUserTimezone(handle: string, offsetMinutes: number): void {
  const user = users.get(handle);
  if (!user) return;
  user.timezoneOffsetMinutes = offsetMinutes;
  user.onboardingComplete = true;

  const local = nowInUserTz(offsetMinutes, new Date());
  user.lastQuoteDate = local.dateStr;
  user.slotsSentToday = config.dailyQuote.slots
    .map((slot, i) => ({ i, minutes: slot.hour * 60 + slot.minute }))
    .filter((s) => s.minutes < local.minutesOfDay)
    .map((s) => s.i);

  save();
}

export function markQuoteSent(handle: string, quoteId: string): void {
  const user = users.get(handle);
  if (user) {
    user.quotesReceived.push(quoteId);
    save();
  }
}

export function markSlotSent(handle: string, dateStr: string, slotIndex: number): void {
  const user = users.get(handle);
  if (!user) return;
  if (user.lastQuoteDate !== dateStr) {
    user.lastQuoteDate = dateStr;
    user.slotsSentToday = [];
  }
  if (!user.slotsSentToday.includes(slotIndex)) {
    user.slotsSentToday.push(slotIndex);
  }
  save();
}

export function resetDayIfNeeded(handle: string, dateStr: string): void {
  const user = users.get(handle);
  if (!user) return;
  if (user.lastQuoteDate !== dateStr) {
    user.lastQuoteDate = dateStr;
    user.slotsSentToday = [];
    save();
  }
}

export function getInactiveUsersNeedingNotice(): ActiveUser[] {
  const threshold =
    Date.now() - config.dailyQuote.inactivityDays * 24 * 60 * 60 * 1000;
  const result: ActiveUser[] = [];
  for (const user of users.values()) {
    if (
      user.onboardingComplete &&
      user.lastInteraction < threshold &&
      !user.pauseNoticeSent
    ) {
      result.push(user);
    }
  }
  return result;
}

export function markPauseNoticeSent(handle: string): void {
  const user = users.get(handle);
  if (!user) return;
  user.pauseNoticeSent = true;
  save();
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
