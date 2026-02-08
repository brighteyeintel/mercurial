import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { WorldPortsData, Port } from '../../../../types/Port';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ portnumber: string }> }
) {
    try {
        const { portnumber } = await params;

        // Construct the path to the JSON file
        // unique path strategy: go up 3 levels to get to 'api/maritime' then down to 'portlocations'
        // This assumes the file is in 'app/api/maritime/portlocations/world-ports.json'
        const jsonDirectory = path.join(process.cwd(), 'app/api/maritime/portlocations');
        const fileContents = await fs.readFile(jsonDirectory + '/world-ports.json', 'utf8');

        // Parse the JSON data
        const data: WorldPortsData = JSON.parse(fileContents);
        const ports = data.ports;

        // Find the port with the matching portNumber
        // The ports object keys are "PortName, Country" strings, so we map and find
        const targetPortNumber = parseInt(portnumber, 10);

        if (isNaN(targetPortNumber)) {
            return NextResponse.json({ error: 'Invalid port number' }, { status: 400 });
        }

        const foundPort = Object.values(ports).find((p: Port) => p.portNumber === targetPortNumber);

        if (!foundPort) {
            return NextResponse.json({ error: 'Port not found' }, { status: 404 });
        }

        return NextResponse.json({ port: foundPort });

    } catch (error) {
        console.error('Error fetching port data:', error);
        return NextResponse.json({ error: 'Failed to fetch port data' }, { status: 500 });
    }
}
