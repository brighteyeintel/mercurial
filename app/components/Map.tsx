"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Polyline, useMap, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
// Fix for missing marker icons in leaflet production bundle
import L from "leaflet";
import { useEffect, useState, useMemo, useRef } from "react";
import { Clock, ExternalLink } from "lucide-react";
import { NavigationWarning } from "../types/NavigationWarning";
import { RoutePreviewData } from "../hooks/useRoutePreview";
import { Notam } from "../types/Notam";
import { WeatherAlert } from "../types/WeatherAlert";
import { TransportMode } from "../types/ShippingRouteData";

// Component to handle map interactions like flying to coordinates
const MapController = ({ selectedWarning, selectedNotam, selectedWeatherAlert, selectedCountryBounds, routePreviews }: {
    selectedWarning?: NavigationWarning | null,
    selectedNotam?: Notam | null,
    selectedWeatherAlert?: WeatherAlert | null,
    selectedCountryBounds?: L.LatLngBounds | null,
    routePreviews?: RoutePreviewData[]
}) => {
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

    useEffect(() => {
        if (selectedCountryBounds) {
            map.flyToBounds(selectedCountryBounds, {
                padding: [50, 50],
                maxZoom: 6,
                animate: true,
                duration: 1.5
            });
        }
    }, [selectedCountryBounds, map]);

    useEffect(() => {
        if (routePreviews && routePreviews.length > 0) {
            const bounds = L.latLngBounds([]);
            let hasPoints = false;

            routePreviews.forEach(preview => {
                if (preview.coordinates && preview.coordinates.length > 0) {
                    preview.coordinates.forEach(coord => {
                        bounds.extend(coord);
                        hasPoints = true;
                    });
                }
            });

            if (hasPoints && bounds.isValid()) {
                map.flyToBounds(bounds, {
                    padding: [50, 50],
                    animate: true,
                    duration: 1.5
                });
            }
        }
    }, [routePreviews, map]);

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
    selectedTradeBarrierCountry?: string | null;
    checkedWarnings?: NavigationWarning[];
    checkedNotams?: Notam[];
    checkedWeatherAlerts?: WeatherAlert[];
    checkedTradeCountries?: string[];
    visibleCategories?: Record<string, boolean>;
}

