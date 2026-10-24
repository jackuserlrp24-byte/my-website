'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const slides = [
  '/slide1.png',
  '/slide2.png',
  '/slide3.png',
];

export default function WhitelistForm({ userDiscordId }: { userDiscordId: string }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [rpName, setRpName] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [rpExperience, setRpExperience] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Background Slideshow Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId: userDiscordId,
          rpName,
          referralSource,
          rpExperience,
        }),
      });

      const data = await res.json();

      if (res.status === 404 && data.error === 'NOT_IN_SERVER') {
        setShowJoinModal(true);
        setLoading(false);
        return;
      }

      if (data.success) {
        setSuccess(true);
        // Force full browser navigation straight to the main dashboard
        setTimeout(() => {
          window.location.assign('/dashboard');
        }, 1000);
      } else {
        alert(data.error || 'An error occurred.');
        setLoading(false);
      }
    } catch (err) {
      alert('Failed to submit application. Please try again.');
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 select-none">
      
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

      {/* Modal for users not detected in Discord Server */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 p-6 max-w-md w-full text-center rounded-none shadow-2xl">
            <h3 className="text-lg font-bold text-red-500 mb-2">Not Detected in Discord Server</h3>
            <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
              We could not locate your Discord account in Central Operations. Please join our server to complete your whitelist verification.
            </p>
            <a
              href="https://discord.gg/yourinvite"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold uppercase tracking-wider transition-colors mb-3"
            >
              Join Central Operations Discord
            </a>
            <button
              onClick={() => setShowJoinModal(false)}
              className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Main Whitelist Form */}
      <div className="relative z-10 w-full max-w-lg bg-neutral-900/90 backdrop-blur-md border border-neutral-800 p-8 shadow-2xl">
        <h2 className="text-xl font-bold tracking-wider uppercase mb-1">Whitelist Application</h2>
        <p className="text-xs text-neutral-400 mb-6">Complete your information to gain full access to the portal dashboard.</p>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="inline-block p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full mb-2">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">Application Approved</h3>
            <p className="text-xs text-neutral-400">Your collar number has been assigned. Entering main dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase text-neutral-400 mb-2">Roleplay Name</label>
              <input
                type="text"
                required
                placeholder="e.g. John Miller"
                value={rpName}
                onChange={(e) => setRpName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 px-4 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-neutral-400 mb-2">Where did you find out about us?</label>
              <input
                type="text"
                required
                placeholder="e.g. TikTok, Friend, FiveM Server List"
                value={referralSource}
                onChange={(e) => setReferralSource(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 px-4 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-neutral-400 mb-2">Do you have any previous roleplay experience?</label>
              <textarea
                required
                rows={3}
                placeholder="Describe your prior RP background..."
                value={rpExperience}
                onChange={(e) => setRpExperience(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 px-4 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Complete Whitelist'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}