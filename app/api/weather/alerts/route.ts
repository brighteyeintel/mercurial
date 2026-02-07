import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface WeatherAlert {
    id: string;
    sender_name: string;
    event: string;
    start: number;
    end: number;
    description: string;
    tags: string[];
    lat: number;
    lon: number;
    coordinates?: { latitude: number; longitude: number }[];
}

const GLOBAL_POLYGON = [
    { lat: 85, lon: -180 },
    { lat: 85, lon: 180 },
    { lat: -85, lon: 180 },
    { lat: -85, lon: -180 },
    { lat: 85, lon: -180 }
];

const ALLOWED_EVENTS = [
    "coastal_event",
    "extreme_low_temperature",
    "extreme_high_temperature",
    "wind",
    "sand_dust",
    "rain",
    "fire_warning",
    "marine_event",
    "fog",
    "tornado",
    "cyclone",
    "snow_ice"
];

// Helper to generate coordinates for a polygon (hex/circle approximation) for visualization
const generatePolygon = (lat: number, lon: number, radiusKm: number = 200) => {
    const coords = [];
    const steps = 6; // Hexagon
    for (let i = 0; i < steps; i++) {
        const angle = (i * 2 * Math.PI) / steps;
        const dLat = (radiusKm / 111.32) * Math.cos(angle);
        const dLon = (radiusKm / (111.32 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);
        coords.push({ latitude: lat + dLat, longitude: lon + dLon });
    }
    return coords;
};

export async function GET() {
    try {
        const apiKey = process.env.OPEN_WEATHER_KEY;
        // In a real scenario, we'd fetch from OpenWeather.
        // Due to the complexity of "Global Alerts" via a single standard API call, 
        // and to ensure the UI works immediately for the user to review,
        // we will fetch from a few key locations using One Call 3.0 if creating a "global" list,
        // OR mock typical responses for the requested event types to demonstrate the system.

        // Mocking logic for robust demonstration of the UI:
        const mockAlerts: WeatherAlert[] = [
            {
                id: "mock-1",
                sender_name: "NWS National Hurricane Center",
                event: "Hurricane Warning",
                start: Date.now() / 1000,
                end: (Date.now() / 1000) + 86400,
                description: "Hurricane conditions expected within the warning area.",
                tags: ["cyclone", "wind", "rain"],
                lat: 25.0,
                lon: -80.0,
                coordinates: generatePolygon(25.0, -80.0, 300)
            },
            {
                id: "mock-2",
                sender_name: "MeteoAlarm",
                event: "Extreme High Temperature",
                start: Date.now() / 1000,
                end: (Date.now() / 1000) + 43200,
                description: "Temperatures reaching 45C expected in the region.",
                tags: ["extreme_high_temperature"],
                lat: 34.0,
                lon: 3.0,
                coordinates: generatePolygon(34.0, 3.0, 500)
            },
            {
                id: "mock-3",
                sender_name: "Japan Meteorological Agency",
                event: "Tsunami Advisory",
                start: Date.now() / 1000,
                end: (Date.now() / 1000) + 21600,
                description: "Tsunami expected along coastal areas.",
                tags: ["coastal_event", "marine_event"],
                lat: 35.0,
                lon: 140.0,
                coordinates: generatePolygon(35.0, 140.0, 150)
            },
            {
                id: "mock-4",
                sender_name: "Environment Canada",
                event: "Winter Storm Warning",
                start: Date.now() / 1000,
                end: (Date.now() / 1000) + 172800,
                description: "Heavy snow and ice accumulation likely.",
                tags: ["snow_ice", "wind"],
                lat: 55.0,
                lon: -110.0,
                coordinates: generatePolygon(55.0, -110.0, 400)
            }
        ];

        // If the user has a real key and we could hit the API, we'd do it here.
        // For now, return the mocks to ensure the UI can be built and reviewed.
        // This is a placeholder while we confirm the exact "Global Polygon" endpoint access.

        return NextResponse.json({ alerts: mockAlerts });

    } catch (error) {
        console.error("Error fetching weather alerts:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
