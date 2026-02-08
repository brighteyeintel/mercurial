"use client";

import { useState, useEffect, useMemo, useCallback, useRef, type ChangeEvent, type MouseEvent } from "react";
import { useSession } from "next-auth/react"
import { ShippingRouteData, Stage, TransportMode, Transport, Holding, Location } from "../types/ShippingRouteData";
import { Port, WorldPortsData } from "../types/Port";
import { Plus, Trash2, Save, ArrowLeft, Box, Clock, Globe, Check, X, AlertTriangle, Edit, Rss, Newspaper, ExternalLink } from "lucide-react";
import Link from "next/link";

import { NavigationWarning } from "../types/NavigationWarning";
import { Notam } from "../types/Notam";
import { WeatherAlert } from "../types/WeatherAlert";
import { TradeBarrier } from "../types/TradeBarrier";
import { PowerOutage } from "../types/PowerOutage";
import { WaterIncident } from "../types/WaterIncident";
import { RailDisruption } from "../types/RailDisruption";
import { GPSJammingPoint } from "../types/GPSJamming";

// Helper to get initial empty location
const getEmptyLocation = (): Location => ({
    name: "",
    latitude: 0,
    longitude: 0,
    code: ""
});

// Helper to get initial empty transport object
const getEmptyTransport = (): Transport => ({
    source: getEmptyLocation(),
    destination: getEmptyLocation(),
    mode: TransportMode.Flight, // Default
    courier: "",
    additional: ""
});

// Helper to get initial empty holding object
const getEmptyHolding = (): Holding => ({
    location: "",
    duration: "",
    additional: ""
});

// Helper to calculate distance between two points in miles (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3958.8; // Radius of the Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

interface ShippingRoutePanelProps {
    fetchAllRoutePreviews?: (stages: Stage[]) => Promise<void>;
    clearAllPreviews?: () => void;
    isLoadingAll?: boolean;
    routePreviews?: any[];
    onToggleRisksOnMap?: (risks: RouteRiskPoint[], enable: boolean) => void;

    // Full datasets for standardization
    navigationWarnings?: NavigationWarning[];
    notams?: Notam[];
    weatherAlerts?: WeatherAlert[];
    tradeBarriers?: TradeBarrier[];
    railDisruptions?: RailDisruption[];
    electricityOutages?: PowerOutage[];
    waterIncidents?: WaterIncident[];
    gpsJammingPoints?: GPSJammingPoint[];
}

export interface RouteRiskPoint {
    id: string;
    lat: number;
    lon: number;
    type: 'weather' | 'navigation' | 'notam' | 'traffic' | 'jamming' | 'train-disruption' | 'trade-barrier' | 'electricity' | 'water';
    category?: string;
    severity?: number;
    country?: string;
    title?: string;
}

