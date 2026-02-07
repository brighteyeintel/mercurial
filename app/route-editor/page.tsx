"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { RouteData, Stage, TransportMode, Transport, Holding } from "../types/routeData";
import { Plus, Trash2, Save, ArrowLeft, Box, Clock, Globe } from "lucide-react";
import Link from "next/link";
import MapWrapper from "../components/MapWrapper";

// Helper to get initial empty transport object
const getEmptyTransport = (): Transport => ({
    source: "",
    destination: "",
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

export default function RouteEditorPage() {
    const [goodsType, setGoodsType] = useState("");
    const [stages, setStages] = useState<Stage[]>([]);

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

    const updateHoldingField = (index: number, field: keyof Holding, value: string) => {
        const newStages = [...stages];
        if (newStages[index].holding) {
            newStages[index] = {
                holding: { ...newStages[index].holding!, [field]: value } as Holding
            };
            setStages(newStages);
        }
    };

    // Generate the RouteData object for logging/saving (not previewed anymore)
    const routeData = new RouteData(goodsType, stages);

    return (
        <div className="flex h-screen flex-col bg-black text-white selection:bg-zinc-800 selection:text-zinc-100 overflow-hidden">
            <Navbar />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Map Panel (Left) */}
                <div className="flex-1 relative bg-zinc-900 border-r border-zinc-800">
                    <MapWrapper />

                    {/* Overlay Title for Map Context */}
                    <div className="absolute top-4 left-14 z-[1000] bg-zinc-900/90 backdrop-blur-md border border-zinc-700 rounded-lg px-4 py-2 shadow-xl">
                        <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                            <Globe className="h-4 w-4 text-emerald-500" />
                            Global Logistics View
                        </h2>
                    </div>
                </div>

                {/* Editor Panel (Right) */}
                <div className="w-[450px] bg-black border-l border-zinc-900 flex flex-col z-20 shadow-2xl">
                    {/* Editor Header */}
                    <div className="p-4 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-between sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <Link href="/" className="rounded-full bg-zinc-900 p-2 hover:bg-zinc-800 transition-colors">
                                <ArrowLeft className="h-4 w-4 text-zinc-400" />
                            </Link>
                            <h1 className="text-lg font-bold tracking-tight text-white uppercase font-mono">Route Editor</h1>
                        </div>
                        <button
                            className="inline-flex items-center justify-center rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 uppercase tracking-wider"
                            onClick={() => {
                                console.log("Saving:", routeData);
                                alert("Route Data logged to console!");
                            }}
                        >
                            <Save className="mr-1.5 h-3.5 w-3.5" />
                            Save
                        </button>
                    </div>

                    {/* Scrollable Form Area */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="space-y-6">

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
                                        onChange={(e) => setGoodsType(e.target.value)}
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

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-zinc-500">Origin</label>
                                                        <input
                                                            type="text"
                                                            className="flex h-9 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 transition-all"
                                                            placeholder="Source"
                                                            value={stage.transport.source}
                                                            onChange={(e) => updateTransportField(index, 'source', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium text-zinc-500">Destination</label>
                                                        <input
                                                            type="text"
                                                            className="flex h-9 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 transition-all"
                                                            placeholder="Target"
                                                            value={stage.transport.destination}
                                                            onChange={(e) => updateTransportField(index, 'destination', e.target.value)}
                                                        />
                                                    </div>
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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
