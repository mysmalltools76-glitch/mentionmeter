// Product ka naam yahan badlein, poori website mein badal jayega.
export const APP_NAME = "MentionMeter";

// Ek report mein kitne sawal poochne hain (zyada = Gemini quota zyada kharch)
export const QUESTION_COUNT = 4;

// Free limit: 24 ghante mein ek email kitni reports chala sakti hai
export const DAILY_LIMIT_EMAIL = 1;
// Ek IP address se 24 ghante mein kitni (office/shared internet ke liye thora zyada)
export const DAILY_LIMIT_IP = 3;

// ChatGPT check (user ki apni key) ke liye default model. Agar ye model band ho jaye
// to OpenAI ki website se naya naam dekh kar yahan likh dein.
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

// Privacy page par dikhne wali contact email (apni email likhein)
export const CONTACT_EMAIL = "you@example.com";
