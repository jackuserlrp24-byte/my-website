import { getDiscordSession } from '@/lib/discord-session';
import { getGuildMember } from '@/lib/discord-member';
import Image from 'next/image';
import WhitelistForm from './WhitelistForm';

const DISCORD_INVITE_LINK = 'https://discord.gg/yourinvite';

const slides = [
  '/slide1.png',
  '/slide2.png',
  '/slide3.png',
];

// Only show the "join the server" screen when Discord says they are definitely not a member
// (not when Discord is merely rate limiting / unreachable).
async function checkInGuild(discordId: string) {
  const result = await getGuildMember(discordId);
  return result.status !== 'not_member';
}

export default async function WhitelistPage() {
  const user: DiscordSessionUser | null = await getDiscordSession();
  let inServer = true;

  if (user?.id) {
    inServer = await checkInGuild(user.id);
  }

  // If user is logged in but not in server, show join server screen with background slideshow
  if (user && !inServer) {
    return (
      <main className="relative min-h-screen w-full overflow-hidden bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 select-none">
        
        {/* Background Slideshow */}
        <div className="absolute inset-0 z-0">
          {slides.map((slide, index) => (
            <div
              key={slide}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                index === 0 ? 'opacity-40' : 'opacity-0'
              }`}
            >
              <Image
                src={slide}
                alt={`Slide ${index + 1}`}
                fill
                sizes="100vw"
                className="object-cover grayscale contrast-125"
                priority={index === 0}
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-neutral-950/80" />
        </div>

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
              href="/api/auth/discord"
              className="block w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold uppercase tracking-wider transition-colors text-center border border-neutral-700"
            >
              Switch / Log In Again
            </a>
          </div>
        </div>
      </main>
    );
  }

  // Passes user data (or null) to the form component
  return <WhitelistForm initialUser={user ? { ...user, avatar: user.avatar ?? undefined } : null} />;
}