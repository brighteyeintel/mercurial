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
import { RailDisruption } from '../types/RailDisruption';
import { GPSJammingPoint } from '../types/GPSJamming';
import { PowerOutage } from '../types/PowerOutage';
import { WaterIncident } from '../types/WaterIncident';
import { TradeBarrier } from '../types/TradeBarrier';

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
    tradeBarriers?: TradeBarrier[];
    visibleCategories?: Record<string, boolean>;
    checkedRailDisruptions?: RailDisruption[];
    selectedRailDisruption?: RailDisruption | null;
    gpsJammingPoints?: GPSJammingPoint[];
    showGPSJamming?: boolean;
    checkedElectricityOutages?: PowerOutage[];
    selectedElectricityOutage?: PowerOutage | null;
    checkedWaterIncidents?: WaterIncident[];
    selectedWaterIncident?: WaterIncident | null;
    leftPadding?: number;
    rightPadding?: number;
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
    tradeBarriers = [],
    visibleCategories = { "Road Works": false, "Accident": false, "Congestion": false, "Maritime": false, "Other": false },
    checkedRailDisruptions = [],
    selectedRailDisruption = null,
    gpsJammingPoints = [],
    showGPSJamming = false,
    checkedElectricityOutages = [],
    selectedElectricityOutage = null,
    checkedWaterIncidents = [],
    selectedWaterIncident = null,
    leftPadding = 50,
    rightPadding = 50
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
        tradeBarriers={tradeBarriers}
        visibleCategories={visibleCategories}
        checkedRailDisruptions={checkedRailDisruptions}
        selectedRailDisruption={selectedRailDisruption}
        gpsJammingPoints={gpsJammingPoints}
        showGPSJamming={showGPSJamming}
        checkedElectricityOutages={checkedElectricityOutages}
        selectedElectricityOutage={selectedElectricityOutage}
        checkedWaterIncidents={checkedWaterIncidents}
        selectedWaterIncident={selectedWaterIncident}
        leftPadding={leftPadding}
        rightPadding={rightPadding}
    />;
}
