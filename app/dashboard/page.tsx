'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { CountUp } from 'countup.js';

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
    }, [status, router]);

    useEffect(() => {
        if (status === 'authenticated') {
            const countElements = document.querySelectorAll('[data-count-to]');
            countElements.forEach((el) => {
                const endVal = parseInt(el.getAttribute('data-count-to') || '0');
                const countUp = new CountUp(el as HTMLElement, endVal, {
                    duration: 2,
                    useEasing: true,
                    useGrouping: true,
                });
                if (!countUp.error) {
                    countUp.start();
                }
            });
        }
    }, [status]);

    if (status === 'loading') {
        return (
            <div className="flex min-h-screen flex-col bg-zinc-900 text-white">
                <Navbar />
                <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-500 border-t-white" />
                </main>
                <Footer />
            </div>
        );
    }
    
    if (!session) {
        return null;
    }

    return (
        
        <div className="flex min-h-screen flex-col text-white">
            <div className="fixed w-full h-full  bg-gradient-to-b from-sky-100 to-zinc-950 [mask-image:url('/world-map.min.svg')] [mask-size:cover] [mask-position:center] opacity-10 translate-z-[-10px]"></div>
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8 backdrop-blur-[2px]">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-white uppercase font-mono">
                        Dashboard
                    </h1>
                    <p className="mt-2 text-zinc-400">
                        Welcome to your dashboard. Manage your routes and view analytics here.
                    </p>
                </div>

                <div className="grid gap-6 grid-cols-3 justify-items-center py-5">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-32 h-32 bg-sky-400/50 [mask-image:url('/arrows-reload-01-svgrepo-com.svg')] mask-contain mask-no-repeat mask-center mb-4"></div>
                        <span className="text-white text-8xl font-mono" data-count-to="10">0</span>
                        <p className="mt-4 text-zinc-400 text-xl">Routes</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <div className="w-32 h-32 bg-red-600/50 [mask-image:url('/triangle-exclamation-svgrepo-com.svg')] mask-contain mask-no-repeat mask-center mb-4"></div>
                        <span className="text-white text-8xl font-mono" data-count-to="5">0</span>
                        <p className="mt-4 text-zinc-400 text-xl">Risk Events</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <div className="w-32 h-32 bg-green-400/50 [mask-image:url('/circle-tick-svgrepo-com.svg')] mask-contain mask-no-repeat mask-center mb-4"></div>
                        <span className="text-white text-8xl font-mono" data-count-to="20">0</span>
                        <p className="mt-4 text-zinc-400 text-xl">Shipments Optimized</p>
                    </div>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Placeholder Dashboard Cards */}
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-6 shadow-sm hover:border-zinc-700 transition-colors">
                        <h3 className="text-lg font-medium text-white mb-2">My Routes</h3>
                        <p className="text-zinc-400 text-sm">View and manage your saved delivery routes.</p>
                    </div>
                    
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-6 shadow-sm hover:border-zinc-700 transition-colors">
                        <h3 className="text-lg font-medium text-white mb-2">Recent Activity</h3>
                        <p className="text-zinc-400 text-sm">Check your recent optimization history.</p>
                    </div>

                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-6 shadow-sm hover:border-zinc-700 transition-colors">
                        <h3 className="text-lg font-medium text-white mb-2">Settings</h3>
                        <p className="text-zinc-400 text-sm">Update your preferences and account details.</p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
