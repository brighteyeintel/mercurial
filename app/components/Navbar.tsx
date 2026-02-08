'use client';

import Link from 'next/link';
import { Truck } from 'lucide-react';
import { useSession, signIn, signOut } from "next-auth/react"

export default function Navbar() {
  const { data: session, status } = useSession()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80 group">
          <Truck className="h-10 w-10 text-sky-400 group-hover:animate-[spin_1s_linear_1]"/>
          <span className="text-3xl font-bold tracking-tight text-white uppercase font-mono">Mercur<span className="text-sky-400">ial</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/#capabilities" className="text-md font-medium text-zinc-400 hover:text-white transition-colors uppercase tracking-wider">
            Capabilities
          </Link>
          <Link href="/#solutions" className="text-md font-medium text-zinc-400 hover:text-white transition-colors uppercase tracking-wider">
            Solutions
          </Link>
          <Link href="/current-threats" className="text-md font-medium text-zinc-400 hover:text-white transition-colors uppercase tracking-wider">
            Current Threats
          </Link>
          {session && (
            <Link href="/route-editor" className="text-md font-medium text-zinc-400 hover:text-white transition-colors uppercase tracking-wider">
              Route Editor
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-4">
          {status === "loading" ? (
            <div className="h-9 w-20 animate-pulse bg-zinc-800 rounded-md" />
          ) : session ? (
            <div className="flex items-center gap-4">
              <Link href="/dashboard"
                className="text-md font-medium text-zinc-400 hover:text-white uppercase tracking-wider hover:cursor-pointer flex items-center transition-colors group"
              >
                <svg className="w-5 h-5 mr-2 text-zinc-400 group-hover:animate-[pulse_0.5s_ease-in-out_1] group-hover:text-sky-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="7.25" r="5.73"/>
                  <path d="M1.5,23.48l.37-2.05A10.3,10.3,0,0,1,12,13h0a10.3,10.3,0,0,1,10.13,8.45l.37,2.05" />
                </svg>
                {session.user?.name?.toUpperCase().replace(/ .*/, '') || session.user?.email?.toUpperCase().replace(/@.*/, '')}
              </Link>
              <button
                onClick={() => signOut()}
                className="min-w-[100px] hidden sm:inline-flex h-9 items-center justify-center rounded-md bg-zinc-100 px-4 py-2 text-md font-medium text-zinc-900 shadow hover:bg-sky-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-300 disabled:pointer-events-none disabled:opacity-50 font-mono uppercase tracking-wide hover:cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={() => signIn('github')}
                className="text-md font-medium text-zinc-400 hover:text-white transition-colors uppercase tracking-wider hover:cursor-pointer"
              >
                Login
              </button>
              <button
                onClick={() => signIn('github')}
                className="min-w-[100px] hidden sm:inline-flex h-9 items-center justify-center rounded-md bg-zinc-100 px-4 py-2 text-md font-medium text-zinc-900 shadow hover:bg-sky-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-300 disabled:pointer-events-none disabled:opacity-50 font-mono uppercase tracking-wide hover:cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
