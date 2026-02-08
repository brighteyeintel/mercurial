'use client';

import { useSession } from "next-auth/react";

import { useEffect, useState, useRef } from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { useRouter } from "next/navigation";

interface DashboardEvent {
    _id: string;
    route_id: string;
    action: string;
    updatedAt: string;
}

export default function RecentActivityPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [activity, setActivity] = useState<{ events: DashboardEvent[] }>({ events: [] });
    const [isLoadingActivity, setIsLoadingActivity] = useState(false);
    const hasFetched = useRef(false);


    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
    }, [status, router]);

    useEffect(() => {
        const fetchActivity = async () => {
            if (hasFetched.current) return;
            hasFetched.current = true;
            
            setIsLoadingActivity(true);
            try {
                const res = await fetch('/api/dashboard/activity', { method: 'GET' });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error((data as any)?.error || 'Failed to load activity');
                }
                setActivity({
                    events: data.events
                });
            } catch (error) {
                console.error('Error fetching activity:', error);
                hasFetched.current = false; // Allow retry on error
            } finally {
                setIsLoadingActivity(false);
            }
        };

        if (status === 'authenticated') {
            fetchActivity();
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
            <div className="fixed w-full h-full  bg-linear-to-b from-sky-100 to-zinc-950 mask-[url('/world-map.min.svg')] mask-cover mask-center opacity-10 translate-z-[-10px]"></div>
            <Navbar />
            <main className="flex-1 container mx-auto px-6 py-12 relative z-10">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight text-white uppercase font-mono">
                                Recent Activity
                            </h1>
                            <p className="mt-2 text-zinc-400">
                                Monitor your optimization history and system interactions.
                            </p>
                        </div>
                        <div className="px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-md text-sm font-medium text-zinc-300">
                            {activity.events.length} Events Total
                        </div>
                    </div>

                    {isLoadingActivity ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-800 border-t-sky-500" />
                            <p className="text-zinc-500 animate-pulse font-medium">Synchronizing activity log...</p>
                        </div>
                    ) : activity.events.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-20 text-center backdrop-blur-sm">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800/50 mb-6 border border-zinc-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">No activity found</h3>
                            <p className="text-zinc-400 max-w-sm mx-auto">
                                You haven&apos;t generated any optimization events yet. Try saving or editing a route to see activity here.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-xl shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-separate border-spacing-0">
                                    <thead>
                                        <tr className="bg-zinc-900/50 backdrop-blur-md">
                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
                                                Route Identifier
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
                                                Action Performed
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
                                                Execution Timestamp
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/50">
                                        {activity.events.map((event) => (
                                            <tr 
                                                key={event._id} 
                                                className="group transition-all duration-300 hover:bg-white/3 cursor-default"
                                            >
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:border-sky-500/50 group-hover:bg-sky-500/10 transition-colors">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-400 group-hover:text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
                                                            </svg>
                                                        </div>
                                                        <span className="font-mono text-sm text-zinc-300 group-hover:text-white transition-colors">
                                                            {event.route_id}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                                        event.action.toLowerCase().includes('create') || event.action.toLowerCase().includes('save')
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                            : event.action.toLowerCase().includes('delete')
                                                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                                : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                                    }`}>
                                                        {event.action}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-zinc-200">
                                                            {new Date(event.updatedAt).toLocaleDateString(undefined, {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            })}
                                                        </span>
                                                        <span className="text-xs text-zinc-500">
                                                            {new Date(event.updatedAt).toLocaleTimeString(undefined, {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                second: '2-digit'
                                                            })}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
