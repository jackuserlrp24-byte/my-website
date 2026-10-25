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
    label: 'Join Discord' 
  },
  { 
    name: 'TikTok Official', 
    role: 'Promotional Media & Gameplay Highlights', 
    url: 'https://www.tiktok.com/@centraloperationsfivem?lang=en-GB', 
    label: 'Follow TikTok' 
  },
  { 
    name: 'YouTube Channel', 
    role: 'Community Showcases & Official Teasers', 
    url: 'https://www.youtube.com/@CentralOperationsFivem', 
    label: 'Subscribe YouTube' 
  },
];

interface DiscordUser {
  id: string;
  role: string;
  title: string;
  displayName: string;
  avatarUrl: string;
}

export default function AdditionalInfoPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [leadership, setLeadership] = useState<DiscordUser[]>([]);
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
                  <h4 className="text-xs font-bold text-neutral-100 uppercase tracking-wide">
                    {link.name}
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-1 leading-normal">
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
                      alt={user.displayName}
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
                      {user.displayName}
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
        <p className="font-mono text-[11px]">&copy; Central Operations - Ownership Team. All rights reserved.</p>
        
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