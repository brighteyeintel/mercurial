"use client";

import { useState, useCallback } from "react";
import { decode } from "@googlemaps/polyline-codec";

export interface RoutePreviewData {
    stageIndex: number;
    coordinates: [number, number][]; // [lat, lng][]
    duration?: string;
    durationInTraffic?: string;
}

export function useRoutePreview() {
    const [routePreviews, setRoutePreviews] = useState<RoutePreviewData[]>([]);
    const [isLoading, setIsLoading] = useState<Record<number, boolean>>({});

    const fetchRoutePreview = useCallback(async (
        stageIndex: number,
        origin: string,
        destination: string
    ) => {
        if (!origin || !destination) return;

        setIsLoading(prev => ({ ...prev, [stageIndex]: true }));

        try {
            const response = await fetch("/api/roads/navigation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ origin, destination }),
            });

            if (!response.ok) {
                console.error("Failed to fetch route preview");
                return;
            }

            const data = await response.json();

            if (data.polyline) {
                // Decode the polyline - returns array of [lat, lng] pairs
                const decoded = decode(data.polyline) as [number, number][];

                setRoutePreviews(prev => {
                    // Remove any existing preview for this stage
                    const filtered = prev.filter(p => p.stageIndex !== stageIndex);
                    return [
                        ...filtered,
                        {
                            stageIndex,
                            coordinates: decoded,
                            duration: data.duration?.text,
                            durationInTraffic: data.durationInTraffic?.text,
                        }
                    ];
                });
            }
        } catch (error) {
            console.error("Error fetching route preview:", error);
        } finally {
            setIsLoading(prev => ({ ...prev, [stageIndex]: false }));
        }
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
        fetchRoutePreview,
        clearRoutePreview,
        clearAllPreviews,
    };
}
