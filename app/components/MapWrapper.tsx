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

import { Notam } from '../types/Notam';
import { WeatherAlert } from '../types/WeatherAlert';

// ... (dynamic import remains same)

interface MapWrapperProps {
    selectedWarning?: NavigationWarning | null;
    selectedNotam?: Notam | null;
    selectedWeatherAlert?: WeatherAlert | null;
    routePreviews?: RoutePreviewData[];
    selectedTradeBarrierCountry?: string | null;
    checkedWarnings?: NavigationWarning[];
    checkedNotams?: Notam[];
    checkedWeatherAlerts?: WeatherAlert[];
    checkedTradeCountries?: string[];
    visibleCategories: Record<string, boolean>;
}

export default function MapWrapper({
    selectedWarning,
    selectedNotam,
    selectedWeatherAlert,
    routePreviews = [],
    selectedTradeBarrierCountry,
    checkedWarnings = [],
    checkedNotams = [],
    checkedWeatherAlerts = [],
    checkedTradeCountries = [],
    visibleCategories
}: MapWrapperProps) {
    return <Map
        selectedWarning={selectedWarning}
        selectedNotam={selectedNotam}
        selectedWeatherAlert={selectedWeatherAlert}
        routePreviews={routePreviews}
        selectedTradeBarrierCountry={selectedTradeBarrierCountry}
        checkedWarnings={checkedWarnings}
        checkedNotams={checkedNotams}
        checkedWeatherAlerts={checkedWeatherAlerts}
        checkedTradeCountries={checkedTradeCountries}
        visibleCategories={visibleCategories}
    />;
}
