# BIDFAME

A Telegram Mini App leaderboard where the #1 spot is won by bidding Telegram
Stars. Every new top bid must be exactly **100 ⭐** above the current highest.
All payments run through Telegram's official Stars payment flow — there is
no crypto, no manual approval, and the frontend can never tell the backend
a payment succeeded; only Telegram's own webhook update can do that.

---

## 1. File structure

```
bidfame/
├─ prisma/
│  └─ schema.prisma          # User, Listing, Bid, Payment models
├─ scripts/
│  ├─ set-webhook.ts         # registers your deployed URL with Telegram
│  └─ set-commands.ts        # registers /start /help /leaderboard /myprofile
├─ src/
│  ├─ app/
│  │  ├─ page.tsx            # the Mini App itself (leaderboard + bidding UI)
│  │  ├─ admin/page.tsx      # admin dashboard (ADMIN_ID only)
│  │  ├─ layout.tsx          # loads the Telegram Web App SDK script
│  │  ├─ globals.css         # Tailwind + theme
│  │  └─ api/
│  │     ├─ listings/route.ts          # GET leaderboard, POST create listing
│  │     ├─ listings/[id]/route.ts     # GET one listing + bid history
│  │     ├─ bids/route.ts              # POST → creates a Stars invoice
│  │     ├─ me/route.ts                # your own profile + bid history
│  │     ├─ telegram/webhook/route.ts  # THE important one — see below
│  │     └─ admin/
│  │        ├─ stats/route.ts          # dashboard numbers
│  │        └─ listings/[id]/route.ts  # enable/disable/remove a listing
│  ├─ lib/
│  │  ├─ prisma.ts           # database client
│  │  ├─ telegram.ts         # server-side Telegram Bot API calls + initData verification
│  │  ├─ telegramClient.ts   # browser-side helpers (openInvoice, authed fetch)
│  │  └─ auth.ts             # resolves "who is calling" from verified initData
│  └─ components/
│     ├─ CurrentLeaderCard.tsx
│     └─ LeaderboardList.tsx
└─ .env.example
```

### What the webhook route actually does

`src/app/api/telegram/webhook/route.ts` is the only place a bid is ever
marked as paid. It:

1. Checks a secret header so random people can't POST fake "payment
   succeeded" events at your server.
2. On `pre_checkout_query` — Telegram asking "should I let this payment
   through?" — re-checks the bid is still valid and answers within
   Telegram's 10-second window.
3. On `successful_payment` — the payment already happened, Stars already
   left the user's balance — it atomically checks whether anyone else's
   payment already claimed that same target amount. If two people bid
   1,100 ⭐ at the same moment, only the first database write wins; the
   second person is automatically refunded via `refundStarPayment`.

---

## 2. Supabase account setup (step-by-step)

1. Go to https://supabase.com and sign up (GitHub login is easiest).
2. Click **New Project**. Pick any name, generate/save a database password,
   choose a region close to you, and click **Create new project**. Wait
   ~2 minutes for it to provision.
3. In the left sidebar go to **Project Settings → Database**.
4. Under **Connection string**, choose the **URI** tab, and specifically the
   **Transaction pooler** (port 6543) version — this is the one that works
   from Vercel's serverless functions. Copy it.
5. Replace `[YOUR-PASSWORD]` in that string with the database password from
   step 2. This full string is your `DATABASE_URL`.
6. Go to **Project Settings → API** and copy `Project URL` → `SUPABASE_URL`,
   `anon public` key → `SUPABASE_ANON_KEY`, and `service_role` key →
   `SUPABASE_SERVICE_ROLE_KEY`. (This starter uses Prisma directly, but
   these are included in case you later use Supabase's client/storage SDK
   for image uploads.)

## 3. Create the database / 4. Connect Prisma / 5. Migration commands

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` from above.
2. Install dependencies: `npm install`
3. Generate the Prisma client: `npm run prisma:generate`
4. Create the actual tables in Supabase:
   ```
   npm run prisma:migrate
   ```
   This will prompt you for a migration name (e.g. `init`) and creates
   `User`, `Listing`, `Bid`, `Payment` tables in your Supabase Postgres
   database. You can open **Table Editor** in Supabase afterward to see
   them.
5. Optional: `npm run prisma:studio` opens a local GUI to browse/edit rows.

## 6. BotFather setup

1. Open Telegram, search for **@BotFather**, and start a chat.
2. Send `/newbot`, give it a display name, then a username ending in `bot`
   — since you want `@BIDFAME_bot`, try that exact username (usernames must
   be unique, so add characters if it's taken).
3. BotFather replies with your **bot token** — copy it into `TELEGRAM_BOT_TOKEN`.
4. Send `/setdescription` and `/setabouttext` to BotFather to add a
   description if you'd like (optional).

## 7. Mini App setup

1. Still talking to BotFather, send `/newapp`, pick your bot, give the Mini
   App a name (e.g. "BIDFAME") and short description.
2. When asked for the **Web App URL**, use your deployed Vercel URL (see
   step 11) — e.g. `https://bidfame.vercel.app`. You can update this later
   with `/myapps` → your app → **Edit Web App URL**.
3. Upload an icon/photo when prompted (optional but recommended).
4. Send `/setmenubutton`, pick your bot, and set the menu button text (e.g.
   "Open BIDFAME") with the same Web App URL — this puts a persistent
   "Open" button in the chat with your bot.

