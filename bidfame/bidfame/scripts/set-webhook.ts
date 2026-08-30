// Run once after deploying: npm run bot:set-webhook
// Requires TELEGRAM_BOT_TOKEN, TELEGRAM_WEBAPP_URL, TELEGRAM_WEBHOOK_SECRET in env.
import "dotenv/config";
import { setWebhook } from "../src/lib/telegram";

async function main() {
  const base = process.env.TELEGRAM_WEBAPP_URL;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!base || !secret) {
    throw new Error("Set TELEGRAM_WEBAPP_URL and TELEGRAM_WEBHOOK_SECRET first.");
  }
  const url = `${base.replace(/\/$/, "")}/api/telegram/webhook`;
  const result = await setWebhook(url, secret);
  console.log("Webhook set:", url, result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
