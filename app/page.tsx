'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const slides = [
  '/slide1.png',
  '/slide2.png',
  '/slide3.png',
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleDiscordLogin = () => {
    window.location.href = '/api/auth/discord';
  };

  return (
    <main className="relative w-full h-screen overflow-hidden bg-neutral-950 text-neutral-100 flex flex-col justify-between select-none">
      
      {/* Background Slideshow */}
      <div className="absolute inset-0 z-0">
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
        <div className="absolute inset-0 bg-neutral-950/80" />
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
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold tracking-wider uppercase">
            <a href="/" className="text-neutral-100 font-bold transition-colors">Main</a>
            <a href="/about" className="text-neutral-400 hover:text-white transition-colors">About Us</a>
            <a href="/tos" className="text-neutral-400 hover:text-white transition-colors">TOS</a>
            <a href="/info" className="text-neutral-400 hover:text-white transition-colors">Additional Information</a>
          </nav>

          <button
            onClick={handleDiscordLogin}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase transition-colors rounded-none cursor-pointer"
          >
            Login
          </button>
        </div>

      </header>

      {/* Center Hero Content / Main Menu (Perfectly Centered) */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto text-center px-4 max-w-xl mx-auto gap-4">
        
        {/* Main Logo */}
        <div className="relative w-44 h-44 md:w-52 md:h-52">
          <Image 
            src="/logo2.png" 
            alt="Central Operations Main Logo" 
            fill 
            sizes="(max-width: 768px) 176px, 208px"
            className="object-contain drop-shadow-2xl" 
            priority
          />
        </div>

        {/* Subtitle Description */}
        <p className="text-xs md:text-sm text-neutral-400 leading-relaxed font-normal max-w-md">
          To access our portal and explore additional features, please log in with your Discord account below.
        </p>

        {/* Official Discord Login Button */}
        <div className="w-full max-w-xs mt-1">
          <button
            onClick={handleDiscordLogin}
            className="w-full px-5 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold tracking-wider uppercase transition-colors text-center rounded-none cursor-pointer flex items-center justify-center gap-2 shadow-lg"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span>Login with Discord</span>
          </button>
        </div>
      </div>

      {/* Bottom Footer with Discord Link */}
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