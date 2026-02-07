
import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { MaritimeDisruption } from '@/app/types/maritime';

export async function GET() {
    try {
        const parser = new Parser({
            customFields: {
                item: [
                    ['georss:point', 'georssPoint'],
                ],
            },
        });

        const response = await fetch('https://incidentnews.noaa.gov/incidents.rss', {
            next: { revalidate: 300 } // Cache for 5 minutes
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
        }

        const xmlText = await response.text();
        const feed = await parser.parseString(xmlText);

        const disruptions: MaritimeDisruption[] = feed.items.map((item: any) => {
            let latitude: number | undefined;
            let longitude: number | undefined;
            let radius: number | undefined;

            if (item.georssPoint) {
                const parts = item.georssPoint.trim().split(' ');
                if (parts.length === 2) {
                    // georss:point is "lat long"
                    latitude = parseFloat(parts[0]);
                    longitude = parseFloat(parts[1]);

                    // Calculate radius based on significant figures
                    // "For more than 5, the radius should be 1. For 4, it should be 10, 3 should be 100, 2 should be 1000."
                    const countSigFigs = (n: string) => {
                        if (!n) return 0;
                        let str = n.replace('-', '').replace('.', ''); // Remove sign and decimal
                        // Remove leading zeros
                        str = str.replace(/^0+/, '');
                        return str.length;
                    };

                    const latSigFigs = countSigFigs(parts[0]);
                    const longSigFigs = countSigFigs(parts[1]);
                    // Use minimum precision to be conservative, or maybe just check both? 
                    // User said "number of significant figures given in the latitude and longitude data"
                    // I will take the minimum of the two to determine the "worst" precision, or average?
                    // Let's use the minimum sig figs to determine radius, as that limits precision.
                    const minSigFigs = Math.min(latSigFigs, longSigFigs);

                    if (minSigFigs > 5) radius = 1;
                    else if (minSigFigs === 5) radius = 1; // "More than 5" -> 1. What about exactly 5? usage implies high precision. Let's assume 5 is also 1 or maybe 4=10 covers it?
                    // "For 4, it should be 10"
                    // "3 should be 100"
                    // "2 should be 1000"
                    // The prompt didn't strictly say exactly what 5 is. "For more than 5... For 4..."
                    // I will assume 5 falls into high precision (radius 1) or maybe 10?
                    // Let's look at the pattern: 2->1000, 3->100, 4->10. Logic suggests 5->1.
                    else if (minSigFigs === 4) radius = 10;
                    else if (minSigFigs === 3) radius = 100;
                    else if (minSigFigs <= 2) radius = 1000;
                    else radius = 1000; // Default low precision
                }
            }

            return {
                title: item.title,
                link: item.link,
                description: item.contentSnippet || item.description,
                pubDate: item.pubDate,
                guid: item.guid,
                latitude,
                longitude,
                radius,
            };
        });

        return NextResponse.json({ disruptions });
    } catch (error) {
        console.error('Error fetching maritime disruptions:', error);
        return NextResponse.json({ error: 'Failed to fetch maritime data' }, { status: 500 });
    }
}
