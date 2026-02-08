"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
// Fix for missing marker icons in leaflet production bundle
import L from "leaflet";
import { useEffect, useState } from "react";
import { Clock, ExternalLink } from "lucide-react";
import { NavigationWarning } from "../types/NavigationWarning";
import { RoutePreviewData } from "../hooks/useRoutePreview";
import { Notam } from "../types/Notam";
import { WeatherAlert } from "../types/WeatherAlert";
import { TransportMode } from "../types/ShippingRouteData";

// Component to handle map interactions like flying to coordinates
const MapController = ({ selectedWarning, selectedNotam, selectedWeatherAlert }: { selectedWarning?: NavigationWarning | null, selectedNotam?: Notam | null, selectedWeatherAlert?: WeatherAlert | null }) => {
    const map = useMap();

    useEffect(() => {
        if (selectedWarning && selectedWarning.coordinates && selectedWarning.coordinates.length > 0) {
            const firstCoord = selectedWarning.coordinates[0];
            map.flyTo([firstCoord.latitude, firstCoord.longitude], 8, {
                animate: true,
                duration: 1.5
            });
        }
    }, [selectedWarning, map]);

    useEffect(() => {
        if (selectedNotam) {
            map.flyTo([selectedNotam.latitude, selectedNotam.longitude], 9, { // Slightly closer zoom for NOTAMs
                animate: true,
                duration: 1.5
            });
        }
    }, [selectedNotam, map]);

    useEffect(() => {
        if (selectedWeatherAlert && selectedWeatherAlert.lat && selectedWeatherAlert.lon) {
            map.flyTo([selectedWeatherAlert.lat, selectedWeatherAlert.lon], 7, { // Zoom out slightly for weather
                animate: true,
                duration: 1.5
            });
        }
    }, [selectedWeatherAlert, map]);

    return null;
};

export interface TrafficEvent {
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
    radius?: number;
}

export interface MapComponentProps {
    selectedWarning?: NavigationWarning | null;
    selectedNotam?: Notam | null;
    selectedWeatherAlert?: WeatherAlert | null;
    routePreviews?: RoutePreviewData[];
}

