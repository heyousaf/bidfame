# BIDFAME — Telegram Mini App

**GET SEEN. GET FEATURED.**

A pay-to-lead visibility leaderboard built as a Telegram Mini App. Users bid Telegram Stars
(XTR) in +100 increments to take the #1 spot on the leaderboard.

This README assumes **zero coding/deployment experience**. Follow it top to bottom, in order.

---

## 1. What you're getting

- Next.js 14 + TypeScript + Tailwind app (works as a normal website AND as a Telegram Mini App)
- Prisma + Supabase Postgres database
- Supabase Storage for listing photos
- Real Telegram Stars payments (XTR) — invoice creation, pre-checkout validation, webhook confirmation, idempotent processing, race-condition-safe bidding
- Leaderboard with pagination, a special #1 card, listing detail, create-listing form, profile + bid history, and an admin dashboard

## 2. Project structure

```
bidfame/
  prisma/schema.prisma        ← database models
  src/lib/                    ← auth, bidding logic, validation, Supabase/Prisma clients
  src/app/api/                ← all backend routes
    listings/                 ← leaderboard + create listing
    listings/[id]/            ← listing detail + required next bid
    bids/create-invoice/      ← creates the Telegram Stars invoice
    telegram/webhook/         ← receives Telegram updates + payment confirmations
    upload/                   ← image upload to Supabase Storage
    profile/                  ← user's listing + bid history
    admin/                    ← admin stats + moderation
  src/app/page.tsx            ← leaderboard (home)
  src/app/create/page.tsx     ← "Join BidFame" form
  src/app/listing/[id]/page.tsx ← listing detail + bid button
  src/app/profile/page.tsx    ← my profile
  src/app/admin/page.tsx      ← admin dashboard
  .env.example                ← every environment variable you need
```

---

## 3. Install locally

```bash
cd bidfame
npm install
```

---

## 4. Supabase setup (database + image storage)

1. Go to https://supabase.com → create a free account → **New Project**.
2. Wait for the project to finish provisioning.
3. Go to **Project Settings → Database → Connection string**.
   - Copy the **"Connection pooling"** URI → this is your `DATABASE_URL`.
   - Copy the **"Direct connection"** URI → this is your `DIRECT_URL` (Prisma needs this for migrations).
   - Replace `[YOUR-PASSWORD]` in both with your actual database password.
4. Go to **Project Settings → API**.
   - Copy **Project URL** → `SUPABASE_URL`
   - Copy **anon public** key → `SUPABASE_ANON_KEY`
   - Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ keep this secret, never share it, never put it in frontend code)
5. Go to **Storage** in the left sidebar → **New bucket** → name it exactly:
   ```
   listing-images
   ```
   Make it a **public** bucket (so uploaded photos can be displayed on the leaderboard).
6. Go to **Storage → listing-images → Policies** and add a policy allowing:
   - `INSERT` for the `service_role` (already allowed by default since we upload server-side with the service key — no extra policy needed for uploads).
   - `SELECT` for `public` so images can be viewed (public bucket already does this).

7. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

8. Run the migration to create your tables:
   ```bash
   npx prisma migrate dev --name init
   ```
9. Verify: open **Supabase → Table Editor** — you should see `User`, `Listing`, `Bid`, `Payment` tables.
10. Verify the bucket: **Supabase → Storage** — you should see `listing-images`.

---

## 5. Telegram bot setup

1. Open Telegram, search **@BotFather**, tap **Start**.
2. Send `/newbot`. Choose a display name (e.g. `BidFame`) and a username ending in `bot` (e.g. `bidfame_bot`).
3. BotFather gives you a **token** — this is your `TELEGRAM_BOT_TOKEN`. Keep it secret.
4. Send `/setuserpic` → select your bot → upload your BIDFAME logo.
5. Send `/setdescription` → select your bot → paste: `BIDFAME — GET SEEN. GET FEATURED. Bid Telegram Stars to take the #1 spot.`
6. Send `/setcommands` → select your bot → paste:
   ```
   start - Open BidFame
   help - How BidFame works
   leaderboard - View the leaderboard
   myprofile - View your listing & bids
   ```
