import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

export const dynamic = 'force-dynamic';

const parser = new Parser({
    headers: {
        'User-Agent': 'Mercurial-Monitor/1.0 (+https://mercurial.app)',
    },
    timeout: 3000, // 3 seconds timeout per feed
});

const DEFAULT_FEEDS = [
    'https://splash247.com/feed/',
    'https://gcaptain.com/feed/',
    'https://www.seatrade-maritime.com/rss.xml',
    'https://www.paranoidcybersecurity.com/rss/breaches',
    'https://www.ncsc.gov.uk/api/1/services/v1/report-rss-feed.xml',
    'https://www.ncsc.gov.uk/api/1/services/v1/news-rss-feed.xml',
    'https://www.federalreserve.gov/feeds/press_all.xml',
    'https://feeds.bbci.co.uk/news/world/africa/rss.xml',
    'https://feeds.bbci.co.uk/news/world/asia/rss.xml',
    'https://feeds.bbci.co.uk/news/world/europe/rss.xml',
    'https://feeds.bbci.co.uk/news/world/latin_america/rss.xml',
    'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
    'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml',
    'https://feeds.bbci.co.uk/news/england/rss.xml',
    'https://feeds.bbci.co.uk/news/northern_ireland/rss.xml',
    'https://feeds.bbci.co.uk/news/scotland/rss.xml',
    'https://feeds.bbci.co.uk/news/wales/rss.xml',
    'https://www.investing.com/rss/news.rss',
    'https://economictimes.indiatimes.com/rssfeedsdefault.cms',
    'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/EnergyEnvironment.xml',
    'https://www.semafor.com/rss.xml'
];

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const monitors: string[] = Array.isArray((body as any).monitors)
            ? (body as any).monitors.map(String).filter((s: string) => s.trim().length > 0)
            : [];

        const userFeeds = Array.isArray((body as any).feeds)
            ? (body as any).feeds.map(String).filter((s: string) => s.trim().length > 0)
            : [];

        if (monitors.length === 0) {
            return NextResponse.json({ matches: [] }); // No monitors, no results
        }

        const allFeeds = Array.from(new Set([...DEFAULT_FEEDS, ...userFeeds]));

        // Execute feed fetches in parallel but fail fast for slow ones
        const feedPromises = allFeeds.map(async (url) => {
            try {
                // Wrap in additional timeout race to be absolutely sure
                const feedPromise = parser.parseURL(url);
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 3000)
                );

                const feed = await Promise.race([feedPromise, timeoutPromise]);

                return feed.items.map(item => ({
                    ...item,
                    source: feed.title || url,
                    sourceUrl: url
                }));
            } catch (error) {
                // Log only real errors, not timeouts to reduce noise if needed, or just log all
                if ((error as Error).message !== 'Timeout') {
                    console.error(`Failed to parse feed ${url}:`, (error as any).message || error);
                }
                return [];
            }
        });

        const results = await Promise.all(feedPromises);
        const allItems = results.flat();

        // Filter items
        const matches = allItems.filter(item => {
            const textToCheck = `${item.title || ''} ${item.content || ''} ${item.contentSnippet || ''}`.toLowerCase();
            return monitors.some(monitor => textToCheck.includes(monitor.toLowerCase()));
        });

        // Deduplicate matches based on link or title
        const uniqueMatches = Array.from(new Map(matches.map(item => [item.link || item.title, item])).values());

        // Sort by date (newest first)
        uniqueMatches.sort((a, b) => {
            const dateA = a.isoDate ? new Date(a.isoDate).getTime() : 0;
            const dateB = b.isoDate ? new Date(b.isoDate).getTime() : 0;
            return dateB - dateA;
        });

        return NextResponse.json({ matches: uniqueMatches.slice(0, 50) }); // Limit to top 50 matches

    } catch (error) {
        console.error('Error in monitoring route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
