
import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

export const dynamic = 'force-dynamic';

interface TrafficEvent {
    title: string;
    description: string;
    link: string;
    guid: string;
    pubDate: string;
    category: string;
    latitude: number;
    longitude: number;
    overallStart?: string;
    overallEnd?: string;
}

export async function GET() {
    try {
        const parser = new Parser({
            customFields: {
                item: ['latitude', 'longitude', 'overallStart', 'overallEnd', 'category'],
            },
        });

        const response = await fetch('https://m.highwaysengland.co.uk/feeds/rss/AllEvents.xml', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/rss+xml, application/xml, text/xml; q=0.1',
            },
            next: { revalidate: 300 } // Cache for 5 minutes
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
        }

        const xmlText = await response.text();
        const feed = await parser.parseString(xmlText);

        const events: TrafficEvent[] = feed.items.map((item: any) => ({
            title: item.title,
            description: item.description,
            link: item.link,
            guid: item.guid,
            pubDate: item.pubDate,
            category: item.category, // e.g., "Road Works"
            latitude: parseFloat(item.latitude),
            longitude: parseFloat(item.longitude),
            overallStart: item.overallStart,
            overallEnd: item.overallEnd,
        })).filter((event) => !isNaN(event.latitude) && !isNaN(event.longitude));

        return NextResponse.json({ events });
    } catch (error) {
        console.error('Error fetching traffic data:', error);
        return NextResponse.json({ error: 'Failed to fetch traffic data' }, { status: 500 });
    }
}
