'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const slides = [
  '/slide1.png',
  '/slide2.png',
  '/slide3.png',
];

const communityRules = [
  { id: '0.1', title: 'Respect All Members', text: 'All members must engage respectfully. Discrimination, hate speech, harassment, or toxic conduct of any kind is strictly prohibited.' },
  { id: '0.2', title: 'No NSFW Content', text: 'The sharing or discussion of explicit, adult, or otherwise inappropriate material is not permitted. All content must remain suitable for a general audience.' },
  { id: '0.3', title: 'Stay On Topic', text: 'Each channel serves a designated purpose. Ensure all messages and media are relevant to the channel in which they are posted.' },
  { id: '0.4', title: 'No Spamming', text: 'Excessive messaging, repeated posts, emoji flooding, or any form of spam is prohibited.' },
  { id: '0.5', title: 'No Self-Promotion', text: 'Advertising or promoting external products, services, social platforms, or other servers is not allowed without prior authorization.' },
  { id: '0.6', title: 'Appropriate Language', text: 'While mild profanity may be tolerated, excessive swearing, aggressive language, or offensive remarks will result in disciplinary action.' },
  { id: '0.7', title: 'No Doxing', text: 'Sharing another individual’s personal information without explicit consent is strictly forbidden. This includes, but is not limited to, addresses, phone numbers, email addresses, or social media accounts.' },
  { id: '0.8', title: 'Channel-Specific Guidelines', text: 'Certain channels may have additional rules. Members are responsible for reviewing and complying with any channel-specific instructions or restrictions.' },
  { id: '0.9', title: 'Right of Removal', text: 'Server management reserves the right to remove, ban, kick, or blacklist any individual from affiliated servers, platforms, or projects where deemed necessary to protect community safety and integrity.' },
];

const inGameRules = [
  { id: '0.1', title: 'Respect & Non-Discrimination', text: 'All members must treat others with respect at all times. Any form of discrimination, including racism, homophobia, or other prejudicial behavior, is strictly prohibited.' },
  { id: '0.2', title: 'In-Character Requirement', text: 'Players must remain in character (IC) at all times. Out-of-character (OOC) communication is only permitted with explicit staff authorization. If stepping away from your device, state that you will be "in your head."' },
  { id: '0.3', title: 'Realistic Vehicle Operation', text: 'Vehicles must be used in a realistic manner. Unrealistic driving styles that would not be possible in real life—commonly referred to as "GTA driving"—are not permitted.' },
  { id: '0.4', title: 'No FailRP', text: 'Unrealistic, illogical, or low-quality roleplay (FailRP) is strictly prohibited.' },
  { id: '0.5', title: 'Prohibited Roleplay Themes', text: 'The following roleplay scenarios are strictly forbidden, including but not limited to: Mental health–related, suicide roleplay, and Sexual roleplay.' },
  { id: '0.6', title: 'No Cop Baiting', text: 'Deliberately provoking or attempting to attract law enforcement attention for the purpose of initiating a pursuit or criminal interaction (e.g., repeatedly speeding past officers) is not allowed.' },
  { id: '0.7', title: 'Value of Life (VoL)', text: 'You must realistically value your character’s life. If threatened with a weapon (e.g., firearm, knife, or similar), you are expected to respond in a manner consistent with self-preservation.' },
  { id: '0.8', title: 'Avoid Repetitive Roleplay', text: 'Repeatedly engaging in the same scenarios (e.g., continuous fail-to-stop incidents) is not allowed. Once a scene concludes, players should pursue varied interactions. Character behavior must appropriately reflect circumstances such as imprisonment or serious injury.' },
  { id: '0.9', title: 'Communication Standards', text: 'Players must have a clear, functioning microphone and communicate in English. The use of voice changers or inappropriate soundboards is prohibited.' },
  { id: '1.0', title: 'No Combat Logging', text: 'Disconnecting to avoid roleplay consequences, punishment, or staff intervention—including leaving during an active scenario—is strictly prohibited.' },
  { id: '1.1', title: 'No Modding or Exploiting', text: 'The use of unauthorized modifications, exploits, or malicious third-party software is strictly forbidden.' },
  { id: '1.2', title: 'New Life Rule (NLR)', text: 'Upon character death, you begin a new life. Any prior criminal actions cannot be used as grounds for arrest or continuation of investigation unless a new offence is committed following your respawn.' },
  { id: '1.3', title: 'No Metagaming or Powergaming', text: 'Using out-of-character knowledge, exploiting mechanics, or forcing unrealistic outcomes to gain an advantage is not permitted.' },
  { id: '1.4', title: 'No Impersonation / Appropriate Names', text: 'Impersonating other members or staff is prohibited. Usernames must remain appropriate and may not include offensive, discriminatory, or vulgar language.' },
  { id: '1.5', title: 'MDT Registration Requirement', text: 'All members must maintain an active and properly registered character on the MDT.' },
  { id: '1.6', title: 'Emergency Vehicle Restrictions', text: 'Civilians are not permitted to steal, possess, or operate emergency service vehicles.' },
  { id: '1.7', title: 'No NITRP or Trolling', text: 'Non-Intent to Roleplay (NITRP) behavior and trolling are strictly prohibited.' },
  { id: '1.8', title: 'Scene Interference', text: 'Players who are not directly involved in an ongoing roleplay scene must not interfere or insert themselves without valid in-character justification.' },
  { id: '1.9', title: 'Logical Roleplay Escalation', text: 'Roleplay must escalate proportionally and be supported by clear in-character context (e.g., prior conflict or legitimate criminal motive). Actions such as failing to stop must have a reasonable and justifiable in-character basis (e.g., operating a stolen vehicle rather than avoiding a minor traffic infraction).' },
  { id: '2.0', title: 'Script & Bug Misuse', text: 'Misusing bugs and scripts is prohibited, e.g. abusing the jail script.' },
  { id: '2.1', title: 'Peacetime Policy', text: 'Peacetime is a period of passive roleplay.' },
  { id: '2.2', title: 'Area of Operation (AOP)', text: 'All players must be in AOP, unless in a training environment.' },
];

