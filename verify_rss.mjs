
import Parser from 'rss-parser';

async function verify() {
    try {
        const parser = new Parser({
            customFields: {
                item: ['latitude', 'longitude', 'overallStart', 'overallEnd', 'category'],
            },
        });

        console.log("Fetching RSS feed...");
        const response = await fetch('https://m.highwaysengland.co.uk/feeds/rss/AllEvents.xml', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/rss+xml, application/xml, text/xml; q=0.1',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
        }

        const xmlText = await response.text();
        console.log("RSS Feed fetched. Length:", xmlText.length);

        const feed = await parser.parseString(xmlText);
        console.log("RSS Feed parsed. Items:", feed.items.length);

        if (feed.items.length > 0) {
            console.log("First item:", feed.items[0].title);
        }

    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verify();
