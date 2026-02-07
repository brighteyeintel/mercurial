'use client';

import Link from 'next/link';
import { Truck } from 'lucide-react';
import { useSession, signIn, signOut } from "next-auth/react"

export default function Navbar() {
  const { data: session, status } = useSession()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <Truck className="h-6 w-6 text-zinc-100" />
          <span className="text-xl font-bold tracking-tight text-white uppercase font-mono">Mercurial</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors uppercase tracking-wider">
            Features
          </Link>
          <Link href="#solutions" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors uppercase tracking-wider">
            Solutions
          </Link>
          <Link href="#pricing" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors uppercase tracking-wider">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          {status === "loading" ? (
            <div className="h-9 w-20 animate-pulse bg-zinc-800 rounded-md" />
          ) : session ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-zinc-400 hidden sm:block">
                {session.user?.name || session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors uppercase tracking-wider hover:cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => signIn('github')}
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors uppercase tracking-wider hover:cursor-pointer"
              >
                Login
              </button>
              <button
                onClick={() => signIn('github')}
                className="hidden sm:inline-flex h-9 items-center justify-center rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 shadow hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-300 disabled:pointer-events-none disabled:opacity-50 font-mono uppercase tracking-wide hover:cursor-pointer"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
