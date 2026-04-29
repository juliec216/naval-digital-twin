import dotenv from "dotenv";
dotenv.config();

export interface QuoteSlot {
  hour: number;
  minute: number;
}

export const config = {
  photon: {
    serverUrl: process.env.PHOTON_SERVER_URL || "",
    apiKey: process.env.PHOTON_API_KEY || "",
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  },
  dailyQuote: {
    slots: [
      { hour: 8, minute: 0 },
      { hour: 12, minute: 0 },
      { hour: 19, minute: 0 },
      { hour: 23, minute: 0 },
    ] as QuoteSlot[],
    inactivityDays: parseInt(process.env.INACTIVITY_DAYS || "2", 10),
    tickIntervalMs: 60_000,
  },
};