const MapComponent = ({ selectedWarning, selectedNotam, selectedWeatherAlert, routePreviews = [] }: MapComponentProps) => {
    const [events, setEvents] = useState<TrafficEvent[]>([]);

    const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>({
        "Road Works": false, // Default off to reduce clutter
        "Accident": true,
        "Congestion": true,
        "Maritime": true,
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

        // Fetch events
        const fetchEvents = async () => {
            try {
                const [trafficRes, maritimeRes] = await Promise.all([
                    fetch('/api/roads/traffic').catch(() => ({ ok: false, json: async () => ({}) })), // Fail gracefully
                    fetch('/api/maritime/disruptions').catch(() => ({ ok: false, json: async () => ({}) }))
                ]);

                let allEvents: TrafficEvent[] = [];

                if (trafficRes.ok) {
                    const trafficData = await trafficRes.json();
                    if (trafficData.events) {
                        allEvents = [...allEvents, ...trafficData.events];
                    }
                }

                if (maritimeRes.ok) {
                    const maritimeData = await maritimeRes.json();
                    if (maritimeData.disruptions) {
                        const maritimeEvents = maritimeData.disruptions
                            .filter((d: any) => d.latitude && d.longitude)
                            .map((d: any) => ({
                                title: d.title,
                                description: d.description,
                                link: d.link,
                                guid: d.guid,
                                pubDate: d.pubDate,
                                category: "Maritime",
                                latitude: d.latitude,
                                longitude: d.longitude,
                                radius: d.radius
                            }));
                        allEvents = [...allEvents, ...maritimeEvents];
                    }
                }

                setEvents(allEvents);
            } catch (error) {
                console.error("Failed to fetch events:", error);
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
        if (lowerCat.includes("maritime")) return "#06b6d4"; // Cyan for Maritime
        return "#3b82f6"; // Blue default
    };

    const mapCategoryToKey = (category: string) => {
        const lowerCat = category?.toLowerCase() || "";
        if (lowerCat.includes("road works") || lowerCat.includes("roadworks")) return "Road Works";
        if (lowerCat.includes("accident") || lowerCat.includes("incident")) return "Accident";
        if (lowerCat.includes("congestion") || lowerCat.includes("delay")) return "Congestion";
        if (lowerCat.includes("maritime")) return "Maritime";
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

    // Custom icon for Warning Points
    const createWarningIcon = () => {
        return L.divIcon({
            className: "warning-marker",
            html: `<div style="
        background-color: #ef4444;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 4px rgba(255,0,0,0.5);
        animation: pulse 2s infinite;
      "></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
            popupAnchor: [0, -10],
        });
    };

    // Custom icon for NOTAM Points
    const createNotamIcon = () => {
        return L.divIcon({
            className: "notam-marker",
            html: `<div style="
        background-color: #3b82f6;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 6px rgba(59, 130, 246, 0.6);
      "></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
            popupAnchor: [0, -8],
        });
    };

    const toggleCategory = (key: string) => {
        setVisibleCategories(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const renderPopup = (event: TrafficEvent) => (
        <Popup className="traffic-popup">
            <div className="min-w-[250px] max-w-[300px]">
                <div
                    className="p-2 text-white font-bold rounded-t-md -mx-4 -mt-3 mb-2 flex justify-between items-start gap-2"
                    style={{ backgroundColor: getCategoryColor(event.category) }}
                >
                    <span className="truncate">{event.title}</span>
                </div>
                <div className="text-sm text-zinc-800">
                    <p className="font-semibold text-xs text-zinc-500 uppercase mb-1">{event.category}</p>
                    <p className="whitespace-pre-line mb-3 max-h-[150px] overflow-y-auto">{event.description}</p>

                    <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-zinc-200">
                        {event.pubDate && (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{new Date(event.pubDate).toLocaleString()}</span>
                            </div>
                        )}
                        {event.overallEnd && (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                <Clock className="w-3.5 h-3.5 text-orange-500" />
                                <span>Ends: {new Date(event.overallEnd).toLocaleString()}</span>
                            </div>
                        )}
                        {event.link && (
                            <a
                                href={event.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 mt-1"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                View Full Report
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </Popup>
    );

    return (
        <div className="relative h-full w-full">
            <MapContainer
                center={[51.505, -0.09]} // Default center (London)
                zoom={3} // Zoomed out for global view since we have global maritime data
                scrollWheelZoom={true}
                className="h-[calc(100vh-64px)] w-full z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    className="map-tiles-dark"
                />

                <MapController selectedWarning={selectedWarning} selectedNotam={selectedNotam} selectedWeatherAlert={selectedWeatherAlert} />

                {/* Render Selected Weather Alert */}
                {selectedWeatherAlert && selectedWeatherAlert.coordinates && selectedWeatherAlert.coordinates.length > 0 && (
                    <Polygon
                        positions={selectedWeatherAlert.coordinates.map(c => [c.latitude, c.longitude])}
                        pathOptions={{
                            color: '#8b5cf6', // Violet
                            fillColor: '#8b5cf6',
                            fillOpacity: 0.3
                        }}
                    >
                        <Popup>
                            <div className="font-bold text-violet-600">{selectedWeatherAlert.event}</div>
                            <div className="text-xs text-zinc-600">{selectedWeatherAlert.sender_name}</div>
                            <div className="text-xs mt-1 italic">{new Date(selectedWeatherAlert.start * 1000).toLocaleString()}</div>
                        </Popup>
                    </Polygon>
                )}

                <Marker position={[51.505, -0.09]}>
                    <Popup>
                        <div className="font-bold">Mercurial Logistics</div>
                        <div>Headquarters</div>
                    </Popup>
                </Marker>

                {events
                    .filter(event => visibleCategories[mapCategoryToKey(event.category)])
                    .map((event) => {
                        if (event.radius && event.radius > 1) {
                            return (
                                <Circle
                                    key={event.guid}
                                    center={[event.latitude, event.longitude]}
                                    radius={event.radius}
                                    pathOptions={{
                                        color: getCategoryColor(event.category),
                                        fillColor: getCategoryColor(event.category),
                                        fillOpacity: 0.3
                                    }}
                                >
                                    {renderPopup(event)}
                                </Circle>
                            );
                        }

                        return (
                            <Marker
                                key={event.guid}
                                position={[event.latitude, event.longitude]}
                                icon={createCustomIcon(event.category)}
                            >
                                {renderPopup(event)}
                            </Marker>
                        );
                    })}

                {/* Render Selected Navigation Warning */}
                {selectedWarning && selectedWarning.coordinates && selectedWarning.coordinates.length > 0 && (
                    selectedWarning.isArea ? (
                        <Polygon
                            positions={selectedWarning.coordinates.map(c => [c.latitude, c.longitude])}
                            pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2 }}
                        >
                            <Popup>
                                <div className="font-bold text-red-600">{selectedWarning.reference}</div>
                                <div className="text-xs">{selectedWarning.datetime}</div>
                                <div className="text-xs text-zinc-600 mt-1">Area Warning</div>
                            </Popup>
                        </Polygon>
                    ) : (
                        selectedWarning.coordinates.map((coord, idx) => (
                            <Marker
                                key={`${selectedWarning.reference}-${idx}`}
                                position={[coord.latitude, coord.longitude]}
                                icon={createWarningIcon()}
                            >
                                <Popup>
                                    <div className="font-bold text-red-600">{selectedWarning.reference}</div>
                                    <div className="text-xs">{selectedWarning.datetime}</div>
                                    <div className="text-xs text-zinc-600 mt-1">Point {idx + 1}</div>
                                </Popup>
                            </Marker>
                        ))
                    )
                )}

                {/* Render Route Previews as Polylines */}
                {routePreviews.map((preview) => (
                    <Polyline
                        key={`route-preview-${preview.stageIndex}`}
                        positions={preview.coordinates}
                        pathOptions={{
                            color: "#10b981", // Emerald color
                            weight: 4,
                            opacity: 0.8,
                            dashArray: preview.mode === TransportMode.Flight ? "10, 10" : undefined,
                        }}
                    />
                ))}

                {/* Render Selected NOTAM */}
                {selectedNotam && (
                    <>
                        {/* Always render a Marker for visibility */}
                        <Marker
                            position={[selectedNotam.latitude, selectedNotam.longitude]}
                            icon={createNotamIcon()}
                        >
                            <Popup>
                                <div className="font-bold text-blue-500">{selectedNotam.notamCode}</div>
                                <div className="text-xs text-zinc-600">{selectedNotam.title}</div>
                            </Popup>
                        </Marker>

                        {/* Render Circle only if radius is specified and valid */}
                        {selectedNotam.radius && selectedNotam.radius > 0 && selectedNotam.radius !== 255 && (
                            <Circle
                                center={[selectedNotam.latitude, selectedNotam.longitude]}
                                radius={selectedNotam.radius * 1852} // Assuming NM, converting to meters. If 1, ~1.8km.
                                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2, dashArray: '5, 10' }}
                            />
                        )}
                    </>
                )}

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
                                case "Maritime": color = "#06b6d4"; break;
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