7. Send `/mybots` → select your bot → **Bot Settings → Menu Button → Configure menu button**.
   - Set the button text to `Open BidFame`.
   - Set the URL to your Vercel URL (you'll have this after deploying — step 7 below). You can come back to this after deployment.
8. To find your own numeric Telegram ID (for `ADMIN_ID`): message **@userinfobot** and it will reply with your ID.

You do **not** need to enable any separate "Payments" provider — Telegram Stars work natively through the Bot API, no provider token needed.

---

## 6. Environment variables

Fill in the rest of `.env`:

```
TELEGRAM_BOT_TOKEN=<from BotFather>
TELEGRAM_WEBAPP_URL=<your Vercel URL, e.g. https://bidfame.vercel.app>
TELEGRAM_WEBHOOK_SECRET=<any long random string you make up yourself>
ADMIN_ID=<your numeric Telegram ID from @userinfobot>
```

Generate a random secret easily:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 7. Deploy to Vercel

1. Push this project to a new GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "BidFame initial commit"
   git branch -M main
   git remote add origin https://github.com/<you>/bidfame.git
   git push -u origin main
   ```
2. Go to https://vercel.com → **New Project** → import your GitHub repo.
3. In **Environment Variables**, add every variable from your `.env` file (all of them — `DATABASE_URL`, `DIRECT_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBAPP_URL`, `TELEGRAM_WEBHOOK_SECRET`, `ADMIN_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
4. Click **Deploy**. Vercel gives you a URL like `https://bidfame.vercel.app`.
5. Update `TELEGRAM_WEBAPP_URL` in Vercel's environment variables to this exact URL, then redeploy.
6. Go back to BotFather → Menu Button → set the URL to this same Vercel URL.

---

## 8. Connect the Telegram webhook

This tells Telegram to send bot messages and payment confirmations to your app. Run this once (replace the placeholders), from any terminal with internet access:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<your-vercel-url>/api/telegram/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
    "allowed_updates": ["message", "pre_checkout_query"]
  }'
```

You should get back `{"ok":true,"result":true,...}`.

To verify it's connected:
```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

---

## 9. Test it

### Test A — Initial state
Open the Mini App via your bot's `/start`. Create your own owner listing (bid starts at 0 ⭐). It should show as #1 since nothing has outbid it yet.

### Test B — First paid bid
From a second Telegram account, create a listing and bid. The required amount should show as **100 ⭐**. Pay it. That listing should become #1; your owner listing moves down.

### Test C — Second paid bid
From a third account, bid. Required amount should now show **200 ⭐**. After paying, it becomes #1; the 100 ⭐ listing becomes #2.

### Test D — Stale bid rejection
Open the bid screen, wait for someone else to outbid in the background, then try to pay the old (now-invalid) amount — Telegram's pre-checkout step will reject it via `answerPreCheckoutQuery`.

### Test E — Duplicate payment safety
This is handled automatically: the database has unique constraints on `telegramPaymentId`, so even if Telegram redelivers the same webhook update, only one bid is ever created.

### Test F — Concurrent bids
Have two people tap "Bid" within the same second. The webhook re-checks the current highest bid *inside a database transaction* before finalizing, so ranking stays correct.

---

## 10. Admin dashboard

Visit `https://<your-vercel-url>/admin` from inside the Telegram Mini App while logged in as the Telegram account matching `ADMIN_ID`. You'll see total users, listings, bids, payments, Stars collected, the current #1, and recent transactions, plus the ability to enable/disable/remove listings via the API (`PATCH /api/admin`).

---

## 11. Troubleshooting

| Problem | Fix |
|---|---|
| "Invalid or expired Telegram initData" | Make sure you're opening the app **through Telegram** (via the bot's menu button or `/start`), not directly in a browser — `initData` only exists inside Telegram. |
| Webhook not receiving updates | Re-run the `setWebhook` curl command. Check `getWebhookInfo` for `last_error_message`. |
| Payments not confirming | Check Vercel's function logs for `/api/telegram/webhook`. Confirm `TELEGRAM_WEBHOOK_SECRET` matches exactly in both Vercel and the `setWebhook` call. |
| Images not showing | Confirm the `listing-images` bucket is set to **public** in Supabase. |
| Prisma migration fails | Make sure you're using the **Direct connection** string for `DIRECT_URL`, not the pooled one. |

---

## 12. Production security checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is only used in server files (`src/lib/supabaseServer.ts`), never sent to the browser
- [ ] `TELEGRAM_BOT_TOKEN` only used in API routes, never in client components
- [ ] Every bid amount is calculated server-side (`getRequiredNextBid`) — client-submitted amounts are never trusted
- [ ] `initData` is verified with HMAC on every authenticated route — `initDataUnsafe` is never used
- [ ] Webhook checks `X-Telegram-Bot-Api-Secret-Token` before processing
- [ ] Payment/Bid tables have unique constraints on Telegram payment IDs (idempotency)
- [ ] `/admin` checks the caller's Telegram ID against `ADMIN_ID` server-side
- [ ] URLs (Instagram/website) are validated to block `javascript:` and other dangerous schemes

---

No crypto, no manual payment approval, no fake data — everything above is the real, automatic flow using Telegram Stars.
