This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Ban appeals dashboard + rejoin invites

- Staff (Silver+) see every web appeal at `/dashboard/appeals` (nav: **Ban Appeals**, with a pending count). Gold / management can Accept & Unban or Deny there or in the Discord ticket.
- When someone is unbanned (appeal accepted, or a Discord UNBAN from the Staff Panel) the bot DMs them a fresh single-use invite (valid 7 days). Accepted appeals also show the invite on `/appeal`.
- Run the latest `supabase/full-setup.sql` (adds `ban_appeals.invite_url`).
- Bot needs **Create Invite**. Optional env vars: `DISCORD_INVITE_CHANNEL_ID` (channel invites are created for), `DISCORD_INVITE_URL` (fallback permanent invite).

## Log channels

- Ban appeal logs (new appeal, accepted, denied): `DISCORD_APPEAL_LOG_CHANNEL_ID` (default `1571300231021203476`).
- Met Police division application logs: `DISCORD_APPLICATIONS_LOG_CHANNEL_ID_MET` (default `1571517865406763149`). LAS, LFB and Control still use `DISCORD_APPLICATIONS_LOG_CHANNEL_ID`.
- The Divisions page (`/dashboard/divisions`) has one tab per service: Met Police, LAS, LFB, Control.
