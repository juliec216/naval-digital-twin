export interface LocalTime {
  hour: number;
  minute: number;
}

export function parseLocalTime(text: string): LocalTime | null {
  const cleaned = text.trim().toLowerCase();

  // 12h with optional minutes and am/pm: "3 pm", "3:30pm", "11:05 am"
  const twelve = cleaned.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (twelve) {
    const h = parseInt(twelve[1], 10);
    const m = twelve[2] ? parseInt(twelve[2], 10) : 0;
    const ampm = twelve[3];
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    let hour24 = h;
    if (ampm === "pm" && h !== 12) hour24 = h + 12;
    if (ampm === "am" && h === 12) hour24 = 0;
    return { hour: hour24, minute: m };
  }

  // 24h: "15:30", "08:00", "23:59"
  const twentyFour = cleaned.match(/\b(\d{1,2}):(\d{2})\b/);
  if (twentyFour) {
    const h = parseInt(twentyFour[1], 10);
    const m = parseInt(twentyFour[2], 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return { hour: h, minute: m };
  }

  return null;
}

export function computeOffsetMinutes(local: LocalTime, nowUtc: Date): number {
  const utcMinutesOfDay = nowUtc.getUTCHours() * 60 + nowUtc.getUTCMinutes();
  const localMinutesOfDay = local.hour * 60 + local.minute;
  let offset = localMinutesOfDay - utcMinutesOfDay;

  if (offset > 840) offset -= 1440;
  if (offset < -720) offset += 1440;

  return Math.round(offset / 15) * 15;
}

export function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, "0")}`;
}

export function nowInUserTz(
  offsetMinutes: number,
  nowUtc: Date
): { dateStr: string; hour: number; minute: number; minutesOfDay: number } {
  const shifted = new Date(nowUtc.getTime() + offsetMinutes * 60_000);
  const y = shifted.getUTCFullYear();
  const mo = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  const hour = shifted.getUTCHours();
  const minute = shifted.getUTCMinutes();
  return {
    dateStr: `${y}-${mo}-${d}`,
    hour,
    minute,
    minutesOfDay: hour * 60 + minute,
  };
}
