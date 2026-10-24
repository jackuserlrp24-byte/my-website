'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const slides = [
  '/slide1.png',
  '/slide2.png',
  '/slide3.png',
];

interface DiscordUser {
  id: string;
  username: string;
  global_name?: string;
  avatar?: string;
}

export default function WhitelistForm({ initialUser }: { initialUser: DiscordUser | null }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [step, setStep] = useState(1);
  const discordUser = initialUser;

  // Form Fields
  const [forename, setForename] = useState('');
  const [surname, setSurname] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');

  const [rpName, setRpName] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [rpExperience, setRpExperience] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Background Slideshow Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const avatarUrl = discordUser?.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
    : 'https://cdn.discordapp.com/embed/avatars/0.png';

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordUser) {
      alert('Please connect your Discord account first.');
      return;
    }
    if (!forename || !surname || !dob || !email) {
      alert('Please fill in all account registration fields.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordUser) {
      alert('Please connect your Discord account first.');
      return;
    }
    if (!rpName || !referralSource || !rpExperience) {
      alert('Please fill in all whitelist process fields.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId: discordUser.id,
          forename,
          surname,
          dob,
          email,
          rpName,
          referralSource,
          rpExperience,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          window.location.assign('/dashboard');
        }, 1200);
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

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-xl bg-neutral-900/95 backdrop-blur-md border border-neutral-800 p-8 shadow-2xl">
        
        {/* Header & Step Indicator */}
        <div className="flex items-center justify-between pb-6 mb-5 border-b border-neutral-800">
          <div>
            <h2 className="text-sm font-mono tracking-widest uppercase text-neutral-400">Central Operations Portal</h2>
            <h1 className="text-xl font-bold tracking-wider uppercase text-neutral-100 mt-1">
              {step === 1 ? 'Step 1: Account Register' : 'Step 2: Whitelist Process'}
            </h1>
          </div>
          <div className="text-right font-mono text-xs text-neutral-400">
            STEP <span className="text-neutral-100 font-bold">{step}</span> OF 2
          </div>
        </div>

        {/* Connected Discord Account Info Banner */}
        <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 px-4 py-3 mb-6">
          <div className="flex items-center gap-3">
            <img
              src={avatarUrl}
              alt="Discord Avatar"
              className="w-9 h-9 rounded-full border border-neutral-700 object-cover"
            />
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Connected Account</p>
              <p className="text-xs font-semibold text-neutral-200 tracking-wider">
                {discordUser ? (discordUser.global_name || discordUser.username) : 'Not Verified Operator'}
              </p>
            </div>
          </div>
          <a
            href="/api/auth/discord"
            className="text-[11px] font-mono uppercase text-[#5865F2] hover:text-indigo-400 transition-colors underline underline-offset-4"
          >
            {discordUser ? 'Switch' : 'Connect'}
          </a>
        </div>

        {success ? (
          <div className="py-12 text-center space-y-3">
            <div className="inline-block p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full mb-2">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">Application Approved</h3>
            <p className="text-xs text-neutral-400">Collar number assigned & roles synchronized. Entering dashboard...</p>
          </div>
        ) : !discordUser ? (
          <div className="py-8 text-center space-y-4">
            <p className="text-xs text-neutral-400 font-mono uppercase tracking-wider">
              You must connect your Discord account before completing your whitelist application.
            </p>
            <a
              href="/api/auth/discord"
              className="inline-block w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold uppercase tracking-wider transition-colors text-center"
            >
              Connect Discord Account
            </a>
          </div>
        ) : step === 1 ? (
          /* STEP 1 FORM */
          <form onSubmit={handleNextStep} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-neutral-400 mb-1.5 font-mono">Forename</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. James"
                  value={forename}
                  onChange={(e) => setForename(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 px-4 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-neutral-400 mb-1.5 font-mono">Surname</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Costin"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 px-4 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-neutral-400 mb-1.5 font-mono">Date of Birth</label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 px-4 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-neutral-400 mb-1.5 font-mono">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 px-4 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-6 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Continue to Whitelist Process &rarr;
            </button>
          </form>
        ) : (
          /* STEP 2 FORM */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-neutral-400 mb-1.5 font-mono">Roleplay Name</label>
              <input
                type="text"
                required
                placeholder="e.g. John Miller"
                value={rpName}
                onChange={(e) => setRpName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 px-4 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-neutral-400 mb-1.5 font-mono">Where did you find out about us?</label>
              <input
                type="text"
                required
                placeholder="e.g. TikTok, Friend, FiveM Server List"
                value={referralSource}
                onChange={(e) => setReferralSource(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 px-4 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-neutral-400 mb-1.5 font-mono">Do you have any roleplay experience?</label>
              <textarea
                required
                rows={3}
                placeholder="Describe your prior roleplay background..."
                value={rpExperience}
                onChange={(e) => setRpExperience(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 px-4 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 resize-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                &larr; Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Processing...' : 'Complete Whitelist Application'}
              </button>
            </div>
          </form>
        )}

      </div>
    </main>
  );
}