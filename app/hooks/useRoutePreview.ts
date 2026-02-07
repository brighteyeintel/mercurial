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
async function fetchFlightRoute(origin: string, destination: string): Promise<[number, number][] | null> {
    // TODO: Integrate with aviation API when available
    console.log(`[STUB] Flight route from ${origin} to ${destination} - not yet implemented`);
    return null;
}

async function fetchSeaRoute(origin: string, destination: string): Promise<[number, number][] | null> {
    // TODO: Integrate with maritime routing API when available
    console.log(`[STUB] Sea route from ${origin} to ${destination} - not yet implemented`);
    return null;
}

async function fetchRailRoute(origin: string, destination: string): Promise<[number, number][] | null> {
    // TODO: Integrate with rail routing API when available
    console.log(`[STUB] Rail route from ${origin} to ${destination} - not yet implemented`);
    return null;
}

async function fetchRoadRoute(origin: string, destination: string): Promise<RoutePreviewData | null> {
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
        origin: string,
        destination: string
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
                const origin = stage.transport.source.name;
                const destination = stage.transport.destination.name;

                if (!origin || !destination) {
                    console.warn(`Stage ${i}: Missing origin or destination`);
                    continue;
                }

                let result: RoutePreviewData | null = null;

                switch (stage.transport.mode) {
                    case TransportMode.Road:
                        result = await fetchRoadRoute(origin, destination);
                        break;
                    case TransportMode.Flight:
                        const flightCoords = await fetchFlightRoute(origin, destination);
                        if (flightCoords) {
                            result = {
                                stageIndex: i,
                                coordinates: flightCoords,
                                mode: TransportMode.Flight,
                            };
                        }
                        break;
                    case TransportMode.Sea:
                        const seaCoords = await fetchSeaRoute(origin, destination);
                        if (seaCoords) {
                            result = {
                                stageIndex: i,
                                coordinates: seaCoords,
                                mode: TransportMode.Sea,
                            };
                        }
                        break;
                    case TransportMode.Rail:
                        const railCoords = await fetchRailRoute(origin, destination);
                        if (railCoords) {
                            result = {
                                stageIndex: i,
                                coordinates: railCoords,
                                mode: TransportMode.Rail,
                            };
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
