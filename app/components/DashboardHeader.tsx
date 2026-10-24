'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface DashboardHeaderProps {
  user: {
    username: string;
    id: string;
    avatar: string | null;
  };
  avatarUrl: string;
}

export default function DashboardHeader({ user, avatarUrl }: DashboardHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 px-3 py-1.5 transition-colors cursor-pointer"
      >
        <img 
          src={avatarUrl} 
          alt="User Avatar" 
          className="w-6 h-6 rounded-full border border-neutral-700" 
        />
        <span className="text-xs font-semibold text-neutral-200 tracking-wider">
          {user.username}
        </span>
        <svg className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-800 shadow-2xl py-1 z-40">
          <div className="px-4 py-2 border-b border-neutral-800 mb-1">
            <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Signed in as</p>
            <p className="text-xs font-semibold text-neutral-200 truncate">{user.username}</p>
          </div>

          <Link
            href="/dashboard/profile"
            onClick={() => setDropdownOpen(false)}
            className="block px-4 py-2 text-xs font-semibold tracking-wider text-neutral-300 hover:bg-neutral-800 hover:text-white uppercase transition-colors"
          >
            Profile
          </Link>

          <Link
            href="/"
            className="block px-4 py-2 text-xs font-semibold tracking-wider text-red-400 hover:bg-red-500/10 hover:text-red-300 uppercase transition-colors border-t border-neutral-800 mt-1 pt-2"
          >
            Log Out
          </Link>
        </div>
      )}
    </div>
  );
}