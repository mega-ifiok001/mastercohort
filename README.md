# Course Funnel (Next.js + Prisma + Neon + Paystack)

Ad link -> form (name, email, WhatsApp) -> Paystack payment (₦2,000) -> verified success page with the WhatsApp group button.

## Setup

1. Install: `npm install`
2. Copy `.env.example` to `.env` and fill it in (Neon URLs, Paystack secret key, WhatsApp group link).
3. Create the table: `npx prisma db push`
4. Run: `npm run dev` and open http://localhost:3000

## Paystack webhook (important)

In Paystack Dashboard > Settings > API Keys & Webhooks, set the webhook URL to:

    https://YOUR-DOMAIN/api/webhook

Paystack can't reach localhost. To test the webhook locally, use a tunnel (e.g. ngrok) and use that URL.
The success page verifies payment by itself, so the flow still works without the webhook,
but the webhook is what saves people who pay and then close the tab.

## Influencer tracking

Give each partner a link like `https://YOUR-DOMAIN/?ref=partnername`. The code is stored on each signup (`refCode`).
Count paid signups per partner: open `npm run db:studio`, filter `status = PAID`, group by `refCode`.

## Deploy (Vercel)

1. Push to GitHub and import the repo in Vercel.
2. Add all variables from `.env.example` in Project Settings > Environment Variables.
   Set `NEXT_PUBLIC_APP_URL` to your live domain.
3. Switch `PAYSTACK_SECRET_KEY` to your live key (`sk_live_...`) only after test payments work end to end.
   Your Paystack business must be activated (KYC) to accept live payments.

## Edit the page text

Course title, tagline, price and bullet points are all in `lib/config.js`.

## How it stays safe

- The WhatsApp link is only read on the server (`WHATSAPP_GROUP_LINK`) and only rendered after Paystack confirms the payment, with the amount (₦2,000) and currency (NGN) checked.
- The reference in the success URL is a random, unguessable value, so people can't open someone else's success page.
- Webhook requests are rejected unless the `x-paystack-signature` is valid.
- Payment confirmation is idempotent: the webhook and the success page can both fire, and the confirmation email goes out once.
