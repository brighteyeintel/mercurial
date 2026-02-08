import { NextResponse } from 'next/server';
import { WaterIncident, WaterData } from '../../../types/WaterIncident';

export const dynamic = 'force-dynamic';

const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-GB,en;q=0.9',
};

/**
 * GET /api/utilities/water
 * Fetches water incident data from Yorkshire Water
 */
export async function GET() {
    try {
        const response = await fetch(
            'https://www.yorkshirewater.com/api/v2/Incidents',
            {
                next: { revalidate: 300 },
                headers: browserHeaders
            }
        );

        if (!response.ok) {
            console.error('Failed to fetch Yorkshire Water data:', response.status);
            return NextResponse.json({
                incidents: [],
                lastUpdated: new Date().toISOString(),
                count: 0,
                error: `Failed to fetch data: ${response.status}`
            }, { status: 500 });
        }

        const rawIncidents: WaterIncident[] = await response.json();

        // Deduplicate and filter valid incidents
        const seenRefs = new Set<string>();
        const incidents = rawIncidents.filter(i => {
            if (!i.incidentRef) return false;
            if (seenRefs.has(i.incidentRef)) return false;
            seenRefs.add(i.incidentRef);
            return true;
        });

        // sort by most recent dateTime
        incidents.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

        const data: WaterData = {
            incidents,
            lastUpdated: new Date().toISOString(),
            count: incidents.length
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching water data:', error);
        return NextResponse.json({
            incidents: [],
            lastUpdated: new Date().toISOString(),
            count: 0,
            error: 'Failed to fetch water data'
        }, { status: 500 });
    }
}
