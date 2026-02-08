import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET() {
    try {
        const jsonDirectory = path.join(process.cwd(), 'app/api/trade/countries');
        const fileContents = await fs.readFile(jsonDirectory + '/countries.geojson', 'utf8');
        const data = JSON.parse(fileContents);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error serving country GeoJSON:', error);
        return NextResponse.json(
            { error: 'Failed to fetch country data' },
            { status: 500 }
        );
    }
}
