"use client";

import { useState, useCallback } from "react";
import { decode } from "@googlemaps/polyline-codec";
import { Stage, TransportMode } from "../types/ShippingRouteData";

export interface RoutePreviewData {
    stageIndex: number;
    coordinates: [number, number][]; // [lat, lng][]
    duration?: string;
    durationInTraffic?: string;
    mode: TransportMode | "holding";
}

// Stub functions for non-road transport modes
// These will be implemented when APIs become available
async function fetchFlightRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
): Promise<[number, number][] | null> {
    const points: [number, number][] = [];
    const steps = 50; // Resolution of the curve

    const p0 = origin;
    const p2 = destination;

    // Calculate midpoint
    const midLat = (p0.lat + p2.lat) / 2;
    const midLng = (p0.lng + p2.lng) / 2;

    // Calculate a control point to create an arc that bows away from the equator.
    // This helps mimic great circle paths on a 2D map projection.
    const dist = Math.sqrt(Math.pow(p2.lat - p0.lat, 2) + Math.pow(p2.lng - p0.lng, 2));
    const curvature = 0.2; // Adjust this for more or less arc

    // Determine bowing direction: North (+) in Northern Hemisphere, South (-) in Southern Hemisphere
    const direction = midLat >= 0 ? 1 : -1;

    // Control point P1 = Midpoint + Latitudinal Offset (bowing away from equator)
    const p1 = {
        lat: midLat + (dist * curvature * direction),
        lng: midLng
    };

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Quadratic Bezier formula: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
        const lat = Math.pow(1 - t, 2) * p0.lat + 2 * (1 - t) * t * p1.lat + Math.pow(t, 2) * p2.lat;
        const lng = Math.pow(1 - t, 2) * p0.lng + 2 * (1 - t) * t * p1.lng + Math.pow(t, 2) * p2.lng;
        points.push([lat, lng]);
    }

    return points;
}

async function fetchSeaRoute(origin: string, destination: string): Promise<[number, number][] | null> {
    try {
        // API expects port numbers. origin/destination should be the port number codes.
        const response = await fetch(`/api/maritime/navigation?source=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`);

        if (!response.ok) {
            console.error("Failed to fetch sea route");
            return null;
        }

        const data = await response.json();

        if (data.path && Array.isArray(data.path)) {
            // API returns GeoJSON [lon, lat], Leaflet needs [lat, lon]
            return data.path.map((p: [number, number]) => [p[1], p[0]]);
        }
    } catch (error) {
        console.error("Error fetching sea route:", error);
    }
    return null;
}

async function fetchRailRoute(origin: string, destination: string): Promise<[number, number][] | null> {
    // TODO: Integrate with rail routing API when available
    console.log(`[STUB] Rail route from ${origin} to ${destination} - not yet implemented`);
    return null;
}

async function fetchRoadRoute(
    origin: { lat: number; lng: number } | string,
    destination: { lat: number; lng: number } | string
): Promise<RoutePreviewData | null> {
    try {
        const response = await fetch("/api/roads/navigation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ origin, destination }),
        });

        if (!response.ok) {
            console.error("Failed to fetch road route");
            return null;
        }

        const data = await response.json();

        if (data.polyline) {
            const decoded = decode(data.polyline) as [number, number][];
            return {
                stageIndex: -1, // Will be set by caller
                coordinates: decoded,
                duration: data.duration?.text,
                durationInTraffic: data.durationInTraffic?.text,
                mode: TransportMode.Road,
            };
        }
    } catch (error) {
        console.error("Error fetching road route:", error);
    }
    return null;
}

