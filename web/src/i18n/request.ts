import { getRequestConfig } from "next-intl/server";
import en from "../../messages/en.json";

// English only for now. To add Urdu later: add messages/ur.json, choose the
// locale per user, and set dir="rtl" on <html> for Urdu.
export const defaultLocale = "en";

export default getRequestConfig(async () => ({
  locale: defaultLocale,
  messages: en,
  timeZone: "Asia/Karachi",
}));
