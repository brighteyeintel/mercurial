'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
    }, [status, router]);

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
        <div className="flex min-h-screen flex-col bg-zinc-900 text-white">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-white uppercase font-mono">
                        Dashboard
                    </h1>
                    <p className="mt-2 text-zinc-400">
                        Welcome to your dashboard. Manage your routes and view analytics here.
                    </p>
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
