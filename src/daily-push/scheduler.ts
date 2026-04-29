import { AdvancedIMessageKit } from "@photon-ai/advanced-imessage-kit";
import { config } from "../config";
import { getActiveUsers, markSlotSent, resetDayIfNeeded } from "../knowledge/active-users";
import { nowInUserTz } from "../onboarding/timezone";
import { sendQuoteToUser } from "./sender";

async function tick(sdk: AdvancedIMessageKit): Promise<void> {
  const nowUtc = new Date();
  const slots = config.dailyQuote.slots;
  const users = getActiveUsers();

  for (const user of users) {
    if (!user.onboardingComplete || user.timezoneOffsetMinutes === null) continue;

    const local = nowInUserTz(user.timezoneOffsetMinutes, nowUtc);
    resetDayIfNeeded(user.handle, local.dateStr);

    for (let i = 0; i < slots.length; i++) {
      if (user.slotsSentToday.includes(i)) continue;
      const slotMinutes = slots[i].hour * 60 + slots[i].minute;
      if (local.minutesOfDay < slotMinutes) continue;

      const sent = await sendQuoteToUser(sdk, user);
      if (sent) {
        markSlotSent(user.handle, local.dateStr, i);
      }
    }
  }
}

export function startScheduler(sdk: AdvancedIMessageKit): void {
  const slotList = config.dailyQuote.slots
    .map((s) => `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`)
    .join(", ");
  console.log(`Daily quote scheduler started. Slots (user-local): ${slotList}`);

  tick(sdk).catch((err) => console.error("Scheduler tick error:", err));
  setInterval(() => {
    tick(sdk).catch((err) => console.error("Scheduler tick error:", err));
  }, config.dailyQuote.tickIntervalMs);
}
