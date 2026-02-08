import { NextRequest, NextResponse } from "next/server";

interface DurationInfo {
    text: string;
    value: number; // seconds
}

interface NavigationResponse {
    origin: string;
    destination: string;
    duration: DurationInfo;
    durationInTraffic: DurationInfo;
    difference: DurationInfo;
    polyline: string;
}

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} min${minutes !== 1 ? "s" : ""}`;
    }
    return `${minutes} min${minutes !== 1 ? "s" : ""}`;
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    let { origin, destination } = body;

    if (!origin || !destination) {
        return NextResponse.json(
            { error: "Missing required parameters: origin and destination" },
            { status: 400 }
        );
    }

    // Convert coordinate objects to "lat,lng" strings if necessary
    const formatLocation = (loc: any) => {
        if (typeof loc === 'object' && loc !== null && 'latitude' in loc && 'longitude' in loc) {
            return `${loc.latitude},${loc.longitude}`;
        }
        if (typeof loc === 'object' && loc !== null && 'lat' in loc && 'lng' in loc) {
            return `${loc.lat},${loc.lng}`;
        }
        return String(loc);
    };

    const originStr = formatLocation(origin);
    const destinationStr = formatLocation(destination);

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: "Google Maps API key is not configured" },
            { status: 500 }
        );
    }

    try {
        // Request with traffic data (departure_time=now)
        const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
        url.searchParams.set("origin", originStr);
        url.searchParams.set("destination", destinationStr);
        url.searchParams.set("departure_time", "now");
        url.searchParams.set("key", apiKey);
        url.searchParams.set("travel_mode", "driving");
        url.searchParams.set("extraComputations", "TRAFFIC_ON_POLYLINE");

        const response = await fetch(url.toString());
        const data = await response.json();

        if (data.status !== "OK") {
            return NextResponse.json(
                { error: `Directions API error: ${data.status}`, details: data.error_message },
                { status: 400 }
            );
        }

        const leg = data.routes[0].legs[0];
        const duration: DurationInfo = {
            text: leg.duration.text,
            value: leg.duration.value,
        };

        // duration_in_traffic is only available when departure_time is specified
        const durationInTraffic: DurationInfo = leg.duration_in_traffic
            ? {
                text: leg.duration_in_traffic.text,
                value: leg.duration_in_traffic.value,
            }
            : duration; // Fallback to regular duration if traffic data unavailable

        const differenceSeconds = durationInTraffic.value - duration.value;
        const difference: DurationInfo = {
            text: differenceSeconds >= 0
                ? `+${formatDuration(Math.abs(differenceSeconds))}`
                : `-${formatDuration(Math.abs(differenceSeconds))}`,
            value: differenceSeconds,
        };

        // Get the traffic-aware polyline from the route
        const polyline = data.routes[0].overview_polyline.points;

        const result: NavigationResponse = {
            origin: leg.start_address,
            destination: leg.end_address,
            duration,
            durationInTraffic,
            difference,
            polyline,
        };

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching directions:", error);
        return NextResponse.json(
            { error: "Failed to fetch directions" },
            { status: 500 }
        );
    }
}