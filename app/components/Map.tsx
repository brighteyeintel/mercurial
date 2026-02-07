"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
// Fix for missing marker icons in leaflet production bundle
import L from "leaflet";
import { useEffect, useState } from "react";

interface TrafficEvent {
    title: string;
    description: string;
    link: string;
    guid: string;
    pubDate: string;
    category: string;
    latitude: number;
    longitude: number;
    overallStart?: string;
    overallEnd?: string;
}

const MapComponent = () => {
    const [events, setEvents] = useState<TrafficEvent[]>([]);

    const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>({
        "Road Works": false,
        "Accident": true,
        "Congestion": true,
        "Other": true
    });

    const [isLegendOpen, setIsLegendOpen] = useState(true);

    useEffect(() => {
        // Override the default marker icon paths because Leaflet's defaults break in Webpack/Next.js
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
            iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
            shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        });

        // Fetch traffic events
        const fetchEvents = async () => {
            try {
                const response = await fetch('/api/traffic');
                const data = await response.json();
                if (data.events) {
                    setEvents(data.events);
                }
            } catch (error) {
                console.error("Failed to fetch traffic events:", error);
            }
        };

        fetchEvents();
        const interval = setInterval(fetchEvents, 300000); // Refresh every 5 minutes

        return () => clearInterval(interval);
    }, []);

    const getCategoryColor = (category: string) => {
        const lowerCat = category?.toLowerCase() || "";
        if (lowerCat.includes("road works") || lowerCat.includes("roadworks")) return "#f97316"; // Orange
        if (lowerCat.includes("accident") || lowerCat.includes("incident")) return "#ef4444"; // Red
        if (lowerCat.includes("congestion") || lowerCat.includes("delay")) return "#eab308"; // Yellow
        return "#3b82f6"; // Blue default
    };

    const mapCategoryToKey = (category: string) => {
        const lowerCat = category?.toLowerCase() || "";
        if (lowerCat.includes("road works") || lowerCat.includes("roadworks")) return "Road Works";
        if (lowerCat.includes("accident") || lowerCat.includes("incident")) return "Accident";
        if (lowerCat.includes("congestion") || lowerCat.includes("delay")) return "Congestion";
        return "Other";
    };

    const createCustomIcon = (category: string) => {
        const color = getCategoryColor(category);
        return L.divIcon({
            className: "custom-marker",
            html: `<div style="
        background-color: ${color};
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 4px rgba(0,0,0,0.5);
      "></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
            popupAnchor: [0, -10],
        });
    };

    const toggleCategory = (key: string) => {
        setVisibleCategories(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    return (
        <div className="relative h-full w-full">
            <MapContainer
                center={[51.505, -0.09]} // Default center (London)
                zoom={13}
                scrollWheelZoom={true}
                className="h-[calc(100vh-64px)] w-full z-0" // Subtract navbar height (64px)
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    className="map-tiles-dark"
                />

                <Marker position={[51.505, -0.09]}>
                    <Popup>
                        <div className="font-bold">Mercurial Logistics</div>
                        <div>Headquarters</div>
                    </Popup>
                </Marker>

                {events
                    .filter(event => visibleCategories[mapCategoryToKey(event.category)])
                    .map((event) => (
                        <Marker
                            key={event.guid}
                            position={[event.latitude, event.longitude]}
                            icon={createCustomIcon(event.category)}
                        >
                            <Popup className="traffic-popup">
                                <div className="min-w-[200px]">
                                    <div
                                        className="p-2 text-white font-bold rounded-t-md -mx-4 -mt-3 mb-2"
                                        style={{ backgroundColor: getCategoryColor(event.category) }}
                                    >
                                        {event.title}
                                    </div>
                                    <div className="text-sm text-zinc-800">
                                        <p className="font-semibold text-xs text-zinc-500 uppercase mb-1">{event.category}</p>
                                        <p className="whitespace-pre-line">{event.description}</p>
                                        {event.overallEnd && (
                                            <p className="text-xs text-zinc-500 mt-2">
                                                Ends: {new Date(event.overallEnd).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
            </MapContainer>

            {/* Legend Overlay */}
            <div className="absolute top-4 right-4 z-[1000] bg-zinc-900/90 backdrop-blur-md border border-zinc-700 rounded-lg shadow-xl overflow-hidden max-w-[200px]">
                <div
                    className="p-3 bg-zinc-800 border-b border-zinc-700 flex justify-between items-center cursor-pointer hover:bg-zinc-700/50 transition-colors"
                    onClick={() => setIsLegendOpen(!isLegendOpen)}
                >
                    <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Map Layers</h3>
                    <span className="text-zinc-400 text-xs">{isLegendOpen ? '▼' : '▶'}</span>
                </div>

                {isLegendOpen && (
                    <div className="p-3 space-y-2">
                        {Object.entries(visibleCategories).map(([key, isVisible]) => {
                            let color;
                            switch (key) {
                                case "Road Works": color = "#f97316"; break;
                                case "Accident": color = "#ef4444"; break;
                                case "Congestion": color = "#eab308"; break;
                                default: color = "#3b82f6";
                            }

                            return (
                                <div key={key} className="flex items-center gap-3 group cursor-pointer" onClick={() => toggleCategory(key)}>
                                    <div className={`w-4 h-4 rounded border border-zinc-600 flex items-center justify-center transition-colors ${isVisible ? 'bg-zinc-700/50' : 'bg-transparent'}`}>
                                        {isVisible && <div className="w-2 h-2 bg-white rounded-sm" />}
                                    </div>
                                    <div className="flex items-center gap-2 flex-1">
                                        <div className="w-3 h-3 rounded-full border border-white/50" style={{ backgroundColor: color }} />
                                        <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{key}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MapComponent;
