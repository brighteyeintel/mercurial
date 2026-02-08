'use client';

import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { Globe, AlertTriangle, ChevronLeft, Ship, Plane, CloudLightning, Sun, CloudRain, Snowflake, Wind, Waves, Flame, Building2, Search, X, Train } from "lucide-react";
import dynamic from 'next/dynamic';
import { NavigationWarning } from '../types/NavigationWarning';
import { Notam } from '../types/Notam';
import { WeatherAlert } from '../types/WeatherAlert';
import { TradeBarrier } from '../types/TradeBarrier';
import ShippingRoutePanel from './ShippingRoutePanel';
import { useRoutePreview } from "../hooks/useRoutePreview"; // Import Route Preview Hook

interface RailDisruption {
    id: string;
    title: string;
    status?: string;
    description?: string;
    operator?: string;
    affected?: string[];
    updatedAt?: string;
    link?: string;
}

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

    // Aviation NOTAMs State
    const [notams, setNotams] = useState<Notam[]>([]);
    const [selectedNotam, setSelectedNotam] = useState<Notam | null>(null);
    const [isNotamsSidebarOpen, setIsNotamsSidebarOpen] = useState(false);

    // Weather Alerts State
    const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
    const [selectedWeatherAlert, setSelectedWeatherAlert] = useState<WeatherAlert | null>(null);
    const [isWeatherSidebarOpen, setIsWeatherSidebarOpen] = useState(false);

    // Rail Disruptions (Trainline) State
    const [railDisruptions, setRailDisruptions] = useState<RailDisruption[]>([]);
    const [selectedRailDisruption, setSelectedRailDisruption] = useState<RailDisruption | null>(null);
    const [isRailSidebarOpen, setIsRailSidebarOpen] = useState(false);

    // Trade Barriers State
    const [tradeBarriers, setTradeBarriers] = useState<TradeBarrier[]>([]);
    const [filteredTradeBarriers, setFilteredTradeBarriers] = useState<TradeBarrier[]>([]);
    const [selectedBarrier, setSelectedBarrier] = useState<TradeBarrier | null>(null);
    const [isTradeSidebarOpen, setIsTradeSidebarOpen] = useState(false);
    const [tradeSearchTerm, setTradeSearchTerm] = useState("");
    const [selectedTradeCountry, setSelectedTradeCountry] = useState<string | null>(null);
    const [availableTradeCountries, setAvailableTradeCountries] = useState<string[]>([]);

    // Persistent Selection State (Checkboxes)
    const [checkedWarningIds, setCheckedWarningIds] = useState<Set<string>>(new Set());
    const [checkedNotamIds, setCheckedNotamIds] = useState<Set<string>>(new Set());
    const [checkedWeatherIds, setCheckedWeatherIds] = useState<Set<string>>(new Set());
    const [checkedRailDisruptionIds, setCheckedRailDisruptionIds] = useState<Set<string>>(new Set());
    const [checkedTradeBarrierIds, setCheckedTradeBarrierIds] = useState<Set<string>>(new Set());

    // Filter State
    const [availableAreas, setAvailableAreas] = useState<string[]>([]);
    const [selectedAreas, setSelectedAreas] = useState<Record<string, boolean>>({});

    // Map Layer Visibility State (lifted from Map.tsx)
    const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>({
        "Road Works": false,
        "Accident": true,
        "Congestion": true,
        "Maritime": true,
        "Other": true
    });
    const [isRoadsSidebarOpen, setIsRoadsSidebarOpen] = useState(false);

    // Route Preview Hook
    const routePreviewHook = useRoutePreview();

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

    const getWeatherIcon = (tags: string[]) => {
        if (tags.includes('extreme_high_temperature')) return <Sun className="h-4 w-4 text-orange-500" />;
        if (tags.includes('rain') || tags.includes('cyclone')) return <CloudRain className="h-4 w-4 text-blue-400" />;
        if (tags.includes('snow_ice') || tags.includes('extreme_low_temperature')) return <Snowflake className="h-4 w-4 text-cyan-200" />;
        if (tags.includes('wind') || tags.includes('tornado')) return <Wind className="h-4 w-4 text-zinc-400" />;
        if (tags.includes('marine_event') || tags.includes('coastal_event') || tags.includes('waves')) return <Waves className="h-4 w-4 text-indigo-400" />;
        if (tags.includes('fire_warning')) return <Flame className="h-4 w-4 text-red-500" />;
        return <CloudLightning className="h-4 w-4 text-purple-500" />;
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

        // Fetch Aviation NOTAMs
        fetch('/api/aviation/notams')
            .then(res => res.json())
            .then(data => {
                if (data.notams) {
                    setNotams(data.notams);
                }
            })
            .catch(err => console.error("Failed to fetch NOTAMs", err));

        // Fetch Weather Alerts
        fetch('/api/weather/alerts')
            .then(res => res.json())
            .then(data => {
                if (data.alerts) {
                    setWeatherAlerts(data.alerts);
                }
            })
            .catch(err => console.error("Failed to fetch Weather Alerts", err));

        // Fetch Rail Disruptions (Trainline)
        fetch('/api/rail/disruption')
            .then(res => res.json())
            .then(data => {
                if (data.disruptions) {
                    setRailDisruptions(data.disruptions);
                }
            })
            .catch(err => console.error("Failed to fetch Rail Disruptions", err));

        // Fetch Trade Barriers
        fetch('/api/trade/barriers')
            .then(res => res.json())
            .then(data => {
                if (data.barriers) {
                    const barriers: TradeBarrier[] = data.barriers;
                    setTradeBarriers(barriers);

                    // Extract Countries
                    const countries = Array.from(new Set(barriers.map(b => b.country_or_territory.name))).sort();
                    setAvailableTradeCountries(countries);
                }
            })
            .catch(err => console.error("Failed to fetch Trade Barriers", err));
    }, []);

    // Filter Logic
    useEffect(() => {
        if (warnings.length > 0) {
            const filtered = warnings.filter(w => selectedAreas[w.areaName || 'Unknown']);
            setFilteredWarnings(filtered);
        }
    }, [warnings, selectedAreas]);

    // Trade Filter Logic
    useEffect(() => {
        let result = tradeBarriers;

        if (selectedTradeCountry) {
            result = result.filter(b => b.country_or_territory.name === selectedTradeCountry);
        }

        if (tradeSearchTerm) {
            const term = tradeSearchTerm.toLowerCase();
            result = result.filter(b =>
                b.title.toLowerCase().includes(term) ||
                b.sectors.some(s => s.name.toLowerCase().includes(term))
            );
        }

        setFilteredTradeBarriers(result);
    }, [tradeBarriers, selectedTradeCountry, tradeSearchTerm]);

    const toggleAreaFilter = (area: string) => {
        setSelectedAreas(prev => ({
            ...prev,
            [area]: !prev[area]
        }));
    };

    // Toggle Checkbox Handlers
    const toggleWarningCheck = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setCheckedWarningIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleNotamCheck = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setCheckedNotamIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleWeatherCheck = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setCheckedWeatherIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleRailDisruptionCheck = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setCheckedRailDisruptionIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleTradeBarrierCheck = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setCheckedTradeBarrierIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Select All / Deselect All Handlers
    const toggleAllWarnings = () => {
        const allVisibleIds = filteredWarnings.map(w => w.reference);
        const allChecked = allVisibleIds.every(id => checkedWarningIds.has(id));
        if (allChecked) {
            setCheckedWarningIds(prev => {
                const next = new Set(prev);
                allVisibleIds.forEach(id => next.delete(id));
                return next;
            });
        } else {
            setCheckedWarningIds(prev => {
                const next = new Set(prev);
                allVisibleIds.forEach(id => next.add(id));
                return next;
            });
        }
    };

    const toggleAllNotams = () => {
        const allVisibleIds = notams.map(n => n.id || n.notamCode);
        const allChecked = allVisibleIds.every(id => checkedNotamIds.has(id));
        if (allChecked) {
            setCheckedNotamIds(prev => {
                const next = new Set(prev);
                allVisibleIds.forEach(id => next.delete(id));
                return next;
            });
        } else {
            setCheckedNotamIds(prev => {
                const next = new Set(prev);
                allVisibleIds.forEach(id => next.add(id));
                return next;
            });
        }
    };

    const toggleAllWeather = () => {
        const allVisibleIds = weatherAlerts.map(a => a.id || a.event);
        const allChecked = allVisibleIds.every(id => checkedWeatherIds.has(id));
        if (allChecked) {
            setCheckedWeatherIds(prev => {
                const next = new Set(prev);
                allVisibleIds.forEach(id => next.delete(id));
                return next;
            });
        } else {
            setCheckedWeatherIds(prev => {
                const next = new Set(prev);
                allVisibleIds.forEach(id => next.add(id));
                return next;
            });
        }
    };

    const toggleAllTrade = () => {
        const allVisibleIds = filteredTradeBarriers.map(b => b.id);
        const allChecked = allVisibleIds.every(id => checkedTradeBarrierIds.has(id));
        if (allChecked) {
            setCheckedTradeBarrierIds(prev => {
                const next = new Set(prev);
                allVisibleIds.forEach(id => next.delete(id));
                return next;
            });
        } else {
            setCheckedTradeBarrierIds(prev => {
                const next = new Set(prev);
                allVisibleIds.forEach(id => next.add(id));
                return next;
            });
        }
    };

    const toggleAllRailDisruptions = () => {
        const allVisibleIds = railDisruptions.map(d => d.id);
        const allChecked = allVisibleIds.every(id => checkedRailDisruptionIds.has(id));
        if (allChecked) {
            setCheckedRailDisruptionIds(prev => {
                const next = new Set(prev);
                allVisibleIds.forEach(id => next.delete(id));
                return next;
            });
        } else {
            setCheckedRailDisruptionIds(prev => {
                const next = new Set(prev);
                allVisibleIds.forEach(id => next.add(id));
                return next;
            });
        }
    };

    return (
        <div className="flex h-screen flex-col bg-black text-white selection:bg-zinc-800 selection:text-zinc-100 overflow-hidden">
            <Navbar />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Map Panel (Left) */}
                <div className="flex-1 relative bg-zinc-900 border-r border-zinc-800">
                    <MapWrapper
                        selectedWarning={selectedWarning}
                        selectedNotam={selectedNotam}
                        selectedWeatherAlert={selectedWeatherAlert}
                        routePreviews={routePreviewHook.routePreviews}
                        selectedTradeBarrierCountry={selectedBarrier ? selectedBarrier.country_or_territory.name : null}
                        checkedWarnings={warnings.filter(w => checkedWarningIds.has(w.reference))}
                        checkedNotams={notams.filter(n => checkedNotamIds.has(n.id || n.notamCode))}
                        checkedWeatherAlerts={weatherAlerts.filter(a => checkedWeatherIds.has(a.id || a.event))}
                        checkedTradeCountries={tradeBarriers.filter(b => checkedTradeBarrierIds.has(b.id)).map(b => b.country_or_territory.name)}
                        checkedRailDisruptions={railDisruptions.filter(d => checkedRailDisruptionIds.has(d.id))}
                        selectedRailDisruption={selectedRailDisruption}
                        visibleCategories={visibleCategories}
                    />

                    {/* Overlay Title for Map Context */}
                    <div className="absolute top-4 left-14 z-[500] bg-zinc-900/90 backdrop-blur-md border border-zinc-700 rounded-lg px-4 py-2 shadow-xl pointer-events-none">
                        <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                            <Globe className="h-4 w-4 text-emerald-500" />
                            Global Logistics View
                        </h2>
                    </div>


                    {/* Feature Toggles */}
                    <div className={`absolute top-4 z-[1000] flex flex-col gap-2 transition-all duration-300 ${(isWarningsSidebarOpen || isNotamsSidebarOpen || isWeatherSidebarOpen || isRailSidebarOpen || isTradeSidebarOpen || isRoadsSidebarOpen)
                        ? 'left-[416px]'
                        : 'left-4'
                        }`}>
                        <button
                            onClick={() => {
                                setIsWarningsSidebarOpen(!isWarningsSidebarOpen);
                                setIsNotamsSidebarOpen(false);
                                setIsWeatherSidebarOpen(false);
                                setIsTradeSidebarOpen(false);
                                setIsRoadsSidebarOpen(false);
                            }}
                            className={`p-2 rounded-lg border shadow-xl transition-all ${isWarningsSidebarOpen ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-900/90 border-zinc-700 hover:bg-zinc-800'}`}
                            title="Toggle Navigation Warnings"
                        >
                            {isWarningsSidebarOpen ? <ChevronLeft className="h-5 w-5 text-zinc-300" /> : <Ship className="h-5 w-5 text-amber-500" />}
                        </button>

                        <button
                            onClick={() => {
                                setIsNotamsSidebarOpen(!isNotamsSidebarOpen);
                                setIsWarningsSidebarOpen(false);
                                setIsWeatherSidebarOpen(false);
                                setIsTradeSidebarOpen(false);
                                setIsRoadsSidebarOpen(false);
                            }}
                            className={`p-2 rounded-lg border shadow-xl transition-all ${isNotamsSidebarOpen ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-900/90 border-zinc-700 hover:bg-zinc-800'}`}
                            title="Toggle Aviation NOTAMs"
                        >
                            {isNotamsSidebarOpen ? <ChevronLeft className="h-5 w-5 text-zinc-300" /> : <Plane className="h-5 w-5 text-blue-500" />}
                        </button>

                        <button
                            onClick={() => {
                                setIsWeatherSidebarOpen(!isWeatherSidebarOpen);
                                setIsWarningsSidebarOpen(false);
                                setIsNotamsSidebarOpen(false);
                                setIsRailSidebarOpen(false);
                                setIsTradeSidebarOpen(false);
                                setIsRoadsSidebarOpen(false);
                            }}
                            className={`p-2 rounded-lg border shadow-xl transition-all ${isWeatherSidebarOpen ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-900/90 border-zinc-700 hover:bg-zinc-800'}`}
                            title="Toggle Weather Alerts"
                        >
                            {isWeatherSidebarOpen ? <ChevronLeft className="h-5 w-5 text-zinc-300" /> : <CloudLightning className="h-5 w-5 text-purple-500" />}
                        </button>

                        <button
                            onClick={() => {
                                setIsRailSidebarOpen(!isRailSidebarOpen);
                                setIsWarningsSidebarOpen(false);
                                setIsNotamsSidebarOpen(false);
                                setIsWeatherSidebarOpen(false);
                                setIsTradeSidebarOpen(false);
                                setIsRoadsSidebarOpen(false);
                            }}
                            className={`p-2 rounded-lg border shadow-xl transition-all ${isRailSidebarOpen ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-900/90 border-zinc-700 hover:bg-zinc-800'}`}
                            title="Toggle Rail Disruptions"
                        >
                            {isRailSidebarOpen ? <ChevronLeft className="h-5 w-5 text-zinc-300" /> : <Train className="h-5 w-5 text-green-500" />}
                        </button>

                        <button
                            onClick={() => {
                                setIsTradeSidebarOpen(!isTradeSidebarOpen);
                                setIsWarningsSidebarOpen(false);
                                setIsNotamsSidebarOpen(false);
                                setIsWeatherSidebarOpen(false);
                                setIsRailSidebarOpen(false);
                                setIsRoadsSidebarOpen(false);
                            }}
                            className={`p-2 rounded-lg border shadow-xl transition-all ${isTradeSidebarOpen ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-900/90 border-zinc-700 hover:bg-zinc-800'}`}
                            title="Toggle Trade Barriers"
                        >
                            {isTradeSidebarOpen ? <ChevronLeft className="h-5 w-5 text-zinc-300" /> : <Building2 className="h-5 w-5 text-emerald-500" />}
                        </button>

                        <button
                            onClick={() => {
                                setIsRoadsSidebarOpen(!isRoadsSidebarOpen);
                                setIsWarningsSidebarOpen(false);
                                setIsNotamsSidebarOpen(false);
                                setIsWeatherSidebarOpen(false);
                                setIsRailSidebarOpen(false);
                                setIsTradeSidebarOpen(false);
                            }}
                            className={`p-2 rounded-lg border shadow-xl transition-all ${isRoadsSidebarOpen ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-900/90 border-zinc-700 hover:bg-zinc-800'}`}
                            title="Toggle Road Layers"
                        >
                            {isRoadsSidebarOpen ? <ChevronLeft className="h-5 w-5 text-zinc-300" /> : <AlertTriangle className="h-5 w-5 text-orange-500" />}
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
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={toggleAllWarnings}
                                        className="text-[10px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors"
                                    >
                                        {filteredWarnings.length > 0 && filteredWarnings.every(w => checkedWarningIds.has(w.reference)) ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <span className="text-xs text-zinc-500 px-2 py-0.5 bg-zinc-900 rounded-full border border-zinc-800">{filteredWarnings.length}</span>
                                </div>
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

                                {/* Maritime Layer Toggle */}
                                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-zinc-800/50 group cursor-pointer" onClick={() => setVisibleCategories(prev => ({ ...prev, "Maritime": !prev["Maritime"] }))}>
                                    <div className={`w-4 h-4 rounded border border-zinc-600 flex items-center justify-center transition-colors ${visibleCategories["Maritime"] ? 'bg-cyan-700/50' : 'bg-transparent'}`}>
                                        {visibleCategories["Maritime"] && <div className="w-2 h-2 bg-white rounded-sm" />}
                                    </div>
                                    <span className="text-xs text-cyan-400 group-hover:text-cyan-300 transition-colors font-medium">Show Maritime Events</span>
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
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={checkedWarningIds.has(warning.reference)}
                                                    onChange={(e) => toggleWarningCheck(warning.reference, e)}
                                                    className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                                />
                                                <span className="font-bold text-sm text-zinc-200">{warning.reference}</span>
                                            </div>
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

                    {/* Rail Disruptions Sidebar Overlay */}
                    {isRailSidebarOpen && (
                        <div className="absolute top-0 left-0 bottom-0 w-[400px] bg-zinc-950/95 backdrop-blur-sm border-r border-zinc-800 z-[900] flex flex-col pt-16 shadow-2xl transition-transform">
                            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                                <h3 className="text-sm font-bold text-green-500 uppercase tracking-wider flex items-center gap-2">
                                    <Train className="h-4 w-4" />
                                    Rail Disruptions
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={toggleAllRailDisruptions}
                                        className="text-[10px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors"
                                    >
                                        {railDisruptions.length > 0 && railDisruptions.every(d => checkedRailDisruptionIds.has(d.id)) ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <span className="text-xs text-zinc-500 px-2 py-0.5 bg-zinc-900 rounded-full border border-zinc-800">{railDisruptions.length}</span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                                {railDisruptions.map((d) => (
                                    <div
                                        key={d.id}
                                        onClick={() => setSelectedRailDisruption(d)}
                                        className={`p-4 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-900/50 transition-colors ${selectedRailDisruption?.id === d.id ? 'bg-green-950/20 border-l-4 border-l-green-500' : 'border-l-4 border-l-transparent'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2 gap-3">
                                            <div className="flex items-start gap-3 flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={checkedRailDisruptionIds.has(d.id)}
                                                    onChange={(e) => toggleRailDisruptionCheck(d.id, e)}
                                                    className="mt-0.5 w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-green-500 focus:ring-0 focus:ring-offset-0 cursor-pointer flex-shrink-0"
                                                />
                                                <span className="font-bold text-xs text-zinc-200 line-clamp-2">{d.title}</span>
                                            </div>
                                            {d.status && (
                                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0 text-green-400 bg-green-950/30 border-green-900/30">
                                                    {d.status}
                                                </span>
                                            )}
                                        </div>

                                        {d.operator && (
                                            <div className="text-[10px] text-zinc-500 font-mono mb-2">
                                                {d.operator}
                                            </div>
                                        )}

                                        {d.description && (
                                            <div className="text-xs text-zinc-400 font-normal leading-relaxed line-clamp-3">
                                                {d.description}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Aviation NOTAMs Sidebar Overlay */}
                    {isNotamsSidebarOpen && (
                        <div className="absolute top-0 left-0 bottom-0 w-[400px] bg-zinc-950/95 backdrop-blur-sm border-r border-zinc-800 z-[900] flex flex-col pt-16 shadow-2xl transition-transform">
                            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                                <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider flex items-center gap-2">
                                    <Plane className="h-4 w-4" />
                                    Aviation NOTAMs
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={toggleAllNotams}
                                        className="text-[10px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors"
                                    >
                                        {notams.length > 0 && notams.every(n => checkedNotamIds.has(n.id || n.notamCode)) ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <span className="text-xs text-zinc-500 px-2 py-0.5 bg-zinc-900 rounded-full border border-zinc-800">{notams.length}</span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                                {notams.map((notam, idx) => (
                                    <div
                                        key={notam.id || idx}
                                        onClick={() => setSelectedNotam(notam)}
                                        className={`p-4 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-900/50 transition-colors ${selectedNotam === notam ? 'bg-blue-950/20 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={checkedNotamIds.has(notam.id || notam.notamCode)}
                                                    onChange={(e) => toggleNotamCheck(notam.id || notam.notamCode, e)}
                                                    className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                                />
                                                <span className="font-bold text-sm text-zinc-200">{notam.notamCode}</span>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-700/50">
                                                    {notam.type}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-xs font-semibold text-zinc-300 mb-2">{notam.title}</div>

                                        <div
                                            className="text-[10px] text-zinc-400 font-mono leading-relaxed mb-2 line-clamp-4"
                                            dangerouslySetInnerHTML={{ __html: notam.description }} // Description contains HTML breaks
                                        />

                                        <div className="text-[9px] text-zinc-500 font-mono mt-2 pt-2 border-t border-zinc-800/50">
                                            {notam.validity}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Weather Alerts Sidebar Overlay */}
                    {isWeatherSidebarOpen && (
                        <div className="absolute top-0 left-0 bottom-0 w-[400px] bg-zinc-950/95 backdrop-blur-sm border-r border-zinc-800 z-[900] flex flex-col pt-16 shadow-2xl transition-transform">
                            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                                <h3 className="text-sm font-bold text-purple-500 uppercase tracking-wider flex items-center gap-2">
                                    <CloudLightning className="h-4 w-4" />
                                    Weather Alerts
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={toggleAllWeather}
                                        className="text-[10px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors"
                                    >
                                        {weatherAlerts.length > 0 && weatherAlerts.every(a => checkedWeatherIds.has(a.id || a.event)) ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <span className="text-xs text-zinc-500 px-2 py-0.5 bg-zinc-900 rounded-full border border-zinc-800">{weatherAlerts.length}</span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                                {weatherAlerts.map((alert, idx) => (
                                    <div
                                        key={alert.id || idx}
                                        onClick={() => setSelectedWeatherAlert(alert)}
                                        className={`p-4 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-900/50 transition-colors ${selectedWeatherAlert === alert ? 'bg-purple-950/20 border-l-4 border-l-purple-500' : 'border-l-4 border-l-transparent'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={checkedWeatherIds.has(alert.id || alert.event)}
                                                    onChange={(e) => toggleWeatherCheck(alert.id || alert.event, e)}
                                                    className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                                />
                                                <span className="font-bold text-sm text-zinc-200">{alert.event}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {getWeatherIcon(alert.tags)}
                                            </div>
                                        </div>

                                        <div className="text-xs font-semibold text-zinc-400 mb-1">{alert.sender_name}</div>

                                        <div className="text-[10px] text-zinc-500 font-mono mb-2">
                                            {new Date(alert.start * 1000).toLocaleString()} - {new Date(alert.end * 1000).toLocaleString()}
                                        </div>

                                        <div className="text-xs text-zinc-400 font-normal leading-relaxed line-clamp-3">
                                            {alert.description}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Trade Barriers Sidebar Overlay */}
                    {isTradeSidebarOpen && (
                        <div className="absolute top-0 left-0 bottom-0 w-[400px] bg-zinc-950/95 backdrop-blur-sm border-r border-zinc-800 z-[900] flex flex-col pt-16 shadow-2xl transition-transform">
                            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                                <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    Trade Barriers
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={toggleAllTrade}
                                        className="text-[10px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors"
                                    >
                                        {filteredTradeBarriers.length > 0 && filteredTradeBarriers.every(b => checkedTradeBarrierIds.has(b.id)) ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <span className="text-xs text-zinc-500 px-2 py-0.5 bg-zinc-900 rounded-full border border-zinc-800">{filteredTradeBarriers.length}</span>
                                </div>
                            </div>

                            <div className="px-4 py-3 border-b border-zinc-800 space-y-3 bg-zinc-900/30">
                                {/* Search Bar */}
                                <div className="relative">
                                    <Search className="absolute left-2 top-2 h-4 w-4 text-zinc-500" />
                                    <input
                                        type="text"
                                        placeholder="Search barriers, sectors..."
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded pl-8 pr-4 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                                        value={tradeSearchTerm}
                                        onChange={(e) => setTradeSearchTerm(e.target.value)}
                                    />
                                    {tradeSearchTerm && (
                                        <button
                                            onClick={() => setTradeSearchTerm("")}
                                            className="absolute right-2 top-2 text-zinc-500 hover:text-zinc-300"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>

                                {/* Country Filter */}
                                <div>
                                    <select
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
                                        value={selectedTradeCountry || ""}
                                        onChange={(e) => setSelectedTradeCountry(e.target.value || null)}
                                    >
                                        <option value="">All Countries</option>
                                        {availableTradeCountries.map(country => (
                                            <option key={country} value={country}>{country}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                                {filteredTradeBarriers.map((barrier) => (
                                    <div
                                        key={barrier.id}
                                        onClick={() => setSelectedBarrier(barrier === selectedBarrier ? null : barrier)}
                                        className={`p-4 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-900/50 transition-colors ${selectedBarrier === barrier ? 'bg-emerald-950/20 border-l-4 border-l-emerald-500' : 'border-l-4 border-l-transparent'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-start gap-3 flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={checkedTradeBarrierIds.has(barrier.id)}
                                                    onChange={(e) => toggleTradeBarrierCheck(barrier.id, e)}
                                                    className="mt-1 w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer flex-shrink-0"
                                                />
                                                <span className="font-bold text-xs text-zinc-200 line-clamp-2 mr-2">{barrier.title}</span>
                                            </div>
                                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0 ${barrier.is_resolved
                                                ? 'text-emerald-400 bg-emerald-950/30 border-emerald-900/30'
                                                : 'text-amber-400 bg-amber-950/30 border-amber-900/30'
                                                }`}>
                                                {barrier.is_resolved ? 'Resolved' : 'Active'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] text-zinc-400 font-mono bg-zinc-800/50 px-1.5 py-0.5 rounded">
                                                {barrier.country_or_territory.name}
                                            </span>
                                            <span className="text-[10px] text-zinc-500">
                                                {new Date(barrier.status_date).toLocaleDateString()}
                                            </span>
                                        </div>

                                        {selectedBarrier === barrier && (
                                            <div className="mt-2 text-xs text-zinc-400 font-normal leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                                                <p className="mb-2">{barrier.summary}</p>

                                                {barrier.sectors && barrier.sectors.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {barrier.sectors.map((sector, i) => (
                                                            <span key={i} className="text-[9px] text-zinc-500 border border-zinc-800 rounded px-1">
                                                                {sector.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Roads Sidebar Overlay */}
                    {isRoadsSidebarOpen && (
                        <div className="absolute top-0 left-0 bottom-0 w-[400px] bg-zinc-950/95 backdrop-blur-sm border-r border-zinc-800 z-[900] flex flex-col pt-16 shadow-2xl transition-transform">
                            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                                <h3 className="text-sm font-bold text-orange-500 uppercase tracking-wider flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Road Layers
                                </h3>
                            </div>

                            <div className="p-4 space-y-3">
                                <p className="text-xs text-zinc-500 mb-4">Toggle visibility of road-related map layers.</p>
                                {["Road Works", "Accident", "Congestion", "Other"].map(key => (
                                    <div key={key} className="flex items-center gap-3 group cursor-pointer" onClick={() => setVisibleCategories(prev => ({ ...prev, [key]: !prev[key] }))}>
                                        <div className={`w-5 h-5 rounded border border-zinc-600 flex items-center justify-center transition-colors ${visibleCategories[key] ? 'bg-zinc-700/50' : 'bg-transparent'}`}>
                                            {visibleCategories[key] && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                                        </div>
                                        <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{key}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Shipping Route Panel (Right) */}
                <ShippingRoutePanel
                    fetchAllRoutePreviews={routePreviewHook.fetchAllRoutePreviews}
                    clearAllPreviews={routePreviewHook.clearAllPreviews}
                    isLoadingAll={routePreviewHook.isLoadingAll}
                />
            </div>
        </div>
    );
}
