"use client";
import dynamic from 'next/dynamic';
import { NavigationWarning } from '../types/NavigationWarning';
import { MapComponentProps } from './Map';
import { RoutePreviewData } from '../hooks/useRoutePreview';

// Dynamic import for the Map container component
const Map = dynamic<MapComponentProps>(() => import('./Map'), {
    ssr: false,
    loading: () => <div className="h-[calc(100vh-64px)] w-full bg-zinc-950 flex items-center justify-center text-zinc-500">Loading Map...</div>
});

interface MapWrapperProps {
    selectedWarning?: NavigationWarning | null;
    routePreviews?: RoutePreviewData[];
}

export default function MapWrapper({ selectedWarning, routePreviews = [] }: MapWrapperProps) {
    return <Map selectedWarning={selectedWarning} routePreviews={routePreviews} />;
}