## 8. Telegram Stars setup

Telegram Stars don't require a separate merchant account or provider
token — that's the whole point of `XTR` currency. There is nothing to
"enable"; any bot can send Stars invoices immediately. Just make sure:

- `provider_token` is always an empty string in invoice creation (already
  done in `src/lib/telegram.ts`).
- `currency` is always `"XTR"` (already done).
- You've set `TELEGRAM_BOT_TOKEN` correctly — that's the only credential
  Stars payments need.

## 9. Webhook setup

1. Generate a random secret string for `TELEGRAM_WEBHOOK_SECRET` — anything
   long and random works, e.g. run `openssl rand -hex 32` in a terminal.
2. Deploy the app first (step 11) so you have a real `TELEGRAM_WEBAPP_URL`.
3. Set all env vars in Vercel (step 12), then run locally, pointed at your
   production env vars:
   ```
   npm run bot:set-webhook
   npm run bot:set-commands
   ```
   This tells Telegram "send all updates to
   `https://<your-app>/api/telegram/webhook`, and only accept them if they
   include this secret header."

## 10. Environment variables

Set every variable from `.env.example` in **both**:
- your local `.env` file (for local testing), and
- Vercel → Project → Settings → Environment Variables (for production).

Never commit `.env` to git — it's already covered by the default
`.gitignore` Next.js projects use.

## 11. Vercel deployment

1. Push this project to a GitHub repository.
2. Go to https://vercel.com, click **Add New → Project**, and import that
   repo.
3. Before deploying, expand **Environment Variables** and paste in every
   value from your `.env`.
4. Click **Deploy**. Once it finishes, copy the resulting URL (e.g.
   `https://bidfame.vercel.app`) into `TELEGRAM_WEBAPP_URL` (both in Vercel
   env vars and your local `.env`), then redeploy so the app knows its own
   URL.
5. Run the webhook/commands scripts from step 9 once the URL is stable.

## 12. Environment variables (recap)

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | Supabase → Database → Connection string |
| `TELEGRAM_BOT_TOKEN` | BotFather `/newbot` |
| `TELEGRAM_WEBAPP_URL` | Your Vercel deployment URL |
| `TELEGRAM_WEBHOOK_SECRET` | Any random string you generate |
| `ADMIN_ID` | Your numeric Telegram ID from @userinfobot |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API settings |

## 13. Local testing

Telegram Mini Apps must be opened *inside* Telegram to get real `initData`
— you can't fully test bidding by just visiting `localhost:3000` in a
browser. Two options:

- **Fastest**: deploy to Vercel (it's free) and test through the real bot
  — every `git push` auto-deploys a preview.
- **Local tunnel**: run `npm run dev`, then use a tool like `ngrok http
  3000` to get a temporary public HTTPS URL, set that as your Mini App's
  Web App URL in BotFather temporarily, and open the bot in Telegram.

Either way, always test by tapping your bot's **Open BIDFAME** button
inside Telegram itself.

## 14. Complete test: creating a listing

1. Open your bot in Telegram, tap **🚀 OPEN BIDFAME**.
2. Tap **+ Create your listing to join the leaderboard**.
3. Fill in a brand name and Instagram username, submit.
4. Confirm in Supabase Table Editor → `Listing` that a new row appeared
   with your Telegram user's `userId` and `currentBid = 0`.

## 15. Complete test: making a Stars bid

1. From the Mini App, tap the **🔥 BID … ⭐** button.
2. Telegram's native payment sheet should appear showing the Stars amount.
3. If you don't have enough Stars, Telegram will prompt you to buy some
   first (via Apple/Google IAP or @PremiumBot) — you can use a small
   real amount to test end-to-end, since Telegram Stars test/sandbox mode
   for Mini Apps isn't reliably available; alternatively test in a bot
   chat you fully control with an amount you're comfortable spending.
4. Complete the payment.

## 16. How to verify the successful payment reached the backend

- In Vercel, go to your project → **Logs**, filter for
  `/api/telegram/webhook`. You should see a POST request right after
  paying, and (if something goes wrong) any `console.error` output from
  `handleSuccessfulPayment`.
- You should also receive a confirmation message from your bot in the
  chat ("🔥 Your bid of … ⭐ went through!").

## 17. How to verify the database was updated

- Supabase → Table Editor → `Bid`: a new row with `status = SUCCESS` and a
  populated `telegramChargeId`.
- `Payment`: a matching row with `status = SUCCESS`.
- `Listing`: the `currentBid` and `bidCount` for that listing should now
  reflect your paid amount.

## 18. How to verify the leaderboard automatically changed

- Reopen the Mini App (or pull to refresh) — the Current Leader card
  should now show your listing if you had the highest bid, with no manual
  step from you or an admin. The `/api/listings` endpoint always computes
  ranking live from `currentBid`, so there's nothing to "publish."

---

## Admin dashboard

Open `https://<your-app>/admin` **from inside the Telegram Mini App**
(e.g. by editing the URL bar isn't enough — it needs `initData`, so open
it via a Telegram deep link or temporarily point your bot's menu button at
`/admin` while testing). Only the Telegram account whose numeric ID
matches `ADMIN_ID` will see data; everyone else gets "Access denied."
