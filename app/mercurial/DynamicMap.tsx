"use client";

import dynamic from 'next/dynamic';

const MapWrapper = dynamic(() => import('../components/MapWrapper'), {
    ssr: false,
    loading: () => <div className="text-zinc-500">Loading Map...</div>
});

export default function DynamicMap() {
    return <MapWrapper />;
}
