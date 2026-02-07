import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface Notam {
    id: string;
    latitude: number;
    longitude: number;
    language: string; // "en"
    type: string; // "OB"
    notamCode: string; // "N0107/26"
    title: string; // "Obstacle erected"
    rawIcao: string; // "EGXX/QOBCE/..."
    description: string; // HTML content
    validity: string; // "FROM: ... TO: ..."
    radius?: number;
    zoomMin?: number;
    color?: string;
}

export async function GET() {
    try {
        const response = await fetch('https://www.notaminfo.com/nationalmap', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            next: { revalidate: 300 } // Cache for 5 minutes
        });

        if (!response.ok) {
            console.error(`Failed to fetch NOTAMs: ${response.status} ${response.statusText}`);
            return NextResponse.json({ error: `Failed to fetch NOTAMs: ${response.status}` }, { status: 500 });
        }

        const text = await response.text();
        const notams: Notam[] = [];

        // Regex to find all notam() calls.
        // We match `notam(` literally, then capture everything until `);`
        // NOTE: This assumes `);` does not appear inside the arguments.
        // Given the sample, the description contains HTML and could contain ); but usually valid JS calls end on a new line or at least are distinct.
        // A safer way is to match `notam\(` and then assume the arguments are comma-separated values, but strings can contain commas.

        // The sample: notam("...", ..., "...", ...);
        // Let's try to match the whole function call.
        const regex = /notam\(([\s\S]*?)\);/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            try {
                const argsString = match[1];

                // Rudimentary CSV parser that respects quotes
                // We can't just split by comma because description contains commas.
                const args: string[] = [];
                let currentArg = '';
                let inQuote = false;

                for (let i = 0; i < argsString.length; i++) {
                    const char = argsString[i];

                    if (char === '"') {
                        inQuote = !inQuote;
                        // Don't include the quotes themselves for easier cleaning
                        continue;
                    }

                    if (char === ',' && !inQuote) {
                        args.push(currentArg.trim());
                        currentArg = '';
                    } else {
                        currentArg += char;
                    }
                }
                // Push the last arg
                args.push(currentArg.trim());

                if (args.length >= 10) {
                    notams.push({
                        id: args[0], // "2641444/0"
                        latitude: parseFloat(args[1]),
                        longitude: parseFloat(args[2]),
                        language: args[3], // "en"
                        type: args[4], // "OB"
                        notamCode: args[5], // "N0107/26..."
                        title: args[6], // "Obstacle erected"
                        rawIcao: args[7], // "EGXX/..."
                        description: args[8], // "THE FOLLOWING..."
                        validity: args[9], // "FROM: ... TO: ..."
                        radius: parseFloat(args[13] || '0'),
                        // args[10] = 0? args[11] = 9? args[12] = "O"? args[13] = 255 (radius?), args[14]=2, args[15]=1.00, args[16]="#0000FF", ...
                        // Based on typical map params, index 13 looks like a radius or size.
                    });
                }
            } catch (e) {
                console.error("Error parsing single NOTAM match", e);
            }
        }

        // Filter out invalid NOTAMs (e.g. placeholders or parsing errors)
        const validNotams = notams.filter(n => !isNaN(n.latitude) && !isNaN(n.longitude));

        return NextResponse.json({ notams: validNotams });

    } catch (error) {
        console.error("Error processing NOTAMs:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