const MapComponent = ({
    selectedWarning,
    selectedNotam,
    selectedWeatherAlert,
    routePreviews = [],
    selectedTradeBarrierCountry,
    checkedWarnings = [],
    checkedNotams = [],
    checkedWeatherAlerts = [],
    checkedTradeCountries = [],
    visibleCategories = { "Road Works": false, "Accident": true, "Congestion": true, "Maritime": true, "Other": true }
}: MapComponentProps) => {
    const [events, setEvents] = useState<TrafficEvent[]>([]);
    const [countryData, setCountryData] = useState<any>(null); // GeoJSON FeatureCollection

    // Fetch Country GeoJSON
    useEffect(() => {
        const fetchCountries = async () => {
            try {
                const res = await fetch('/api/trade/countries');
                if (res.ok) {
                    const data = await res.json();
                    setCountryData(data);
                }
            } catch (error) {
                console.error("Failed to fetch country data:", error);
            }
        };
        fetchCountries();
    }, []);

    const selectedCountryFeature = useMemo(() => {
        if (!countryData || !selectedTradeBarrierCountry) return null;

        // Normalize search string
        const search = selectedTradeBarrierCountry.toLowerCase();

        // Exact match first
        const exact = countryData.features.find((f: any) => f.properties.name.toLowerCase() === search);
        if (exact) return exact;

        // Includes match
        return countryData.features.find((f: any) => f.properties.name.toLowerCase().includes(search));
    }, [countryData, selectedTradeBarrierCountry]);

    const checkedCountryFeatures = useMemo(() => {
        if (!countryData || checkedTradeCountries.length === 0) return [];
        return checkedTradeCountries.map(country => {
            const search = country.toLowerCase();
            const exact = countryData.features.find((f: any) => f.properties.name.toLowerCase() === search);
            return exact || countryData.features.find((f: any) => f.properties.name.toLowerCase().includes(search));
        }).filter(Boolean);
    }, [countryData, checkedTradeCountries]);

    const selectedCountryBounds = useMemo(() => {
        if (!selectedCountryFeature) return null;
        try {
            return L.geoJSON(selectedCountryFeature as any).getBounds();
        } catch (e) {
            return null;
        }
    }, [selectedCountryFeature]);

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

    // Combine selected and checked items for rendering
    const allRenderedWarnings = useMemo(() => {
        const combined = [...checkedWarnings];
        if (selectedWarning && !combined.find(w => w.reference === selectedWarning.reference)) {
            combined.push(selectedWarning);
        }
        return combined;
    }, [selectedWarning, checkedWarnings]);

    const allRenderedNotams = useMemo(() => {
        const combined = [...checkedNotams];
        if (selectedNotam && !combined.find(n => n.id === selectedNotam.id)) {
            combined.push(selectedNotam);
        }
        return combined;
    }, [selectedNotam, checkedNotams]);

    const allRenderedWeatherAlerts = useMemo(() => {
        const combined = [...checkedWeatherAlerts];
        // Simplified unique check based on event and start time
        if (selectedWeatherAlert && !combined.find(a => a.event === selectedWeatherAlert.event && a.start === selectedWeatherAlert.start)) {
            combined.push(selectedWeatherAlert);
        }
        return combined;
    }, [selectedWeatherAlert, checkedWeatherAlerts]);

    return (
        <div className="relative h-full w-full">
            <MapContainer
                center={[51.505, -0.09]} // Default center (London)
                zoom={3} // Zoomed out for global view since we have global maritime data
                scrollWheelZoom={true}
                zoomControl={false}
                className="h-[calc(100vh-64px)] w-full z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    className="map-tiles-dark"
                />

                <MapController
                    selectedWarning={selectedWarning}
                    selectedNotam={selectedNotam}
                    selectedWeatherAlert={selectedWeatherAlert}
                    selectedCountryBounds={selectedCountryBounds}
                    routePreviews={routePreviews}
                />

                {/* Render Selected & Checked Trade Barrier Countries */}
                {selectedCountryFeature && (
                    <GeoJSON
                        key={`selected-${selectedTradeBarrierCountry}`}
                        data={selectedCountryFeature}
                        style={{
                            color: '#fbbf24', // Amber-400
                            weight: 2,
                            opacity: 1,
                            dashArray: '5, 5',
                            fillColor: '#fbbf24',
                            fillOpacity: 0.2
                        }}
                    />
                )}
                {checkedCountryFeatures.map((feature: any, idx) => (
                    <GeoJSON
                        key={`checked-country-${idx}`}
                        data={feature}
                        style={{
                            color: '#fbbf24', // Amber-400
                            weight: 2,
                            opacity: 0.7,
                            dashArray: '5, 5',
                            fillColor: '#fbbf24',
                            fillOpacity: 0.1
                        }}
                    />
                ))}

                {/* Render Selected & Checked Weather Alerts */}
                {allRenderedWeatherAlerts.map((alert, idx) => (
                    alert.coordinates && alert.coordinates.length > 0 && (
                        <Polygon
                            key={`weather-${alert.event}-${idx}`}
                            positions={alert.coordinates.map(c => [c.latitude, c.longitude])}
                            pathOptions={{
                                color: '#8b5cf6', // Violet
                                fillColor: '#8b5cf6',
                                fillOpacity: 0.3
                            }}
                        >
                            <Popup>
                                <div className="font-bold text-violet-600">{alert.event}</div>
                                <div className="text-xs text-zinc-600">{alert.sender_name}</div>
                                <div className="text-xs mt-1 italic">{new Date(alert.start * 1000).toLocaleString()}</div>
                            </Popup>
                        </Polygon>
                    )
                ))}

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

                {/* Render Selected & Checked Navigation Warnings */}
                {allRenderedWarnings.map((warning, idx) => (
                    warning.coordinates && warning.coordinates.length > 0 && (
                        warning.isArea ? (
                            <Polygon
                                key={`warn-poly-${warning.reference}-${idx}`}
                                positions={warning.coordinates.map(c => [c.latitude, c.longitude])}
                                pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2 }}
                            >
                                <Popup>
                                    <div className="font-bold text-red-600">{warning.reference}</div>
                                    <div className="text-xs">{warning.datetime}</div>
                                    <div className="text-xs text-zinc-600 mt-1">Area Warning</div>
                                </Popup>
                            </Polygon>
                        ) : (
                            warning.coordinates.map((coord, cIdx) => (
                                <Marker
                                    key={`warn-marker-${warning.reference}-${idx}-${cIdx}`}
                                    position={[coord.latitude, coord.longitude]}
                                    icon={createWarningIcon()}
                                >
                                    <Popup>
                                        <div className="font-bold text-red-600">{warning.reference}</div>
                                        <div className="text-xs">{warning.datetime}</div>
                                        <div className="text-xs text-zinc-600 mt-1">Point {cIdx + 1}</div>
                                    </Popup>
                                </Marker>
                            ))
                        )
                    )
                ))}

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

                {/* Render Selected & Checked NOTAMs */}
                {allRenderedNotams.map((notam, idx) => (
                    <div key={`notam-group-${idx}`}>
                        {/* Always render a Marker for visibility */}
                        <Marker
                            position={[notam.latitude, notam.longitude]}
                            icon={createNotamIcon()}
                        >
                            <Popup>
                                <div className="font-bold text-blue-500">{notam.notamCode}</div>
                                <div className="text-xs text-zinc-600">{notam.title}</div>
                            </Popup>
                        </Marker>

                        {/* Render Circle only if radius is specified and valid */}
                        {notam.radius && notam.radius > 0 && notam.radius !== 255 && (
                            <Circle
                                center={[notam.latitude, notam.longitude]}
                                radius={notam.radius * 1852} // Assuming NM, converting to meters. If 1, ~1.8km.
                                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2, dashArray: '5, 10' }}
                            />
                        )}
                    </div>
                ))}

            </MapContainer>

        </div>
    );
};

export default MapComponent;