export function useRoutePreview() {
    const [routePreviews, setRoutePreviews] = useState<RoutePreviewData[]>([]);
    const [isLoading, setIsLoading] = useState<Record<number, boolean>>({});
    const [isLoadingAll, setIsLoadingAll] = useState(false);

    const fetchRoutePreview = useCallback(async (
        stageIndex: number,
        origin: { lat: number; lng: number } | string,
        destination: { lat: number; lng: number } | string
    ) => {
        if (!origin || !destination) return;

        setIsLoading(prev => ({ ...prev, [stageIndex]: true }));

        try {
            const result = await fetchRoadRoute(origin, destination);
            if (result) {
                result.stageIndex = stageIndex;
                setRoutePreviews(prev => {
                    const filtered = prev.filter(p => p.stageIndex !== stageIndex);
                    return [...filtered, result];
                });
            }
        } finally {
            setIsLoading(prev => ({ ...prev, [stageIndex]: false }));
        }
    }, []);

    const fetchAllRoutePreviews = useCallback(async (stages: Stage[]) => {
        setIsLoadingAll(true);
        setRoutePreviews([]); // Clear existing previews

        const newPreviews: RoutePreviewData[] = [];

        for (let i = 0; i < stages.length; i++) {
            const stage = stages[i];

            // Skip holding stages
            if (stage.holding) {
                continue;
            }

            if (stage.transport) {
                let origin = stage.transport.source.name;
                let destination = stage.transport.destination.name;

                // For Sea mode, prioritize the 'code' field which should contain the port number
                if (stage.transport.mode === TransportMode.Sea) {
                    origin = stage.transport.source.code || stage.transport.source.name;
                    destination = stage.transport.destination.code || stage.transport.destination.name;
                }

                if (!origin || !destination) {
                    console.warn(`Stage ${i}: Missing origin or destination`);
                    continue;
                }

                let result: RoutePreviewData | null = null;

                switch (stage.transport.mode) {
                    case TransportMode.Road:
                        const roadOrigin = { lat: stage.transport.source.latitude, lng: stage.transport.source.longitude };
                        const roadDest = { lat: stage.transport.destination.latitude, lng: stage.transport.destination.longitude };

                        // Use coordinates if available, fallback to name if coordinates are 0,0
                        const hasOriginCoords = roadOrigin.lat !== 0 || roadOrigin.lng !== 0;
                        const hasDestCoords = roadDest.lat !== 0 || roadDest.lng !== 0;

                        if (hasOriginCoords && hasDestCoords) {
                            result = await fetchRoadRoute(roadOrigin, roadDest);
                        } else if (stage.transport.source.name && stage.transport.destination.name) {
                            result = await fetchRoadRoute(stage.transport.source.name, stage.transport.destination.name);
                        }
                        break;
                    case TransportMode.Flight:
                        const flightCoords = await fetchFlightRoute(
                            { lat: stage.transport.source.latitude, lng: stage.transport.source.longitude },
                            { lat: stage.transport.destination.latitude, lng: stage.transport.destination.longitude }
                        );
                        if (flightCoords) {
                            result = {
                                stageIndex: i,
                                coordinates: flightCoords,
                                mode: TransportMode.Flight,
                            };
                        }
                        break;
                    case TransportMode.Sea:
                        if (origin && destination) {
                            const seaCoords = await fetchSeaRoute(origin, destination);
                            if (seaCoords) {
                                result = {
                                    stageIndex: i,
                                    coordinates: seaCoords,
                                    mode: TransportMode.Sea,
                                };
                            }
                        }
                        break;
                    case TransportMode.Rail:
                        if (origin && destination) {
                            const railCoords = await fetchRailRoute(origin, destination);
                            if (railCoords) {
                                result = {
                                    stageIndex: i,
                                    coordinates: railCoords,
                                    mode: TransportMode.Rail,
                                };
                            }
                        }
                        break;
                }

                if (result) {
                    result.stageIndex = i;
                    newPreviews.push(result);
                }
            }
        }

        setRoutePreviews(newPreviews);
        setIsLoadingAll(false);
    }, []);

    const clearRoutePreview = useCallback((stageIndex: number) => {
        setRoutePreviews(prev => prev.filter(p => p.stageIndex !== stageIndex));
    }, []);

    const clearAllPreviews = useCallback(() => {
        setRoutePreviews([]);
    }, []);

    return {
        routePreviews,
        isLoading,
        isLoadingAll,
        fetchRoutePreview,
        fetchAllRoutePreviews,
        clearRoutePreview,
        clearAllPreviews,
    };
}
