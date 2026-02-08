import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

import { WorldPortsData, Port } from '../../../types/Port';




// ... existing imports ...

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const destination = searchParams.get('destination');

    if (!source || !destination) {
        return NextResponse.json({ error: 'Source and destination port numbers are required' }, { status: 400 });
    }

    const sourcePortNum = parseInt(source, 10);
    const destPortNum = parseInt(destination, 10);

    if (isNaN(sourcePortNum) || isNaN(destPortNum)) {
        return NextResponse.json({ error: 'Invalid port numbers' }, { status: 400 });
    }

    try {
        // Load Port Data to resolve coordinates
        // Optimization: Cache this in production
        const jsonDirectory = path.join(process.cwd(), 'app/api/maritime/portlocations');
        const fileContents = await fs.readFile(jsonDirectory + '/world-ports.json', 'utf8');
        const data: WorldPortsData = JSON.parse(fileContents);
        const ports = Object.values(data.ports);

        const sourcePort = ports.find(p => p.portNumber === sourcePortNum);
        const destPort = ports.find(p => p.portNumber === destPortNum);

        if (!sourcePort || !destPort) {
            return NextResponse.json({ error: 'One or both ports not found' }, { status: 404 });
        }

        // Construct MarinePlan API URL
        const baseUrl = "https://marineplan.net/api/routing/1/plan.json";
        const apiKey = "adc8d21f-6f98-4f82-bfd7-1b7983ddf7a0";
        const params = new URLSearchParams({
            key: apiKey,
            language: "en",
            challenging: "1",
            attractive: "0",
            avoidbigcanals: "0",
            avoidlocks: "0",
            avoidobstructions: "0",
            avoidopenwater: "0",
            alternatives: "0",
            allowmastdown: "0",
            ignoreblocks: "0",
            ignoreengine: "0",
            ignoreoneway: "0",
            avoidrules: "tss",
            from: `${sourcePort.latitude.toFixed(4)},${sourcePort.longitude.toFixed(4)}`,
            to: `${destPort.latitude.toFixed(4)},${destPort.longitude.toFixed(4)}`,
            vessel: "4",
            width: "3",
            weight: "1000",
            depth: "1",
            length: "10",
            minheight: "2",
            maxheight: "2",
            maxspeed: "12",
            nominalspeed: "9",
            consumptionperhour: "0",
            fueltype: "LIQUID"
        });

        const queryString = params.toString().replace(/%2C/g, ',');

        console.log(`${baseUrl}?${queryString}`)

        const marineResponse = await fetch(`${baseUrl}?${queryString}`, {
            headers: {
                "Accept": "*/*",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Accept-Language": "en-US,en;q=0.9",
                "Connection": "keep-alive",
                "Host": "marineplan.net",
                "Origin": "https://maps.marineplan.com",
                "Referer": "https://maps.marineplan.com/",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "cross-site",
                "Sec-GPC": "1",
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
                "sec-ch-ua": '"Not(A:Brand";v="8", "Chromium";v="144", "Brave";v="144"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Linux"'
            }
        });

        if (!marineResponse.ok) {
            throw new Error(`MarinePlan API failed: ${marineResponse.statusText}`);
        }

        const marineData = await marineResponse.json();

        if (marineData.planResult === "OK" && marineData.routes && marineData.routes.length > 0) {
            const polylinePoints = marineData.routes[0].polyline.points;
            // Convert to [lon, lat] for GeoJSON/Frontend standard (frontend expects [lon, lat] from this API now? 
            // Wait, previous frontend code expected [lon,lat] from API and swapped it.
            // MarinePlan returns {latitude, longitude} objects.

            const pathCoords = polylinePoints.map((p: any) => [p.longitude, p.latitude]);

            return NextResponse.json({
                origin: sourcePort,
                destination: destPort,
                path: pathCoords, // Helper for frontend simple array
                distance: marineData.routes[0].summary?.distanceMeters ? marineData.routes[0].summary.distanceMeters / 1852 : 0,
                units: 'nautical_miles'
            });
        } else {
            return NextResponse.json({ error: 'No route found by MarinePlan' }, { status: 404 });
        }

    } catch (error) {
        console.error('Error fetching marine route:', error);
        return NextResponse.json({ error: 'Failed to fetch route' }, { status: 500 });
    }
}
