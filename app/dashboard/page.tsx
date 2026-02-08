'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { CountUp } from 'countup.js';


export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [stats, setStats] = useState({ savedRoutesCount: 0, fixedFive: 0, fixedTen: 0 });
    const [isLoadingStats, setIsLoadingStats] = useState(false);


    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
    }, [status, router]);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoadingStats(true);
            try {
                const res = await fetch('/api/dashboard/stats', { method: 'GET' });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error((data as any)?.error || 'Failed to load stats');
                }
                setStats({
                    savedRoutesCount: data.savedRoutesCount ?? 0,
                    fixedFive: data.fixedFive ?? 0,
                    fixedTen: data.fixedTen ?? 0
                });
            } catch (error) {
                console.error('Error fetching stats:', error);
                // Optionally set an error state here if you want to show it in the UI
            } finally {
                setIsLoadingStats(false);
            }
        };

        if (status === 'authenticated') {
            fetchStats();
        }
    }, [status]);

    useEffect(() => {
        if (status === 'authenticated' && !isLoadingStats) {
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
    }, [status, stats, isLoadingStats]);


    

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
            <div className="fixed w-full h-full  bg-linear-to-b from-sky-100 to-zinc-950 mask-[url('/world-map.min.svg')] mask-cover mask-center opacity-10 translate-z-[-10px]"></div>
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8 backdrop-blur-[2px]">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold tracking-tight text-white uppercase font-mono">
                        Dashboard
                    </h1>
                    <p className="mt-2 text-zinc-400">
                        Welcome to your dashboard. Manage your routes and view analytics here.
                    </p>
                </div>

                <div className="grid gap-6 grid-cols-3 justify-items-center py-5">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-32 h-32 bg-sky-400/50 mask-[url('/arrows-reload-01-svgrepo-com.svg')] mask-contain mask-no-repeat mask-center mb-4"></div>
                        <span className="text-white text-8xl" data-count-to={stats.savedRoutesCount}>0</span>
                        <p className="mt-4 text-zinc-400 text-xl">Routes</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <div className="w-32 h-32 bg-red-600/50 mask-[url('/triangle-exclamation-svgrepo-com.svg')] mask-contain mask-no-repeat mask-center mb-4"></div>
                        <span className="text-white text-8xl" data-count-to={stats.fixedFive}>0</span>
                        <p className="mt-4 text-zinc-400 text-xl">Risk Events</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <div className="w-32 h-32 bg-green-400/50 mask-[url('/circle-tick-svgrepo-com.svg')] mask-contain mask-no-repeat mask-center mb-4"></div>
                        <span className="text-white text-8xl" data-count-to={stats.fixedTen}>0</span>
                        <p className="mt-4 text-zinc-400 text-xl">Shipments Optimized</p>
                    </div>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {/* My Routes */}
                    <div className="group relative hover:cursor-pointer overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 hover:border-zinc-700 hover:bg-zinc-900 transition-all">
                        <h3 className="mb-2 text-xl font-bold text-white tracking-wide group-hover:text-sky-400 transition-colors">My Routes</h3>
                        <p className="text-zinc-400 leading-relaxed">
                        View and manage your saved delivery routes.
                        </p>
                    </div>

                    {/* Recent Activity */}
                    <div className="group relative hover:cursor-pointer overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 hover:border-zinc-700 hover:bg-zinc-900 transition-all">
                        <h3 className="mb-2 text-xl font-bold text-white tracking-wide group-hover:text-sky-400 transition-colors">Recent Activity</h3>
                        <p className="text-zinc-400 leading-relaxed">
                        Check your recent optimization history.
                        </p>
                    </div>

                    {/* Settings */}
                    <div className="group relative hover:cursor-pointer overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 hover:border-zinc-700 hover:bg-zinc-900 transition-all">
                        <h3 className="mb-2 text-xl font-bold text-white tracking-wide group-hover:text-sky-400 transition-colors">Settings</h3>
                        <p className="text-zinc-400 leading-relaxed">
                        Update your preferences and account details.
                        </p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