export default function TOSPage() {
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
            <a href="/about" className="hover:text-white transition-colors">About Us</a>
            <a href="/tos" className="text-neutral-100 font-bold transition-colors">TOS</a>
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
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16 flex flex-col gap-10 flex-grow">
        
        {/* Banner Section */}
        <div className="bg-neutral-900/80 border border-neutral-800 p-8 shadow-xl backdrop-blur-md">
          <h2 className="text-xl font-bold uppercase tracking-wider text-neutral-100 mb-2">
            Terms of Service & Community Rules
          </h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            All members of Central Operations are required to adhere to the following community and in-game regulations. Failure to comply may result in formal warnings, removal, or permanent blacklist at the discretion of Management.
          </p>
        </div>

        {/* Section 1: Community Rules */}
        <div className="bg-neutral-900/80 border border-neutral-800 p-8 shadow-xl backdrop-blur-md flex flex-col gap-6">
          <div className="pb-4 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#5865F2]">
              Community & Discord Rules
            </h3>
            <span className="text-[10px] font-mono text-neutral-500">GENERAL REGULATION</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {communityRules.map((rule) => (
              <div key={`comm-${rule.id}`} className="bg-neutral-950/80 border border-neutral-800/80 p-4 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#5865F2] bg-neutral-900 px-1.5 py-0.5 border border-neutral-800">
                    {rule.id}
                  </span>
                  <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wide">
                    {rule.title}
                  </h4>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed font-normal pt-1">
                  {rule.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: In-Game Rules */}
        <div className="bg-neutral-900/80 border border-neutral-800 p-8 shadow-xl backdrop-blur-md flex flex-col gap-6">
          <div className="pb-4 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#5865F2]">
              In-Game Server Rules
            </h3>
            <span className="text-[10px] font-mono text-neutral-500">ROLEPLAY REGULATION</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inGameRules.map((rule) => (
              <div key={`ingame-${rule.id}`} className="bg-neutral-950/80 border border-neutral-800/80 p-4 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#5865F2] bg-neutral-900 px-1.5 py-0.5 border border-neutral-800">
                    {rule.id}
                  </span>
                  <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wide">
                    {rule.title}
                  </h4>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed font-normal pt-1">
                  {rule.text}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Footer */}
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between px-10 py-4 bg-neutral-900/90 border-t border-neutral-800 text-xs text-neutral-400">
        <p className="font-mono text-[11px]">&copy; Central Operations - Ownership Team. All rights reserved.</p>
        
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