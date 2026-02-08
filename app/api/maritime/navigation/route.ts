import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { searoute } from '../../../lib/searoute';

import { WorldPortsData, Port } from '../../../types/Port';

interface RouteResponse {
    origin: Port;
    destination: Port;
    path: number[][];
    distance: number;
    units: string;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const destination = searchParams.get('destination');

    if (!source || !destination) {
        return NextResponse.json({ error: 'Source and destination port numbers are required' }, { status: 400 });
    }

    const sourcePortNum = parseInt(source, 10);
    const destPortNum = parseInt(destination, 10);

    try {
        // Load Port Data to resolve coordinates
        // Optimization: Cache this in production
        const jsonDirectory = path.join(process.cwd(), 'app/api/maritime/portlocations');
        const fileContents = await fs.readFile(jsonDirectory + '/world-ports.json', 'utf8');
        const data: WorldPortsData = JSON.parse(fileContents);
        const ports = Object.values(data.ports);

        let sourcePort: Port | undefined;
        let destPort: Port | undefined;

        if (!isNaN(sourcePortNum)) {
            sourcePort = ports.find(p => p.portNumber === sourcePortNum);
        } else {
            // Try finding by name (case-insensitive, partial match)
            sourcePort = ports.find(p => p.portName.toLowerCase().includes(source.toLowerCase()));
        }

        if (!isNaN(destPortNum)) {
            destPort = ports.find(p => p.portNumber === destPortNum);
        } else {
            // Try finding by name (case-insensitive, partial match)
            destPort = ports.find(p => p.portName.toLowerCase().includes(destination.toLowerCase()));
        }

        if (!sourcePort || !destPort) {
            console.error(`Ports not found for source: ${source}, destination: ${destination}`);
            return NextResponse.json({ error: 'One or both ports not found' }, { status: 404 });
        }

        // Calculate Sea Route using local logic
        console.log(`[SeaRoute] Source: ${sourcePort.portName} (${sourcePort.latitude}, ${sourcePort.longitude})`);
        console.log(`[SeaRoute] Dest: ${destPort.portName} (${destPort.latitude}, ${destPort.longitude})`);

        // searoute expects [lon, lat] - local implementation expects Position
        const originCoords = [sourcePort.longitude, sourcePort.latitude];
        const destCoords = [destPort.longitude, destPort.latitude];

        console.log(`[SeaRoute] Calling local searoute with origin: ${originCoords}, dest: ${destCoords}`);

        const route = searoute(originCoords, destCoords);

        if (route && route.geometry && route.geometry.coordinates) {
            console.log(`[SeaRoute] Route found, distance: ${route.properties.length}`);
            const pathCoords = route.geometry.coordinates;

            const distance = route.properties.length;

            const response: RouteResponse = {
                origin: sourcePort,
                destination: destPort,
                path: pathCoords,
                distance: distance,
                units: 'nautical_miles'
            };

            return NextResponse.json(response);
        } else {
            console.warn('[SeaRoute] No route found by local logic');
            return NextResponse.json({ error: 'No route found' }, { status: 404 });
        }

    } catch (error: any) {
        console.error('Error calculating sea route:', error);
        console.error('Error stack:', error.stack);
        return NextResponse.json({ error: `Failed to calculate route: ${error.message}` }, { status: 500 });
    }
}
