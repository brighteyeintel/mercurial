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
    // New optional fields for enriched GDACS data
    alertLevel?: 'Green' | 'Orange' | 'Red';
    country?: string;
    eventType?: string;
    severity?: string;
    link?: string;
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
    "snow_ice",
    "earthquake",
    "flood",
    "drought",
    "volcano"
];

// Map GDACS event types to our tags
const GDACS_EVENT_TYPE_MAP: Record<string, string[]> = {
    'EQ': ['earthquake', 'coastal_event'],
    'TC': ['cyclone', 'wind', 'rain', 'coastal_event'],
    'FL': ['rain', 'flood', 'coastal_event'],
    'DR': ['extreme_high_temperature', 'drought'],
    'VO': ['volcano', 'fire_warning'],
    'WF': ['fire_warning', 'wind']
};

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

// Helper to extract text between XML tags
const extractTag = (xml: string, tag: string): string => {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
};

// Helper to extract attribute value from XML tag
const extractAttr = (xml: string, tag: string, attr: string): string => {
    const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : '';
};

// Parse GDACS RSS feed
async function fetchGDACSAlerts(): Promise<WeatherAlert[]> {
    try {
        const response = await fetch('https://gdacs.org/xml/rss.xml', {
            next: { revalidate: 300 } // Cache for 5 minutes
        });

        if (!response.ok) {
            console.error('Failed to fetch GDACS RSS:', response.status);
            return [];
        }

        const xmlText = await response.text();

        // Parse items from RSS
        const items: WeatherAlert[] = [];
        const itemMatches = xmlText.match(/<item>[\s\S]*?<\/item>/gi) || [];

        for (const itemXml of itemMatches) {
            try {
                const title = extractTag(itemXml, 'title');
                const description = extractTag(itemXml, 'description');
                const link = extractTag(itemXml, 'link').replace(/&amp;/g, '&');
                const guid = extractTag(itemXml, 'guid');

                // Extract coordinates
                const lat = parseFloat(extractTag(itemXml, 'geo:lat')) || 0;
                const lon = parseFloat(extractTag(itemXml, 'geo:long')) || 0;

                // Extract GDACS-specific fields
                const eventType = extractTag(itemXml, 'gdacs:eventtype');
                const alertLevel = extractTag(itemXml, 'gdacs:alertlevel') as 'Green' | 'Orange' | 'Red';
                const country = extractTag(itemXml, 'gdacs:country');
                const severity = extractTag(itemXml, 'gdacs:severity');
                const eventName = extractTag(itemXml, 'gdacs:eventname');

                // Parse dates
                const fromDateStr = extractTag(itemXml, 'gdacs:fromdate');
                const toDateStr = extractTag(itemXml, 'gdacs:todate');
                const fromDate = fromDateStr ? new Date(fromDateStr).getTime() / 1000 : Date.now() / 1000;
                const toDate = toDateStr ? new Date(toDateStr).getTime() / 1000 : fromDate + 86400 * 7; // Default 7 days duration

                // Determine radius based on event type and alert level
                let radiusKm = 200;
                if (eventType === 'TC') radiusKm = 500;
                else if (eventType === 'EQ') radiusKm = 150;
                else if (eventType === 'FL') radiusKm = 300;
                if (alertLevel === 'Red') radiusKm *= 1.5;
                else if (alertLevel === 'Orange') radiusKm *= 1.2;

                // Map event type to tags
                const tags = GDACS_EVENT_TYPE_MAP[eventType] || ['coastal_event'];

                // Build event name for display
                const eventDisplayName = eventName
                    ? `${eventType === 'TC' ? 'Tropical Cyclone' : eventType === 'EQ' ? 'Earthquake' : eventType === 'FL' ? 'Flood' : eventType === 'VO' ? 'Volcano' : eventType === 'DR' ? 'Drought' : 'Wild Fire'} ${eventName}`
                    : title.split(' in ')[0].replace(/^(Green|Orange|Red)\s+(earthquake|notification for tropical cyclone|flood|volcano|drought|wildfire)/i, '$2').trim();

                items.push({
                    id: guid || `gdacs-${eventType}-${Date.now()}-${Math.random()}`,
                    sender_name: `GDACS - ${country || 'Global'}`,
                    event: eventDisplayName,
                    start: fromDate,
                    end: toDate,
                    description: description,
                    tags: tags,
                    lat: lat,
                    lon: lon,
                    coordinates: generatePolygon(lat, lon, radiusKm),
                    alertLevel: alertLevel,
                    country: country,
                    eventType: eventType,
                    severity: severity,
                    link: link
                });
            } catch (parseError) {
                console.error('Error parsing GDACS item:', parseError);
            }
        }

        return items;
    } catch (error) {
        console.error('Error fetching GDACS alerts:', error);
        return [];
    }
}

export async function GET() {
    try {
        // Fetch real GDACS alerts
        const gdacsAlerts = await fetchGDACSAlerts();

        // Mock alerts as fallback/supplement for demonstration
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

        // Combine GDACS alerts with mock alerts, prioritizing real data
        // Only include mock alerts if no GDACS data is available
        const alerts = gdacsAlerts.length > 0
            ? [...gdacsAlerts]
            : mockAlerts;

        // Sort by alert level priority (Red > Orange > Green) then by start date
        const alertLevelPriority: Record<string, number> = { 'Red': 3, 'Orange': 2, 'Green': 1 };
        alerts.sort((a, b) => {
            const aPriority = alertLevelPriority[a.alertLevel || 'Green'] || 0;
            const bPriority = alertLevelPriority[b.alertLevel || 'Green'] || 0;
            if (bPriority !== aPriority) return bPriority - aPriority;
            return b.start - a.start;
        });

        return NextResponse.json({ alerts });

    } catch (error) {
        console.error("Error fetching weather alerts:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
