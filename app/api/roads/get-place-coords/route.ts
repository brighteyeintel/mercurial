import { NextRequest, NextResponse } from "next/server";

interface GeocodingResponse {
    results: {
        formatted_address: string;
        geometry: {
            location: {
                lat: number;
                lng: number;
            };
        };
    }[];
    status: string;
    error_message?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { description } = body;

        if (!description) {
            return NextResponse.json(
                { error: "Description is required" },
                { status: 400 }
            );
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "Google Maps API key is not configured" },
                { status: 500 }
            );
        }

        const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
        url.searchParams.set("address", description);
        url.searchParams.set("key", apiKey);

        const response = await fetch(url.toString());
        const data: GeocodingResponse = await response.json();

        if (data.status === "ZERO_RESULTS") {
            return NextResponse.json(
                { error: "Location not found" },
                { status: 404 }
            );
        }

        if (data.status !== "OK") {
            return NextResponse.json(
                { error: `Geocoding API error: ${data.status}`, details: data.error_message },
                { status: 400 }
            );
        }

        const result = data.results[0];
        const { lat, lng } = result.geometry.location;
        const formattedAddress = result.formatted_address;

        return NextResponse.json({
            lat,
            lng,
            formattedAddress,
        });
    } catch (error) {
        console.error("Error in get-place-coords:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
