"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react"
import { ShippingRouteData, Stage, TransportMode, Transport, Holding, Location } from "../types/ShippingRouteData";
import { Plus, Trash2, Save, ArrowLeft, Box, Clock, Globe, Check, X } from "lucide-react";
import Link from "next/link";

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

interface ShippingRoutePanelProps {
    fetchAllRoutePreviews?: (stages: Stage[]) => Promise<void>;
    clearAllPreviews?: () => void;
    isLoadingAll?: boolean;
}

export default function ShippingRoutePanel({
    fetchAllRoutePreviews,
    clearAllPreviews,
    isLoadingAll = false
}: ShippingRoutePanelProps) {
    const [view, setView] = useState<'list' | 'edit'>('list');
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
    const [routeIdPendingDelete, setRouteIdPendingDelete] = useState<string | null>(null);
    const [routeName, setRouteName] = useState("");
    const [goodsType, setGoodsType] = useState("");
    const [stages, setStages] = useState<Stage[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedRouteId, setSavedRouteId] = useState<string | null>(null);
    const [routes, setRoutes] = useState<Array<{ _id: string; name: string }>>([]);
    const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
    const [airports, setAirports] = useState<any[]>([]);

    const { data: session, status } = useSession()

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
        fetch('/api/aviation/airports')
            .then(res => res.json())
            .then(data => {
                if (data.airports) {
                    setAirports(data.airports);
                }
            })
            .catch(err => console.error("Failed to fetch airports", err));
    }, []);

    const loadRouteForEdit = async (id: string) => {
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
            setView('edit');
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
            const routeData = new ShippingRouteData(routeName, goodsType, stages);
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
            setView('list');
            clearAllPreviews?.();
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : 'Failed to save route');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="w-[450px] bg-black border-l border-zinc-900 flex flex-col z-20 shadow-2xl">
            {/* Editor Header */}
            <div className="p-4 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    {/* <Link href="/" className="rounded-full bg-zinc-900 p-2 hover:bg-zinc-800 transition-colors">
                        <ArrowLeft className="h-4 w-4 text-zinc-400" />
                    </Link> */}
                    <h1 className="text-lg font-bold tracking-tight text-white uppercase font-mono">Route Editor</h1>
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
                                setView('list');
                                clearAllPreviews?.();
                            }}
                        >
                            Back
                        </button>
                        {fetchAllRoutePreviews && (
                            <button
                                type="button"
                                className="inline-flex items-center justify-center rounded bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-cyan-500 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isLoadingAll || stages.length === 0}
                                onClick={() => fetchAllRoutePreviews(stages)}
                            >
                                {isLoadingAll ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <Globe className="mr-1.5 h-3.5 w-3.5" />
                                        Display Route
                                    </>
                                )}
                            </button>
                        )}
                        <button
                            className="inline-flex items-center justify-center rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                            disabled={isSaving}
                            onClick={onRouteSave}
                        >
                            <Save className="mr-1.5 h-3.5 w-3.5" />
                            {isSaving ? 'Saving...' : selectedRouteId ? 'Save Changes' : 'Save'}
                        </button>
                    </div>
                )}
            </div>

            {/* Scrollable Form Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
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
                                                    onClick={() => loadRouteForEdit(r._id)}
                                                >
                                                    {r.name}
                                                </button>

                                                {routeIdPendingDelete === r._id ? (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            className="p-1.5 rounded hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 hover:cursor-pointer"
                                                            disabled={isSaving}
                                                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
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
                                                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
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
                                                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
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
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRouteName(e.target.value)}
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
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGoodsType(e.target.value)}
                                    />
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

                                {stages.map((stage, index) => (
                                    <div key={index} className="relative rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/50 group">
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
                                                                list={`airports-origin-${index}`}
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
                                                            <datalist id={`airports-origin-${index}`}>
                                                                {airports.map(a => (
                                                                    <option key={a.icao} value={a.icao}>{a.name} ({a.city}, {a.country})</option>
                                                                ))}
                                                            </datalist>
                                                        </div>
                                                    )}
                                                    {stage.transport.mode !== TransportMode.Flight && (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="col-span-2">
                                                                <input
                                                                    type="text"
                                                                    className="flex h-8 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                                                                    placeholder="Location Name"
                                                                    value={stage.transport.source.name}
                                                                    onChange={(e) => updateTransportLocation(index, 'source', 'name', e.target.value)}
                                                                />
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
                                                                    placeholder="Location Code (Optional)"
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
                                                                list={`airports-dest-${index}`}
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
                                                            <datalist id={`airports-dest-${index}`}>
                                                                {airports.map(a => (
                                                                    <option key={a.icao} value={a.icao}>{a.name} ({a.city}, {a.country})</option>
                                                                ))}
                                                            </datalist>
                                                        </div>
                                                    )}
                                                    {stage.transport.mode !== TransportMode.Flight && (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="col-span-2">
                                                                <input
                                                                    type="text"
                                                                    className="flex h-8 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                                                                    placeholder="Location Name"
                                                                    value={stage.transport.destination.name}
                                                                    onChange={(e) => updateTransportLocation(index, 'destination', 'name', e.target.value)}
                                                                />
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
                                                                    placeholder="Location Code (Optional)"
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
                                                        value={stage.holding.duration}
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
                                ))}

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
        </div>
    );
}