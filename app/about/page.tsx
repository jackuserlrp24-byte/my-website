'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const slides = [
  '/slide1.png',
  '/slide2.png',
  '/slide3.png',
];

export default function AboutUsPage() {
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
            <a href="/about" className="text-neutral-100 font-bold transition-colors">About Us</a>
            <a href="/tos" className="hover:text-white transition-colors">TOS</a>
            <a href="/info" className="hover:text-white transition-colors">Additional Information</a>
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
        
        {/* Heading Section */}
        <div className="bg-neutral-900/80 border border-neutral-800 p-8 shadow-xl backdrop-blur-md">
          <h2 className="text-xl font-bold uppercase tracking-wider text-neutral-100 mb-3">
            About Central Operations
          </h2>
          <p className="text-sm text-neutral-400 leading-relaxed font-normal">
            Welcome to Central Operations! We&apos;re a London-based vMenu roleplay community specializing in Metropolitan Police, LAS, LFB, and authentic civilian operations.
          </p>
        </div>

        {/* Core Departments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-neutral-900/80 border border-neutral-800 p-6 flex flex-col justify-between shadow-xl backdrop-blur-md">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5865F2] mb-2">
                Metropolitan Police
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Tasked with maintaining public safety, responding to high-priority emergency incidents, and conducting professional tactical operations across Greater London.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-800 text-[10px] font-mono text-neutral-500">
              ESTABLISHED STANDARD
            </div>
          </div>

          <div className="bg-neutral-900/80 border border-neutral-800 p-6 flex flex-col justify-between shadow-xl backdrop-blur-md">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5865F2] mb-2">
                London Ambulance Service
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Providing critical pre-hospital clinical care, rapid trauma response, and dedicated patient transit across complex emergency scenarios.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-800 text-[10px] font-mono text-neutral-500">
              ESTABLISHED STANDARD
            </div>
          </div>

          <div className="bg-neutral-900/80 border border-neutral-800 p-6 flex flex-col justify-between shadow-xl backdrop-blur-md">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5865F2] mb-2">
                London Fire Brigade
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Handling structural fires, hazardous materials, complex road traffic collisions, and specialized rescue operations throughout the capital.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-800 text-[10px] font-mono text-neutral-500">
              ESTABLISHED STANDARD
            </div>
          </div>

        </div>

        {/* Development & Realism Focus */}
        <div className="bg-neutral-900/80 border border-neutral-800 p-8 shadow-xl backdrop-blur-md">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-200 mb-3">
            Custom Engineering & Professional Standards
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Our infrastructure is built on custom-developed resources, high-performance web applications, and meticulously configured UK emergency services equipment. We pride ourselves on creating an immersive, structured, and quality-driven roleplay environment for all members.
          </p>
        </div>

      </div>

      {/* Bottom Footer */}
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between px-10 py-4 bg-neutral-900/90 border-t border-neutral-800 text-xs text-neutral-400">
        <p className="font-mono text-[11px]">&copy; Central Operations. All rights reserved.</p>
        
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <span className="text-neutral-500">Support / Comms:</span>
          <a
            href="https://discord.gg/yourinvite"
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