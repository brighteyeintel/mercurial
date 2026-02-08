import { NextResponse } from 'next/server';
import { cellToLatLng, cellToBoundary } from 'h3-js';
import https from 'https';

export const dynamic = 'force-dynamic';

interface GPSJammingRaw {
    h3Index: string;
    timestamp: string;
    granularity: string;
    lowQualityCount: number;
    totalAircraftCount: number;
}

interface GPSJammingDataResponse {
    license: string;
    license_url: string;
    attribution: string;
    data: GPSJammingRaw[];
}

export interface GPSJammingPoint {
    id: string;
    lat: number;
    lon: number;
    color: string;
    percentage: number;
    lowQualityCount: number;
    totalAircraftCount: number;
    timestamp: string;
    // Hexagon boundary for polygon rendering
    boundary: { lat: number; lon: number }[];
}

/**
 * Determines hex color based on jamming percentage
 * 0% = green, up to 20% = orange, 30% = red, 50%+ = black
 */
function getJammingColor(percentage: number): string {
    if (percentage === 0) return '#22c55e'; // green-500
    if (percentage < 20) return '#f97316'; // orange-500
    if (percentage < 30) return '#ef4444'; // red-500
    if (percentage < 50) return '#dc2626'; // red-600
    return '#000000'; // black
}

/**
 * Custom fetch that bypasses SSL certificate verification
 * Stanford's server has an incomplete certificate chain
 */
function fetchWithInsecureSSL(url: string): Promise<GPSJammingDataResponse | null> {
    return new Promise((resolve) => {
        const agent = new https.Agent({ rejectUnauthorized: false });

        https.get(url, { agent }, (res) => {
            if (res.statusCode !== 200) {
                resolve(null);
                return;
            }

            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    resolve(null);
                }
            });
        }).on('error', (err) => {
            console.log(`HTTPS request failed for ${url}:`, err.message);
            resolve(null);
        });
    });
}

/**
 * Fetches GPS jamming heatmap data from Stanford WAAS NAS
 * Returns processed data with coordinates and colors for frontend rendering
 */
export async function GET() {
    try {
        // Build URLs for 2 and 3 days ago (data may have processing delay)
        const today = new Date();
        const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
        const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);

        const formatDate = (d: Date) => ({
            year: d.getUTCFullYear(),
            month: String(d.getUTCMonth() + 1).padStart(2, '0'),
            day: String(d.getUTCDate()).padStart(2, '0')
        });

        const d2 = formatDate(twoDaysAgo);
        const d3 = formatDate(threeDaysAgo);

        // Try 2 days ago first, then 3 days ago if not available
        const urls = [
            `https://waas-nas.stanford.edu/data/jamming/${d2.year}/${d2.month}/${d2.day}/heatmap.json`,
            `https://waas-nas.stanford.edu/data/jamming/${d3.year}/${d3.month}/${d3.day}/heatmap.json`
        ];



        let rawData: GPSJammingDataResponse | null = null;

        for (const url of urls) {
            rawData = await fetchWithInsecureSSL(url);
            if (rawData) break;
        }

        if (!rawData || !rawData.data) {
            return NextResponse.json({
                points: [],
                attribution: 'Data from rfi.stanford.edu, Stanford GPS Laboratory',
                error: 'No data available'
            });
        }

        // Process data: convert H3 indexes to coordinates and calculate colors
        const points: GPSJammingPoint[] = rawData.data
            .filter(item => item.totalAircraftCount > 0) // Only include cells with aircraft
            .map(item => {
                // Convert H3 index to lat/lng center point
                const [lat, lon] = cellToLatLng(item.h3Index);

                // Get hexagon boundary for polygon rendering
                const boundaryCoords = cellToBoundary(item.h3Index);
                const boundary = boundaryCoords.map(([bLat, bLon]) => ({
                    lat: bLat,
                    lon: bLon
                }));

                // Calculate jamming percentage
                const percentage = item.totalAircraftCount > 0
                    ? (item.lowQualityCount / item.totalAircraftCount) * 100
                    : 0;

                return {
                    id: item.h3Index,
                    lat: lat,
                    lon: lon,
                    color: getJammingColor(percentage),
                    percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
                    lowQualityCount: item.lowQualityCount,
                    totalAircraftCount: item.totalAircraftCount,
                    timestamp: item.timestamp,
                    boundary
                };
            });

        // Sort by percentage descending (worst jamming first)
        points.sort((a, b) => b.percentage - a.percentage);

        return NextResponse.json({
            points,
            attribution: rawData.attribution || 'Data from rfi.stanford.edu, Stanford GPS Laboratory',
            license: rawData.license,
            lastUpdated: new Date().toISOString(),
            totalCells: points.length,
            affectedCells: points.filter(p => p.percentage > 0).length
        });

    } catch (error) {
        console.error('Error fetching GPS jamming data:', error);
        return NextResponse.json({ error: 'Failed to fetch GPS jamming data' }, { status: 500 });
    }
}
