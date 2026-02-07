"use client";

import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { Globe, AlertTriangle, ChevronLeft } from "lucide-react";
import dynamic from 'next/dynamic';
import { NavigationWarning } from '../types/NavigationWarning';
import ShippingRoutePanel from './ShippingRoutePanel';

const MapWrapper = dynamic(() => import('../components/MapWrapper'), {
    ssr: false,
    loading: () => <div className="h-[calc(100vh-64px)] w-full bg-zinc-900 flex items-center justify-center text-zinc-500">Loading Map Wrapper...</div>
});

export default function RouteEditorPage() {
    // Navigation Warnings State
    const [warnings, setWarnings] = useState<NavigationWarning[]>([]);
    const [filteredWarnings, setFilteredWarnings] = useState<NavigationWarning[]>([]);
    const [selectedWarning, setSelectedWarning] = useState<NavigationWarning | null>(null);
    const [isWarningsSidebarOpen, setIsWarningsSidebarOpen] = useState(false);

    // Filter State
    const [availableAreas, setAvailableAreas] = useState<string[]>([]);
    const [selectedAreas, setSelectedAreas] = useState<Record<string, boolean>>({});

    // Helper to parse NGA Date Format: 301809Z JAN 26 (DDHHMMZ MMM YY)
    const parseWarningDate = (dateStr: string): Date => {
        try {
            // Regex to extract parts: (DD)(HHMM)Z (MMM) (YY)
            const match = dateStr.trim().match(/^(\d{2})(\d{4})Z\s+([A-Z]{3})\s+(\d{2})/);
            if (!match) return new Date(0); // Fallback

            const day = parseInt(match[1]);
            const time = match[2]; // HHMM
            const monthStr = match[3];
            const yearShort = parseInt(match[4]);

            const year = 2000 + yearShort; // Assumption for 21st century
            const hour = parseInt(time.substring(0, 2));
            const minute = parseInt(time.substring(2, 4));

            const monthMap: Record<string, number> = {
                'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
                'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
            };
            const month = monthMap[monthStr] || 0;

            return new Date(Date.UTC(year, month, day, hour, minute));
        } catch (e) {
            return new Date(0);
        }
    };

    useEffect(() => {
        // Fetch Navigation Warnings
        fetch('/api/maritime/navigationwarnings')
            .then(res => res.json())
            .then(data => {
                if (data.warnings) {
                    const rawWarnings: NavigationWarning[] = data.warnings;

                    // Sort by Date (Newest First)
                    const sorted = rawWarnings.sort((a, b) => {
                        return parseWarningDate(b.datetime).getTime() - parseWarningDate(a.datetime).getTime();
                    });

                    setWarnings(sorted);

                    // Extract Unique Areas
                    const areas = Array.from(new Set(sorted.map(w => w.areaName || 'Unknown'))).filter(Boolean);
                    setAvailableAreas(areas);

                    // Default all selected
                    const initialSelection: Record<string, boolean> = {};
                    areas.forEach(a => initialSelection[a] = true);
                    setSelectedAreas(initialSelection);
                }
            })
            .catch(err => console.error("Failed to fetch navigation warnings", err));
    }, []);

    // Filter Logic
    useEffect(() => {
        if (warnings.length > 0) {
            const filtered = warnings.filter(w => selectedAreas[w.areaName || 'Unknown']);
            setFilteredWarnings(filtered);
        }
    }, [warnings, selectedAreas]);

    const toggleAreaFilter = (area: string) => {
        setSelectedAreas(prev => ({
            ...prev,
            [area]: !prev[area]
        }));
    };

    return (
        <div className="flex h-screen flex-col bg-black text-white selection:bg-zinc-800 selection:text-zinc-100 overflow-hidden">
            <Navbar />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Map Panel (Left) */}
                <div className="flex-1 relative bg-zinc-900 border-r border-zinc-800">
                    <MapWrapper selectedWarning={selectedWarning} />

                    {/* Overlay Title for Map Context */}
                    <div className="absolute top-4 left-14 z-[500] bg-zinc-900/90 backdrop-blur-md border border-zinc-700 rounded-lg px-4 py-2 shadow-xl pointer-events-none">
                        <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                            <Globe className="h-4 w-4 text-emerald-500" />
                            Global Logistics View
                        </h2>
                    </div>

                    {/* Navigation Warnings Sidebar Toggle */}
                    <div className="absolute top-4 left-4 z-[1000]">
                        <button
                            onClick={() => setIsWarningsSidebarOpen(!isWarningsSidebarOpen)}
                            className={`p-2 rounded-lg border shadow-xl transition-all ${isWarningsSidebarOpen ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-900/90 border-zinc-700 hover:bg-zinc-800'}`}
                            title="Toggle Navigation Warnings"
                        >
                            {isWarningsSidebarOpen ? <ChevronLeft className="h-5 w-5 text-zinc-300" /> : <AlertTriangle className="h-5 w-5 text-amber-500" />}
                        </button>
                    </div>

                    {/* Navigation Warnings Sidebar Overlay */}
                    {isWarningsSidebarOpen && (
                        <div className="absolute top-0 left-0 bottom-0 w-[400px] bg-zinc-950/95 backdrop-blur-sm border-r border-zinc-800 z-[900] flex flex-col pt-16 shadow-2xl transition-transform">
                            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                                <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Navigation Warnings
                                </h3>
                                <span className="text-xs text-zinc-500 px-2 py-0.5 bg-zinc-900 rounded-full border border-zinc-800">{filteredWarnings.length}</span>
                            </div>

                            {/* Filters Section */}
                            <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30">
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Filter Source</h4>
                                <div className="flex flex-wrap gap-2">
                                    {availableAreas.map(area => (
                                        <button
                                            key={area}
                                            onClick={() => toggleAreaFilter(area)}
                                            className={`px-2 py-1 text-[10px] uppercase font-bold rounded border transition-all ${selectedAreas[area]
                                                ? 'bg-zinc-800 text-zinc-200 border-zinc-600'
                                                : 'bg-transparent text-zinc-600 border-zinc-800 hover:border-zinc-700'
                                                }`}
                                        >
                                            {area}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                                {filteredWarnings.map((warning, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setSelectedWarning(warning)}
                                        className={`p-4 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-900/50 transition-colors ${selectedWarning === warning ? 'bg-amber-950/20 border-l-4 border-l-amber-500' : 'border-l-4 border-l-transparent'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-sm text-zinc-200">{warning.reference}</span>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">{warning.datetime.split(' ')[0]}</span>
                                                {warning.areaName && (
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-700/50">
                                                        {warning.areaName}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {warning.isArea && (
                                            <div className="mb-2 px-2 py-0.5 bg-red-950/30 text-red-400 text-[10px] font-bold uppercase w-fit rounded border border-red-900/30">
                                                Area Warning
                                            </div>
                                        )}

                                        <div className="space-y-1 text-xs text-zinc-400 font-mono leading-relaxed">
                                            {/* Preamble */}
                                            {warning.preamble.map((line, i) => (
                                                <div key={`pre-${i}`}>{line}</div>
                                            ))}

                                            {/* Bullets */}
                                            {warning.bullets.length > 0 && (
                                                <div className="mt-2 pl-2 border-l border-zinc-700/50 space-y-1">
                                                    {warning.bullets.map((bullet, i) => (
                                                        <div key={`bull-${i}`} className="whitespace-pre-line">{bullet}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Shipping Route Panel (Right) */}
                <ShippingRoutePanel />
            </div>
        </div>
    );
}
