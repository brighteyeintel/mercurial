"use client";

import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./Map'), {
    ssr: false,
    loading: () => <div className="h-[calc(100vh-64px)] w-full bg-zinc-950 flex items-center justify-center text-zinc-500">Loading Map...</div>
});

export default function MapWrapper() {
    return <Map />;
}
