import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import WhitelistForm from './WhitelistForm';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const DISCORD_INVITE_LINK = 'https://discord.gg/yourinvite'; // Change to your actual invite link if different

async function checkInGuild(discordId: string) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
    return true; // Fallback if env vars aren't set
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordId}`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      cache: 'no-store'
    });

    if (res.status === 404) {
      return false; // User is not in the server
    }

    return res.ok;
  } catch (err) {
    console.error('Guild membership check error:', err);
    return false;
  }
}

export default async function WhitelistPage() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('discord_user')?.value;

  if (!userCookie) {
    redirect('/');
  }

  const user = JSON.parse(userCookie);
  const discordId = user.id;

  if (!discordId || discordId === '0000') {
    redirect('/');
  }

  // Check membership immediately on page load before rendering the form
  const inServer = await checkInGuild(discordId);

  if (!inServer) {
    return (
      <main className="relative min-h-screen w-full overflow-hidden bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 select-none">
        <div className="relative z-10 w-full max-w-md bg-neutral-900 border border-neutral-800 p-8 text-center shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
          
          <h2 className="text-sm font-bold tracking-widest uppercase text-neutral-200 mb-3 font-mono">
            Not Detected in Discord Server
          </h2>
          
          <p className="text-xs text-neutral-400 uppercase tracking-wide leading-relaxed mb-6 font-mono">
            We could not locate your Discord account in Central Operations. Please join our Discord server before filling out your whitelist application.
          </p>

          <div className="space-y-3">
            <a
              href={DISCORD_INVITE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold uppercase tracking-wider transition-colors text-center"
            >
              Join Discord Server
            </a>

            <a
              href="/"
              className="block w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold uppercase tracking-wider transition-colors text-center border border-neutral-700"
            >
              Log Out / Switch Account
            </a>
          </div>
        </div>
      </main>
    );
  }

  // If they are in the server, show the whitelist application form with the background slides
  return <WhitelistForm userDiscordId={discordId} />;
}