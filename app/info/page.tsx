'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const slides = [
  '/slide1.png',
  '/slide2.png',
  '/slide3.png',
];

const socialLinks = [
  { 
    name: 'Discord Community', 
    role: 'Support, Patrol Announcements & Comms', 
    url: 'https://discord.gg/centraloperationsfivem', 
    label: 'Join Discord',
    icon: (
      <svg className="w-4 h-4 fill-current text-[#5865F2] shrink-0" viewBox="0 0 24 24">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    ),
  },
  { 
    name: 'TikTok Official', 
    role: 'Promotional Media & Gameplay Highlights', 
    url: 'https://www.tiktok.com/@centraloperationsfivem?lang=en-GB', 
    label: 'Follow TikTok',
    icon: (
      <svg className="w-4 h-4 fill-current text-neutral-100 shrink-0" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.27 1.76-.23 1.03.03 2.17.68 2.98.71.9 1.89 1.38 3.01 1.25 1.15-.07 2.22-.72 2.73-1.74.34-.68.46-1.46.43-2.22l.01-15.82z"/>
      </svg>
    ),
  },
  { 
    name: 'YouTube Channel', 
    role: 'Community Showcases & Official Teasers', 
    url: 'https://www.youtube.com/@CentralOperationsFivem', 
    label: 'Subscribe YouTube',
    icon: (
      <svg className="w-4 h-4 fill-current text-[#FF0000] shrink-0" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
];

interface LeadershipUser {
  id: string;
  name: string;
  role: string;
  title: string;
  avatarUrl: string;
}

export default function AdditionalInfoPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [leadership, setLeadership] = useState<LeadershipUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchLeadership() {
      try {
        const res = await fetch('/api/discord-users');
        if (res.ok) {
          const data = await res.json();
          setLeadership(data.users || []);
        }
      } catch (err) {
        console.error('Failed to load leadership profiles:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeadership();
  }, []);

  const handleDiscordLogin = () => {
    window.location.href = '/api/auth/discord';
  };

  return (
    <main className="relative w-full min-h-screen overflow-x-hidden bg-neutral-950 text-neutral-100 flex flex-col justify-between select-none">
      
      {/* Background Slideshow */}
      <div className="absolute inset-0 z-0 fixed">
        {slides.map((slide, index) => (
          <div
            key={slide}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === currentSlide ? 'opacity-40' : 'opacity-0'
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
        <div className="absolute inset-0 bg-neutral-950/85" />
      </div>

      {/* Top Header / Navigation Bar */}
      <header className="relative z-10 flex items-center justify-between px-10 py-5 bg-neutral-900/90 border-b border-neutral-800">
        
        {/* Left: Server Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded bg-neutral-800 border border-neutral-700 overflow-hidden">
            <Image 
              src="/logo.png" 
              alt="Server Logo" 
              fill 
              sizes="40px"
              className="object-cover" 
            />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-widest uppercase text-neutral-200">
              Central Operations Portal
            </h1>
          </div>
        </div>

        {/* Center/Right: Navigation Links & Login Button */}
        <div className="flex items-center gap-8">
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold tracking-wider uppercase text-neutral-400">
            <a href="/" className="hover:text-white transition-colors">Main</a>
            <a href="/about" className="hover:text-white transition-colors">About Us</a>
            <a href="/tos" className="hover:text-white transition-colors">TOS</a>
            <a href="/info" className="text-neutral-100 font-bold transition-colors">Additional Information</a>
          </nav>

          <button
            onClick={handleDiscordLogin}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors rounded-none cursor-pointer"
          >
            Login
          </button>
        </div>

      </header>

      {/* Main Content Container */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 flex flex-col gap-8 flex-grow">
        
        {/* Section 1: What is the Portal? */}
        <div className="bg-neutral-900/80 border border-neutral-800 p-8 shadow-xl backdrop-blur-md">
          <h2 className="text-xl font-bold uppercase tracking-wider text-neutral-100 mb-3">
            What is the Central Operations Portal?
          </h2>
          <p className="text-sm text-neutral-400 leading-relaxed font-normal mb-4">
            The Central Operations Portal is our unified online dashboard designed for active server members and staff. It provides seamless integration with our FiveM server and Discord platform, serving as your hub for member whitelisting, live server status monitoring, scheduled community patrols, official notices, and staff administration.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-neutral-800/80">
            <div className="text-xs">
              <span className="text-[#5865F2] font-mono block text-[10px] uppercase">Live Status</span>
              <p className="text-neutral-300 font-semibold mt-0.5">Real-time FiveM player tracking & connect link</p>
            </div>
            <div className="text-xs">
              <span className="text-[#5865F2] font-mono block text-[10px] uppercase">Patrol Sync</span>
              <p className="text-neutral-300 font-semibold mt-0.5">Automated announcements & whitelist verification</p>
            </div>
            <div className="text-xs">
              <span className="text-[#5865F2] font-mono block text-[10px] uppercase">Management Center</span>
              <p className="text-neutral-300 font-semibold mt-0.5">Integrated staff panel & moderation tools</p>
            </div>
          </div>
        </div>

        {/* Section 2: Official Links */}
        <div className="bg-neutral-900/80 border border-neutral-800 p-8 shadow-xl backdrop-blur-md flex flex-col gap-6">
          <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-200">
              Official Media & Community Links
            </h3>
            <span className="text-[10px] font-mono text-neutral-500">GET CONNECTED</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {socialLinks.map((link) => (
              <div key={link.name} className="bg-neutral-950/80 border border-neutral-800 p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    {link.icon}
                    <h4 className="text-xs font-bold text-neutral-100 uppercase tracking-wide">
                      {link.name}
                    </h4>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1.5 leading-normal">
                    {link.role}
                  </p>
                </div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-[11px] font-semibold tracking-wider uppercase transition-colors text-center block cursor-pointer"
                >
                  {link.label}
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Senior Leadership Team */}
        <div className="bg-neutral-900/80 border border-neutral-800 p-8 shadow-xl backdrop-blur-md flex flex-col gap-6">
          <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-200">
              Senior Leadership Team
            </h3>
            <span className="text-[10px] font-mono text-neutral-500">COMMUNITY LEADERSHIP</span>
          </div>

          {loading ? (
            <p className="text-xs text-neutral-500 italic text-center py-6">Loading leadership profiles...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {leadership.map((user) => (
                <div key={user.id} className="bg-neutral-950/80 border border-neutral-800/80 p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border border-neutral-700 overflow-hidden relative shrink-0 bg-neutral-900">
                    <Image
                      src={user.avatarUrl}
                      alt={user.name}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-mono text-[#5865F2] uppercase tracking-wider">
                      {user.role}
                    </span>
                    <h4 className="text-xs font-bold text-neutral-100 uppercase truncate">
                      {user.name}
                    </h4>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {user.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Bottom Footer */}
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between px-10 py-4 bg-neutral-900/90 border-t border-neutral-800 text-xs text-neutral-400">
        <p className="font-mono text-[11px]">&copy; Central Operations. All rights reserved.</p>
        
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <span className="text-neutral-500">Support / Comms:</span>
          <a
            href="https://discord.gg/centraloperationsfivem"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-200 hover:text-white font-medium tracking-wide underline underline-offset-4 transition-colors"
          >
            Discord
          </a>
        </div>
      </footer>

    </main>
  );
}