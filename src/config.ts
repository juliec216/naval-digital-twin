import dotenv from "dotenv";
dotenv.config();

export const config = {
  photon: {
    serverUrl: process.env.PHOTON_SERVER_URL || "",
    apiKey: process.env.PHOTON_API_KEY || "",
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  },
  dailyQuote: {
    time: process.env.DAILY_QUOTE_TIME || "08:00",
    inactivityDays: parseInt(process.env.INACTIVITY_DAYS || "2", 10),
  },
};
