import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { WorldPortsData } from '../../../types/Port';

export async function GET() {
    try {
        // Construct the path to the JSON file
        const jsonDirectory = path.join(process.cwd(), 'app/api/maritime/portlocations');
        const fileContents = await fs.readFile(jsonDirectory + '/world-ports.json', 'utf8');

        // Parse the JSON data
        const data: WorldPortsData = JSON.parse(fileContents);

        // Return the data
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading world-ports.json:', error);
        return NextResponse.json({ error: 'Failed to load port data' }, { status: 500 });
    }
}