export default function ShippingRoutePanel({
    fetchAllRoutePreviews,
    clearAllPreviews,
    isLoadingAll = false,
    routePreviews = [],
    onToggleRisksOnMap,
    navigationWarnings = [],
    notams = [],
    weatherAlerts = [],
    tradeBarriers = [],
    railDisruptions = [],
    electricityOutages = [],
    waterIncidents = [],
    gpsJammingPoints = [],
}: ShippingRoutePanelProps) {
    // ... (existing state and logic)

    // ... inside the detailed risk list rendering ...

    const [view, setView] = useState<'list' | 'edit' | 'overview'>('list');
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
    const [routeIdPendingDelete, setRouteIdPendingDelete] = useState<string | null>(null);
    const [routeName, setRouteName] = useState("");
    const [goodsType, setGoodsType] = useState("");
    const [stages, setStages] = useState<Stage[]>([]);
    const [monitors, setMonitors] = useState<string[]>([]);
    const [feeds, setFeeds] = useState<string[]>([]);
    const [monitorResults, setMonitorResults] = useState<any[]>([]);
    const [isMonitoringLoading, setIsMonitoringLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedRouteId, setSavedRouteId] = useState<string | null>(null);
    const [routes, setRoutes] = useState<Array<{ _id: string; name: string }>>([]);
    const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
    const [airports, setAirports] = useState<any[]>([]);
    const [ports, setPorts] = useState<Port[]>([]);
    const [routeRisks, setRouteRisks] = useState<RouteRiskPoint[]>([]);
    const [isLoadingRisks, setIsLoadingRisks] = useState(false);
    const [risksError, setRisksError] = useState<string | null>(null);
    const [showRisksOnMap, setShowRisksOnMap] = useState(false);

    const { data: session, status } = useSession()

    // Memoize airport options to prevent redundant renders of thousands of DOM nodes
    const airportOptions = useMemo(() => {
        return airports.map(a => (
            <option key={a.icao} value={a.icao}>{a.name} ({a.city}, {a.country})</option>
        ));
    }, [airports]);

    // Memoize port options
    const portOptions = useMemo(() => {
        return ports.map(p => (
            <option key={p.portNumber} value={p.portName}>{p.portName} ({p.countryCode})</option>
        ));
    }, [ports]);

    const fetchRoutes = async () => {
        if (status === "loading") {
            return;
        }

        if (!session) {
            setRoutes([]);
            return;
        }

        setIsLoadingRoutes(true);
        try {
            const res = await fetch('/api/shippingroutes', { method: 'GET' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error((data as any)?.error || 'Failed to load routes');
            }
            const nextRoutes = Array.isArray((data as any)?.routes) ? (data as any).routes : [];
            setRoutes(
                nextRoutes
                    .map((r: any) => ({ _id: String(r._id), name: String(r.name ?? '') }))
                    .filter((r: { _id: string; name: string }) => r.name)
            );
        } catch {
            setRoutes([]);
        } finally {
            setIsLoadingRoutes(false);
        }
    };

    const deleteRoute = async (id: string) => {
        if (status === "loading") {
            return;
        }

        if (!session) {
            return;
        }

        setIsSaving(true);
        setSaveError(null);
        setSavedRouteId(null);
        try {
            const res = await fetch(`/api/shippingroutes/${encodeURIComponent(id)}`, { method: 'DELETE' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error((data as any)?.error || 'Failed to delete route');
            }

            if (selectedRouteId === id) {
                setSelectedRouteId(null);
                clearAllPreviews?.();
            }
            setRouteIdPendingDelete(null);
            await fetchRoutes();
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Failed to delete route');
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        fetchRoutes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, session]);

    useEffect(() => {
        if ((view === 'overview' || view === 'edit') && stages.length > 0 && fetchAllRoutePreviews) {
            fetchAllRoutePreviews(stages);
        }
    }, [view, stages, fetchAllRoutePreviews]);

    useEffect(() => {
        const fetchRisks = async (routeId: string) => {
            setIsLoadingRisks(true);
            setRisksError(null);
            try {
                const res = await fetch(`/api/shippingroutes/${encodeURIComponent(routeId)}/disruptions`, { method: 'GET' });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error((data as any)?.error || 'Failed to load risks');
                }
                const nextRisks = Array.isArray((data as any)?.risks) ? (data as any).risks : [];
                setRouteRisks(nextRisks);
            } catch (e) {
                setRouteRisks([]);
                setRisksError(e instanceof Error ? e.message : 'Failed to load risks');
            } finally {
                setIsLoadingRisks(false);
            }
        };

        if (view === 'overview' && selectedRouteId) {
            fetchRisks(selectedRouteId);
        } else {
            setRouteRisks([]);
            setRisksError(null);
            setIsLoadingRisks(false);
        }
    }, [view, selectedRouteId]);

    useEffect(() => {
        fetch('/api/aviation/airports')
            .then(res => res.json())
            .then(data => {
                if (data.airports) {
                    setAirports(data.airports);
                }
            })
            .catch(err => console.error("Failed to fetch airports", err));

        fetch('/api/maritime/portlocations')
            .then(res => res.json())
            .then((data: WorldPortsData) => {
                if (data.ports) {
                    setPorts(Object.values(data.ports));
                }
            })
            .catch(err => console.error("Failed to fetch ports", err));
    }, []);

    const loadRouteDetails = async (id: string, targetView: 'edit' | 'overview' = 'overview') => {
        if (status === "loading") {
            return;
        }

        if (!session) {
            return;
        }

        setIsSaving(true);
        setSaveError(null);
        setSavedRouteId(null);

        try {
            const res = await fetch(`/api/shippingroutes/${encodeURIComponent(id)}`, { method: 'GET' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error((data as any)?.error || 'Failed to load route');
            }

            const route = (data as any)?.route;
            const parsed = ShippingRouteData.fromJSON(route);
            const rawId = route?._id ?? id;
            const nextId = typeof rawId === 'string' ? rawId : (rawId?.toString?.() ?? String(rawId));
            setSelectedRouteId(nextId);
            setRouteName(parsed.name);
            setGoodsType(parsed.goods_type);
            setStages(parsed.stages);
            setMonitors(parsed.monitors || []);
            setFeeds(parsed.feeds || []);
            setView(targetView);
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Failed to load route');
        } finally {
            setIsSaving(false);
        }
    };

    const addStage = () => {
        setStages([...stages, { transport: getEmptyTransport() }]);
    };

    const removeStage = (index: number) => {
        const newStages = [...stages];
        newStages.splice(index, 1);
        setStages(newStages);
    };

    const updateStageType = (index: number, type: 'transport' | 'holding') => {
        const newStages = [...stages];
        if (type === 'transport') {
            newStages[index] = { transport: getEmptyTransport() };
        } else {
            newStages[index] = { holding: getEmptyHolding() };
        }
        setStages(newStages);
    };

    const updateTransportField = (index: number, field: keyof Transport, value: string) => {
        const newStages = [...stages];
        if (newStages[index].transport) {
            newStages[index] = {
                transport: { ...newStages[index].transport!, [field]: value } as Transport
            };
            setStages(newStages);
        }
    };

    const updateTransportLocation = (index: number, type: 'source' | 'destination', field: keyof Location, value: string | number) => {
        const newStages = [...stages];
        if (newStages[index].transport) {
            newStages[index] = {
                transport: {
                    ...newStages[index].transport!,
                    [type]: {
                        ...newStages[index].transport![type],
                        [field]: value
                    }
                } as Transport
            };
            setStages(newStages);
        }
    };

    const updateHoldingField = (index: number, field: keyof Holding, value: string) => {
        const newStages = [...stages];
        if (newStages[index].holding) {
            newStages[index] = {
                holding: { ...newStages[index].holding!, [field]: value } as Holding
            };
            setStages(newStages);
        }
    };

    const onAirportSelect = (index: number, type: 'source' | 'destination', code: string) => {
        const newStages = [...stages];
        const stage = newStages[index];
        if (!stage.transport) return;

        // Case-insensitive check for airport
        const airport = airports.find(a => a.icao.toUpperCase() === code.toUpperCase() || a.iata?.toUpperCase() === code.toUpperCase());

        newStages[index] = {
            transport: {
                ...stage.transport,
                [type]: {
                    ...stage.transport[type],
                    code: code, // Always update the code even if not a full match yet
                    ...(airport ? {
                        name: airport.name,
                        latitude: airport.latitude,
                        longitude: airport.longitude,
                        code: airport.icao // Use formal ICAO if matched
                    } : {})
                }
            } as Transport
        };
        setStages(newStages);
    };

    const onPortSelect = (index: number, type: 'source' | 'destination', name: string) => {
        const newStages = [...stages];
        const stage = newStages[index];
        if (!stage.transport) return;

        // Case-insensitive check for port name
        const port = ports.find(p => p.portName.toLowerCase() === name.toLowerCase());

        newStages[index] = {
            transport: {
                ...stage.transport,
                [type]: {
                    ...stage.transport[type],
                    name: name,
                    ...(port ? {
                        latitude: port.latitude,
                        longitude: port.longitude,
                        code: port.portNumber.toString() // Port Number acts as the "code" for Sea transport
                    } : {})
                }
            } as Transport
        };
        setStages(newStages);
    }

    const resolveCoordinates = async (index: number, type: 'source' | 'destination') => {
        const stage = stages[index];
        if (!stage.transport) return;

        const locationName = stage.transport[type].name;
        if (!locationName || locationName.length < 2) return;

        setIsSaving(true);
        try {
            const res = await fetch('/api/roads/get-place-coords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: locationName }),
            });
            const data = await res.json();

            if (res.ok && data.lat && data.lng) {
                const newStages = [...stages];
                if (newStages[index].transport) {
                    newStages[index] = {
                        transport: {
                            ...newStages[index].transport!,
                            [type]: {
                                ...newStages[index].transport![type],
                                latitude: data.lat,
                                longitude: data.lng,
                                ...(data.formattedAddress ? { name: data.formattedAddress } : {})
                            }
                        } as Transport
                    };
                    setStages(newStages);
                }
            } else {
                setSaveError(data.error || "Failed to resolve coordinates");
            }
        } catch (err) {
            console.error("Failed to resolve coordinates", err);
            setSaveError("Failed to connect to geocoding service");
        } finally {
            setIsSaving(false);
        }
    };

    const onRouteSave = async () => {
        if (status === "loading") {
            return;
        }

        if (!session) {
            return;
        }

        setIsSaving(true);
        setSaveError(null);
        setSavedRouteId(null);

        try {
            const routeData = new ShippingRouteData(routeName, goodsType, stages, monitors, feeds);
            const isEdit = !!selectedRouteId;
            const url = isEdit ? `/api/shippingroutes/${encodeURIComponent(selectedRouteId!)}` : '/api/shippingroutes';
            const method = isEdit ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(routeData.toJSON()),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error((data as any)?.error || 'Failed to save route');
            }

            const id = (data as any)?.route?._id;
            const savedId = typeof id === 'string' ? id : (id?.toString?.() ?? String(id));
            setSavedRouteId(savedId);
            setSelectedRouteId(savedId);
            await fetchRoutes();
            setView('overview');
            clearAllPreviews?.();
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Failed to save route');
        } finally {
            setIsSaving(false);
        }
    }

    const addMonitor = (monitor: string) => {
        if (monitor && !monitors.includes(monitor)) {
            setMonitors([...monitors, monitor]);
        }
    };

    const removeMonitor = (monitor: string) => {
        setMonitors(monitors.filter(m => m !== monitor));
    };

    const addFeed = (feed: string) => {
        if (feed && !feeds.includes(feed)) {
            setFeeds([...feeds, feed]);
        }
    };

    const removeFeed = (feed: string) => {
        setFeeds(feeds.filter(f => f !== feed));
    };

    // Fetch monitoring results
    const fetchMonitoringResults = useCallback(() => {
        if (monitors.length > 0) {
            setIsMonitoringLoading(true);
            fetch('/api/monitoring', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ monitors, feeds })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.matches) {
                        setMonitorResults(data.matches);
                    } else {
                        setMonitorResults([]);
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch monitoring results", err);
                    setMonitorResults([]);
                })
                .finally(() => setIsMonitoringLoading(false));
        } else {
            setMonitorResults([]);
        }
    }, [monitors, feeds]);

    // Trigger fetch when in overview and dependencies change
    useEffect(() => {
        if (view === 'overview') {
            fetchMonitoringResults();
        }
    }, [view, fetchMonitoringResults]);

    return (
        <div className="h-full w-full bg-black flex flex-col">
            {/* Editor Header */}
            <div className="p-4 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    {/* <Link href="/" className="rounded-full bg-zinc-900 p-2 hover:bg-zinc-800 transition-colors">
                        <ArrowLeft className="h-4 w-4 text-zinc-400" />
                    </Link> */}
                    <h1 className="text-lg font-bold tracking-tight text-white uppercase font-mono">My Routes</h1>
                </div>
                {view === 'list' ? (
                    <button
                        className="inline-flex items-center justify-center rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                        onClick={() => {
                            setSelectedRouteId(null);
                            setRouteName('');
                            setGoodsType('');
                            setStages([]);
                            setSaveError(null);
                            setSavedRouteId(null);
                            setView('edit');
                            clearAllPreviews?.();
                        }}
                    >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Create Route
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            className="inline-flex items-center justify-center rounded border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-bold text-zinc-200 shadow hover:bg-zinc-900 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                            disabled={isSaving}
                            onClick={() => {
                                if (view === 'edit' && selectedRouteId) {
                                    setView('overview');
                                } else {
                                    setView('list');
                                    clearAllPreviews?.();
                                }
                            }}
                        >
                            Back
                        </button>

                        {view === 'overview' && (
                            <button
                                className="inline-flex items-center justify-center rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-blue-500 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 uppercase tracking-wider hover:cursor-pointer"
                                onClick={() => setView('edit')}
                            >
                                <Edit className="mr-1.5 h-3.5 w-3.5" />
                                Edit Route
                            </button>
                        )}

                        {view === 'edit' && (
                            <button
                                className="inline-flex items-center justify-center rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                                disabled={isSaving}
                                onClick={onRouteSave}
                            >
                                <Save className="mr-1.5 h-3.5 w-3.5" />
                                {isSaving ? 'Saving...' : selectedRouteId ? 'Save Changes' : 'Save'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Scrollable Form Area */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                <div className="space-y-6">

                    {saveError && (
                        <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-200">
                            {saveError}
                        </div>
                    )}

                    {savedRouteId && (
                        <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
                            Saved route: {savedRouteId}
                        </div>
                    )}

                    {view === 'list' ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold text-zinc-300 flex items-center gap-2 uppercase tracking-wide">
                                    Routes
                                </h2>
                                <button
                                    className="text-xs text-zinc-400 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 hover:text-zinc-200 hover:cursor-pointer"
                                    disabled={isLoadingRoutes}
                                    onClick={fetchRoutes}
                                >
                                    {isLoadingRoutes ? 'Loading...' : 'Refresh'}
                                </button>
                            </div>

                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/20">
                                {!session ? (
                                    <div className="p-4 text-sm text-zinc-500">
                                        Log in to view your routes.
                                    </div>
                                ) : routes.length === 0 ? (
                                    <div className="p-4 text-sm text-zinc-500">
                                        No routes yet.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-zinc-800">
                                        {routes.map((r: { _id: string; name: string }) => (
                                            <div
                                                key={r._id}
                                                className={`flex items-center justify-between gap-2 p-3 text-sm text-zinc-200 transition-colors ${isSaving ? 'bg-zinc-900/40' : 'hover:bg-zinc-900/40'
                                                    }`}
                                            >
                                                <button
                                                    className={`flex-1 text-left hover:cursor-pointer ${isSaving ? 'hover:cursor-progress' : ''}`}
                                                    disabled={isSaving}
                                                    onClick={() => loadRouteDetails(r._id)}
                                                >
                                                    {r.name}
                                                </button>

                                                {routeIdPendingDelete === r._id ? (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            className="p-1.5 rounded hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 hover:cursor-pointer"
                                                            disabled={isSaving}
                                                            onClick={(e: MouseEvent<HTMLButtonElement>) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                deleteRoute(r._id);
                                                            }}
                                                            title="Confirm delete"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            className="p-1.5 rounded hover:bg-red-500/10 text-red-400 hover:text-red-300 hover:cursor-pointer"
                                                            disabled={isSaving}
                                                            onClick={(e: MouseEvent<HTMLButtonElement>) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setRouteIdPendingDelete(null);
                                                            }}
                                                            title="Cancel"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 hover:cursor-pointer"
                                                        disabled={isSaving}
                                                        onClick={(e: MouseEvent<HTMLButtonElement>) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setRouteIdPendingDelete(r._id);
                                                        }}
                                                        title="Delete route"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : view === 'overview' ? (
                        <div className="space-y-6">
                            {/* Route Name Overview */}
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                                <h2 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2 uppercase tracking-wide">
                                    <Box className="h-4 w-4 text-zinc-500" />
                                    Route Overview
                                </h2>
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Route Name</div>
                                        <div className="text-sm font-medium text-white">{routeName || 'Untitled Route'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Goods Type</div>
                                        <div className="text-sm font-medium text-white">{goodsType || 'Not specified'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Stages Overview */}
                            <div className="space-y-3">
                                <h2 className="text-sm font-bold text-zinc-300 flex items-center gap-2 uppercase tracking-wide px-1">
                                    <Clock className="h-4 w-4 text-zinc-500" />
                                    Stages ({stages.length})
                                </h2>

                                <div className="space-y-4 pt-2">
                                    {stages.map((stage, index) => (
                                        <div key={index} className="relative pl-8 pb-4 last:pb-0">
                                            {/* Timeline track */}
                                            {index < stages.length - 1 && (
                                                <div className="absolute left-[15px] top-[30px] bottom-0 w-[2px] bg-zinc-800" />
                                            )}

                                            {/* Timeline point */}
                                            <div className="absolute left-0 top-1 w-[32px] h-[32px] rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center z-10">
                                                {stage.transport ? (
                                                    <Globe className="h-4 w-4 text-cyan-500" />
                                                ) : (
                                                    <Clock className="h-4 w-4 text-amber-500" />
                                                )}
                                            </div>

                                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/20 p-3">
                                                {stage.transport ? (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider">Transport • {stage.transport.mode.toUpperCase()}</span>
                                                            {stage.transport.courier && (
                                                                <span className="text-[10px] text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">{stage.transport.courier}</span>
                                                            )}
                                                            {/* Traffic / Journey Time Info */}
                                                            {(() => {
                                                                const preview = routePreviews.find(p => p.stageIndex === index);
                                                                if (!preview) return null;
                                                                return (
                                                                    <div className="flex items-center gap-2">
                                                                        {preview.durationInTraffic && (
                                                                            <span className="text-[10px] font-bold text-zinc-300 flex items-center gap-1">
                                                                                <Clock className="h-3 w-3" />
                                                                                {preview.durationInTraffic}
                                                                            </span>
                                                                        )}
                                                                        {preview.trafficDelta && preview.trafficDelta.startsWith('+') && preview.trafficDelta !== '+0 mins' && (
                                                                            <span className="text-[9px] font-bold text-red-400 bg-red-950/30 px-1 py-0.5 rounded border border-red-900/30">
                                                                                {preview.trafficDelta} traffic
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                        <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
                                                            <div>
                                                                <div className="text-[10px] text-zinc-500 uppercase font-bold">Origin</div>
                                                                <div className="text-xs text-zinc-200 line-clamp-1">{stage.transport.source.name || stage.transport.source.code || 'Unknown'}</div>
                                                            </div>
                                                            <div className="text-zinc-600">→</div>
                                                            <div className="text-right">
                                                                <div className="text-[10px] text-zinc-500 uppercase font-bold">Destination</div>
                                                                <div className="text-xs text-zinc-200 line-clamp-1">{stage.transport.destination.name || stage.transport.destination.code || 'Unknown'}</div>
                                                            </div>
                                                        </div>
                                                        {(stage.transport.source.latitude !== 0 || stage.transport.source.longitude !== 0) && (
                                                            <div className="text-[9px] text-zinc-600 font-mono">
                                                                {stage.transport.source.latitude.toFixed(4)}, {stage.transport.source.longitude.toFixed(4)} → {stage.transport.destination.latitude.toFixed(4)}, {stage.transport.destination.longitude.toFixed(4)}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Holding</span>
                                                            {stage.holding!.duration && (
                                                                <span className="text-[10px] text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">{stage.holding!.duration}</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] text-zinc-500 uppercase font-bold">Location</div>
                                                            <div className="text-xs text-zinc-200">{stage.holding!.location || 'Unknown'}</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {stages.length === 0 && (
                                        <div className="text-center py-8 border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-sm">
                                            No stages defined for this route.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Risks Overview */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <h2 className="text-sm font-bold text-zinc-300 flex items-center gap-2 uppercase tracking-wide">
                                        <AlertTriangle className="h-4 w-4 text-zinc-500" />
                                        Risks
                                    </h2>
                                    {isLoadingRisks ? (
                                        <div className="text-[10px] text-zinc-500">Loading...</div>
                                    ) : risksError ? (
                                        <div className="text-[10px] text-red-400">Error</div>
                                    ) : routeRisks.length > 0 ? (
                                        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
                                            <span className="text-xs font-bold text-amber-400">{routeRisks.length}</span>
                                            <span className="text-[10px] text-amber-500/80 uppercase">identified</span>
                                        </div>
                                    ) : (
                                        <div className="text-[10px] text-emerald-500/80 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                                            No risks
                                        </div>
                                    )}
                                </div>

                                {routeRisks.length > 0 && (
                                    <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-zinc-300">Show risks on map</span>
                                            <span className="text-[10px] text-zinc-500">Highlight all identified risks</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const newState = !showRisksOnMap;
                                                setShowRisksOnMap(newState);
                                                if (onToggleRisksOnMap) {
                                                    onToggleRisksOnMap(routeRisks, newState);
                                                }
                                            }}
                                            className={`
                                                relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer
                                                ${showRisksOnMap ? 'bg-amber-500' : 'bg-zinc-700'}
                                            `}
                                        >
                                            <span
                                                className={`
                                                    absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200
                                                    ${showRisksOnMap ? 'translate-x-5' : 'translate-x-0'}
                                                `}
                                            />
                                        </button>
                                    </div>
                                )}

                                {/* Risk type breakdown */}
                                {routeRisks.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        {Object.entries(
                                            routeRisks.reduce((acc, r) => {
                                                acc[r.type] = (acc[r.type] || 0) + 1;
                                                return acc;
                                            }, {} as Record<string, number>)
                                        ).map(([type, count]) => (
                                            <div key={type} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-zinc-900/50 border border-zinc-800">
                                                <span className="text-sm font-bold text-zinc-200">{count}</span>
                                                <span className="text-[9px] text-zinc-500 uppercase tracking-wider text-center">
                                                    {type.replace(/-/g, ' ')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Detailed Risk List */}
                                {routeRisks.length > 0 && showRisksOnMap && (
                                    <div className="space-y-2 mt-4 pt-4 border-t border-zinc-800/50">
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                                            Identified Risks Details
                                        </h3>
                                        {routeRisks.map((risk, idx) => {
                                            // Find the full object based on type
                                            let fullObject: any = null;
                                            let displayTitle = risk.title || `${risk.type} detected nearby`;
                                            let displayDescription = "";

                                            switch (risk.type) {
                                                case 'navigation':
                                                    fullObject = navigationWarnings.find(w => w.reference === risk.id);
                                                    if (fullObject) {
                                                        displayTitle = fullObject.reference;
                                                        displayDescription = fullObject.text || fullObject.details; // Fallback
                                                    }
                                                    break;
                                                case 'notam':
                                                    fullObject = notams.find(n => (n.id === risk.id) || (n.notamCode === risk.id));
                                                    if (fullObject) {
                                                        displayTitle = fullObject.notamCode || fullObject.id;
                                                        displayDescription = fullObject.text || "";
                                                    }
                                                    break;
                                                case 'weather':
                                                    fullObject = weatherAlerts.find(w => (w.id === risk.id) || (w.event === risk.id));
                                                    if (fullObject) {
                                                        displayTitle = fullObject.event;
                                                        displayDescription = fullObject.description || "";
                                                    }
                                                    break;
                                                case 'trade-barrier':
                                                    fullObject = tradeBarriers.find(b => b.id === risk.id);
                                                    if (fullObject) {
                                                        displayTitle = fullObject.title;
                                                        displayDescription = fullObject.summary || "";
                                                    }
                                                    break;
                                                case 'train-disruption':
                                                    // Handle prefix logic if ID has prefix
                                                    const railId = risk.id.replace('train-disruption-', '');
                                                    fullObject = railDisruptions.find(r => r.id === railId);
                                                    if (fullObject) {
                                                        displayTitle = fullObject.title || fullObject.category || 'Rail Disruption';
                                                        displayDescription = fullObject.description || "";
                                                    }
                                                    break;
                                                case 'electricity':
                                                    fullObject = electricityOutages.find(o => o.id === risk.id);
                                                    if (fullObject) {
                                                        displayTitle = `Power Outage: ${fullObject.provider}`;
                                                        displayDescription = fullObject.reason || "Unspecified outage";
                                                    }
                                                    break;
                                                case 'water':
                                                    fullObject = waterIncidents.find(w => w.incidentRef === risk.id);
                                                    if (fullObject) {
                                                        displayTitle = `${fullObject.category} in ${fullObject.location}`;
                                                        displayDescription = fullObject.status || "";
                                                    }
                                                    break;
                                                case 'jamming':
                                                    // GPS Jamming points usually come as a group, but we can try to find similar point
                                                    // Often just a generic warning, but if we have points we can look for proximity
                                                    displayTitle = "GPS Jamming / Interference";
                                                    break;
                                            }

                                            return (
                                                <div key={`${risk.id}-${idx}`} className="rounded border border-red-900/30 bg-red-950/10 p-3 hover:bg-red-950/20 transition-colors">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider border ${risk.severity && risk.severity > 3 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                                                risk.severity && risk.severity > 1 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                                                    'bg-zinc-800 text-zinc-400 border-zinc-700'
                                                            }`}>
                                                            {risk.type.replace(/-/g, ' ')}
                                                        </span>
                                                        {risk.severity && (
                                                            <span className="text-[10px] text-zinc-500 font-mono">
                                                                Lvl {risk.severity}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="font-medium text-zinc-200 text-sm mb-1 leading-snug">
                                                        {displayTitle}
                                                    </div>

                                                    {/* Description preview if available */}
                                                    {displayDescription && (
                                                        <div className="text-[10px] text-zinc-500 mb-2 line-clamp-2">
                                                            {displayDescription}
                                                        </div>
                                                    )}

                                                    <div className="space-y-1 text-xs text-zinc-400">
                                                        {risk.category && (
                                                            <div className="flex gap-2">
                                                                <span className="text-zinc-600 min-w-[60px]">Category:</span>
                                                                <span className="text-zinc-300">{risk.category}</span>
                                                            </div>
                                                        )}
                                                        {risk.country && (
                                                            <div className="flex gap-2">
                                                                <span className="text-zinc-600 min-w-[60px]">Country:</span>
                                                                <span className="text-zinc-300">{risk.country}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex gap-2">
                                                            <span className="text-zinc-600 min-w-[60px]">Location:</span>
                                                            <span className="font-mono text-zinc-500">
                                                                {risk.lat !== 0 ? risk.lat.toFixed(4) : '?'} , {risk.lon !== 0 ? risk.lon.toFixed(4) : '?'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Monitoring Results */}
                            {monitors.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-zinc-800/50">
                                    <div className="flex items-center justify-between px-1">
                                        <h2 className="text-sm font-bold text-zinc-300 flex items-center gap-2 uppercase tracking-wide">
                                            <Newspaper className="h-4 w-4 text-zinc-500" />
                                            Monitoring Results ({monitorResults.length})
                                        </h2>
                                        <button
                                            className="text-[10px] font-bold text-zinc-400 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800 transition-colors uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            onClick={fetchMonitoringResults}
                                            disabled={isMonitoringLoading}
                                        >
                                            {isMonitoringLoading ? 'Scanning...' : 'Refresh'}
                                        </button>
                                    </div>

                                    {isMonitoringLoading ? (
                                        <div className="text-center py-8 text-zinc-500 text-sm animate-pulse">
                                            Scanning feeds...
                                        </div>
                                    ) : monitorResults.length === 0 ? (
                                        <div className="text-center py-8 border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-sm">
                                            No recent matches found for your keywords.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {monitorResults.map((item, i) => (
                                                <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3 hover:bg-zinc-900/50 transition-colors">
                                                    <div className="mb-1 flex items-start justify-between gap-2">
                                                        <a
                                                            href={item.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm font-medium text-cyan-400 hover:text-cyan-300 line-clamp-2 leading-snug hover:underline"
                                                        >
                                                            {item.title}
                                                        </a>
                                                        <ExternalLink className="h-3 w-3 text-zinc-600 shrink-0 mt-1" />
                                                    </div>

                                                    <div className="flex items-center gap-2 mb-2 text-[10px] text-zinc-500">
                                                        <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 max-w-[150px] truncate">
                                                            {item.source}
                                                        </span>
                                                        <span>•</span>
                                                        <span>{item.isoDate ? new Date(item.isoDate).toLocaleDateString() : 'Unknown date'}</span>
                                                    </div>

                                                    {item.contentSnippet && (
                                                        <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                                                            {item.contentSnippet}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Route Name Section */}
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                                <h2 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2 uppercase tracking-wide">
                                    <Box className="h-4 w-4 text-zinc-500" />
                                    Route Name
                                </h2>
                                <div className="space-y-1.5">
                                    <label htmlFor="route_name" className="text-xs font-medium text-zinc-500">
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        id="route_name"
                                        className="flex h-9 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 transition-all"
                                        placeholder="e.g. Trans-Atlantic Pharma"
                                        value={routeName}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setRouteName(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Goods Type Section */}
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                                <h2 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2 uppercase tracking-wide">
                                    <Box className="h-4 w-4 text-zinc-500" />
                                    Goods Details
                                </h2>
                                <div className="space-y-1.5">
                                    <label htmlFor="goods_type" className="text-xs font-medium text-zinc-500">
                                        Type of Goods
                                    </label>
                                    <input
                                        type="text"
                                        id="goods_type"
                                        className="flex h-9 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 transition-all"
                                        placeholder="e.g. Electronics"
                                        value={goodsType}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setGoodsType(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Monitoring Configuration */}
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                                <h2 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2 uppercase tracking-wide">
                                    <Rss className="h-4 w-4 text-zinc-500" />
                                    Monitoring
                                </h2>

                                {/* Monitors (Keywords) */}
                                <div className="mb-4 space-y-2">
                                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Keywords to Monitor</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 h-8 rounded border border-zinc-800 bg-zinc-950 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-700 hover:border-zinc-700 transition"
                                            placeholder="Add keyword (e.g. 'Strait of Hormuz')"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    addMonitor(e.currentTarget.value);
                                                    e.currentTarget.value = '';
                                                }
                                            }}
                                        />
                                        <button
                                            className="px-3 h-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-bold uppercase tracking-wider transition-colors"
                                            onClick={(e) => {
                                                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                addMonitor(input.value);
                                                input.value = '';
                                            }}
                                        >
                                            Add
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {monitors.map(m => (
                                            <span key={m} className="inline-flex items-center gap-1 bg-cyan-950/30 border border-cyan-900/50 text-cyan-400 px-2 py-1 rounded text-xs">
                                                {m}
                                                <button onClick={() => removeMonitor(m)} className="hover:text-cyan-200"><X className="h-3 w-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Feeds */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Custom RSS Feeds</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 h-8 rounded border border-zinc-800 bg-zinc-950 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-700 hover:border-zinc-700 transition"
                                            placeholder="Add RSS URL"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    addFeed(e.currentTarget.value);
                                                    e.currentTarget.value = '';
                                                }
                                            }}
                                        />
                                        <button
                                            className="px-3 h-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-bold uppercase tracking-wider transition-colors"
                                            onClick={(e) => {
                                                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                addFeed(input.value);
                                                input.value = '';
                                            }}
                                        >
                                            Add
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {feeds.map(f => (
                                            <span key={f} className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-1 rounded text-xs max-w-full truncate">
                                                <span className="truncate max-w-[200px]">{f}</span>
                                                <button onClick={() => removeFeed(f)} className="hover:text-white flex-shrink-0"><X className="h-3 w-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Stages Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-bold text-zinc-300 flex items-center gap-2 uppercase tracking-wide">
                                        <Clock className="h-4 w-4 text-zinc-500" />
                                        Route Stages
                                    </h2>
                                    <span className="text-xs text-zinc-600 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono">
                                        {stages.length}
                                    </span>
                                </div>

                                {stages.map((stage, index) => {
                                    const nextStage = stages[index + 1];
                                    let distanceWarning = null;

                                    if (stage.transport && nextStage?.transport) {
                                        const dist = calculateDistance(
                                            stage.transport.destination.latitude,
                                            stage.transport.destination.longitude,
                                            nextStage.transport.source.latitude,
                                            nextStage.transport.source.longitude
                                        );

                                        // Only warn if both stages have coordinates (not 0,0 which is the default)
                                        const hasCurrentDestCoords = stage.transport.destination.latitude !== 0 || stage.transport.destination.longitude !== 0;
                                        const hasNextSourceCoords = nextStage.transport.source.latitude !== 0 || nextStage.transport.source.longitude !== 0;

                                        if (hasCurrentDestCoords && hasNextSourceCoords && dist > 10) {
                                            distanceWarning = (
                                                <div className="flex items-center gap-2 p-2 mt-[-8px] mb-2 mx-2 rounded border border-amber-900/40 bg-amber-950/20 text-[10px] text-amber-200 uppercase font-bold tracking-wider animate-in fade-in slide-in-from-top-1 z-0 relative border-t-0 rounded-t-none">
                                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                    <span>Warning: Gap of {dist.toFixed(1)} miles to next stage</span>
                                                </div>
                                            );
                                        }
                                    }

                                    return (
                                        <div key={index} className="space-y-3">
                                            <div className="relative rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/50 group z-10">
                                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => removeStage(index)}
                                                        className="p-1.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                                        title="Remove Stage"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>

                                                <div className="mb-3 pr-8">
                                                    <div className="flex gap-1.5 bg-zinc-950 rounded p-1 inline-flex border border-zinc-900">
                                                        <button
                                                            onClick={() => updateStageType(index, 'transport')}
                                                            className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded transition-all ${stage.transport ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
                                                        >
                                                            Transport
                                                        </button>
                                                        <button
                                                            onClick={() => updateStageType(index, 'holding')}
                                                            className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded transition-all ${stage.holding ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
                                                        >
                                                            Holding
                                                        </button>
                                                    </div>
                                                </div>

                                                {stage.transport && (
                                                    <div className="grid gap-3">
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium text-zinc-500">Mode</label>
                                                            <div className="relative">
                                                                <select
                                                                    className="flex h-9 w-full appearance-none rounded border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 transition-all"
                                                                    value={stage.transport.mode}
                                                                    onChange={(e) => updateTransportField(index, 'mode', e.target.value)}
                                                                >
                                                                    {Object.values(TransportMode).map((mode) => (
                                                                        <option key={mode} value={mode}>{mode.toUpperCase()}</option>
                                                                    ))}
                                                                </select>
                                                                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-zinc-500">
                                                                    <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="grid gap-3 p-3 border border-zinc-800 rounded bg-zinc-900/20">
                                                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Origin</label>
                                                            {stage.transport.mode === TransportMode.Flight && (
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-medium text-zinc-500 uppercase">Airport Search</label>
                                                                    <input
                                                                        list="airports-datalist"
                                                                        className="flex h-8 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                                                                        placeholder="Search Airport (ICAO)..."
                                                                        onChange={(e) => onAirportSelect(index, 'source', e.target.value)}
                                                                        value={stage.transport.source.code || ''}
                                                                    />
                                                                    {stage.transport.source.name && (
                                                                        <div className="text-[10px] text-emerald-400 font-medium px-1 truncate">
                                                                            {stage.transport.source.name}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {stage.transport.mode !== TransportMode.Flight && (
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className="col-span-2 flex gap-2">
                                                                        <input
                                                                            type="text"
                                                                            className="flex h-8 flex-1 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                                                                            placeholder="Location Name"
                                                                            list={stage.transport.mode === TransportMode.Sea ? "ports-datalist" : undefined}
                                                                            value={stage.transport.source.name}
                                                                            onChange={(e) => {
                                                                                if (stage.transport!.mode === TransportMode.Sea) {
                                                                                    onPortSelect(index, 'source', e.target.value);
                                                                                } else {
                                                                                    updateTransportLocation(index, 'source', 'name', e.target.value);
                                                                                }
                                                                            }}
                                                                        />
                                                                        {stage.transport.mode === TransportMode.Road && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => resolveCoordinates(index, 'source')}
                                                                                className="px-2 py-1 text-[10px] font-bold bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 transition-colors uppercase"
                                                                                disabled={isSaving || !stage.transport.source.name}
                                                                            >
                                                                                Resolve
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <input
                                                                        type="number"
                                                                        className="flex h-8 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700 transition-all appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                        placeholder="Lat"
                                                                        value={stage.transport.source.latitude || ''}
                                                                        onChange={(e) => updateTransportLocation(index, 'source', 'latitude', parseFloat(e.target.value) || 0)}
                                                                    />
                                                                    <input
                                                                        type="number"
                                                                        className="flex h-8 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700 transition-all appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                        placeholder="Long"
                                                                        value={stage.transport.source.longitude || ''}
                                                                        onChange={(e) => updateTransportLocation(index, 'source', 'longitude', parseFloat(e.target.value) || 0)}
                                                                    />
                                                                    <div className="col-span-2">
                                                                        <input
                                                                            type="text"
                                                                            className="flex h-8 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                                                                            placeholder={stage.transport.mode === TransportMode.Sea ? "Port Number" : "Location Code (Optional)"}
                                                                            value={stage.transport.source.code || ''}
                                                                            onChange={(e) => updateTransportLocation(index, 'source', 'code', e.target.value)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="grid gap-3 p-3 border border-zinc-800 rounded bg-zinc-900/20">
                                                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Destination</label>
                                                            {stage.transport.mode === TransportMode.Flight && (
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-medium text-zinc-500 uppercase">Airport Search</label>
                                                                    <input
                                                                        list="airports-datalist"
                                                                        className="flex h-8 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                                                                        placeholder="Search Airport (ICAO)..."
                                                                        onChange={(e) => onAirportSelect(index, 'destination', e.target.value)}
                                                                        value={stage.transport.destination.code || ''}
                                                                    />
                                                                    {stage.transport.destination.name && (
                                                                        <div className="text-[10px] text-emerald-400 font-medium px-1 truncate">
                                                                            {stage.transport.destination.name}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {stage.transport.mode !== TransportMode.Flight && (
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className="col-span-2 flex gap-2">
                                                                        <input
                                                                            type="text"
                                                                            className="flex h-8 flex-1 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                                                                            placeholder="Location Name"
                                                                            list={stage.transport.mode === TransportMode.Sea ? "ports-datalist" : undefined}
                                                                            value={stage.transport.destination.name}
                                                                            onChange={(e) => {
                                                                                if (stage.transport!.mode === TransportMode.Sea) {
                                                                                    onPortSelect(index, 'destination', e.target.value);
                                                                                } else {
                                                                                    updateTransportLocation(index, 'destination', 'name', e.target.value);
                                                                                }
                                                                            }}
                                                                        />
                                                                        {stage.transport.mode === TransportMode.Road && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => resolveCoordinates(index, 'destination')}
                                                                                className="px-2 py-1 text-[10px] font-bold bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 transition-colors uppercase"
                                                                                disabled={isSaving || !stage.transport.destination.name}
                                                                            >
                                                                                Resolve
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <input
                                                                        type="number"
                                                                        className="flex h-8 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700 transition-all appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                        placeholder="Lat"
                                                                        value={stage.transport.destination.latitude || ''}
                                                                        onChange={(e) => updateTransportLocation(index, 'destination', 'latitude', parseFloat(e.target.value) || 0)}
                                                                    />
                                                                    <input
                                                                        type="number"
                                                                        className="flex h-8 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700 transition-all appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                        placeholder="Long"
                                                                        value={stage.transport.destination.longitude || ''}
                                                                        onChange={(e) => updateTransportLocation(index, 'destination', 'longitude', parseFloat(e.target.value) || 0)}
                                                                    />
                                                                    <div className="col-span-2">
                                                                        <input
                                                                            type="text"
                                                                            className="flex h-8 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                                                                            placeholder={stage.transport.mode === TransportMode.Sea ? "Port Number" : "Location Code (Optional)"}
                                                                            value={stage.transport.destination.code || ''}
                                                                            onChange={(e) => updateTransportLocation(index, 'destination', 'code', e.target.value)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="space-y-1">
                                                            <input
                                                                type="text"
                                                                className="flex h-9 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 transition-all"
                                                                placeholder="Courier (Optional)"
                                                                value={stage.transport.courier || ''}
                                                                onChange={(e) => updateTransportField(index, 'courier', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <input
                                                                type="text"
                                                                className="flex h-9 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 transition-all"
                                                                placeholder="Notes / Additional Info"
                                                                value={stage.transport.additional || ''}
                                                                onChange={(e) => updateTransportField(index, 'additional', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {stage.holding && (
                                                    <div className="grid gap-3">
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium text-zinc-500">Location</label>
                                                            <input
                                                                type="text"
                                                                className="flex h-9 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 transition-all"
                                                                placeholder="Warehouse / Port"
                                                                value={stage.holding.location}
                                                                onChange={(e) => updateHoldingField(index, 'location', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium text-zinc-500">Duration</label>
                                                            <input
                                                                type="text"
                                                                className="flex h-9 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 transition-all"
                                                                placeholder="e.g. 2h 30m"
                                                                value={stage.holding.duration || ''}
                                                                onChange={(e) => updateHoldingField(index, 'duration', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <input
                                                                type="text"
                                                                className="flex h-9 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 transition-all"
                                                                placeholder="Notes / Additional Info"
                                                                value={stage.holding.additional || ''}
                                                                onChange={(e) => updateHoldingField(index, 'additional', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {distanceWarning}
                                        </div>
                                    );
                                })}

                                <button
                                    onClick={addStage}
                                    className="group flex w-full items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-900/10 p-4 text-zinc-500 hover:border-zinc-600 hover:bg-zinc-900/30 hover:text-zinc-300 transition-all"
                                >
                                    <Plus className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                                    <span className="text-sm font-medium">Add Stage</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <datalist id="airports-datalist">
                {airportOptions}
            </datalist>
            <datalist id="ports-datalist">
                {portOptions}
            </datalist>
        </div>
    );
}