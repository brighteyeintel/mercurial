
'use client';

import { signIn } from "next-auth/react";
import { Truck, Github } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
    return (
        <div className="flexmin-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center justify-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 mb-6">
                        <Truck className="h-6 w-6 text-zinc-100" />
                    </div>
                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-white font-mono uppercase">
                        Join Mercurial
                    </h2>
                    <p className="mt-2 text-sm text-zinc-400">
                        Sign in to access the intelligent logistics suite
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => signIn('github', { callbackUrl: '/mercurial' })}
                            className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-3 text-sm font-semibold text-zinc-950 shadow-sm hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors"
                        >
                            <Github className="h-5 w-5" />
                            Sign in with GitHub
                        </button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-zinc-800" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-zinc-950 px-2 text-zinc-500">
                                Protected Access
                            </span>
                        </div>
                    </div>

                    <p className="text-center text-xs text-zinc-600">
                        By signing in, you agree to our{' '}
                        <Link href="#" className="font-medium text-zinc-400 hover:text-zinc-300">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="#" className="font-medium text-zinc-400 hover:text-zinc-300">
                            Privacy Policy
                        </Link>
                        .
                    </p>
                </div>
            </div>
        </div>
    );
}
