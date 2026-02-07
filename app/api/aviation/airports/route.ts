
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'app', 'api', 'airport-data.txt');

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Data file not found' }, { status: 404 });
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n');

        const airports: any[] = [];
        const codes: string[] = [];

        lines.forEach(line => {
            if (!line.trim()) return;

            const parts = line.split(':');

            // Ensure we have enough parts (at least 16 based on inspection)
            if (parts.length < 16) return;

            const airport = {
                icao: parts[0],
                iata: parts[1],
                name: parts[2],
                city: parts[3],
                country: parts[4],
                latitude: parseFloat(parts[14]),
                longitude: parseFloat(parts[15]),
                altitude: parseInt(parts[13], 10),
            };

            // Exclude airports with 0,0 coordinates
            if (airport.latitude === 0 && airport.longitude === 0) return;

            if (airport.icao) {
                codes.push(airport.icao);
                airports.push(airport);
            }
        });

        return NextResponse.json({ codes, airports });
    } catch (error) {
        console.error('Error serving aviation data:', error);
        return NextResponse.json({ error: 'Failed to process aviation data' }, { status: 500 });
    }
}
