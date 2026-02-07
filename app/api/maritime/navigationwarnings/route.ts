import { NextResponse } from 'next/server';
import { NavigationWarning } from '../../../types/NavigationWarning';

export const runtime = 'nodejs';

const SOURCES = [
    { name: 'NAVAREA IV', url: 'https://msi.nga.mil/api/publications/download?type=view&key=16694640/SFH00000/DailyMemIV.txt' },
    { name: 'NAVAREA XII', url: 'https://msi.nga.mil/api/publications/download?type=view&key=16694640/SFH00000/DailyMemXII.txt' },
    { name: 'HYDROLANT', url: 'https://msi.nga.mil/api/publications/download?type=view&key=16694640/SFH00000/DailyMemLAN.txt' },
    { name: 'HYDROPAC', url: 'https://msi.nga.mil/api/publications/download?type=view&key=16694640/SFH00000/DailyMemPAC.txt' },
    { name: 'HYDROARC', url: 'https://msi.nga.mil/api/publications/download?type=view&key=16694640/SFH00000/DailyMemARC.txt' },
];

function parseCoordinate(coord: string): number | null {
    // Expected formats: 
    // 69-56.01N -> Decimal
    // 123-51.03W -> Decimal
    // DD-MM.mmX

    // Regex for: DD-MM.mmX or DDD-MM.mmX
    // Clean string first
    const clean = coord.trim().replace(/,/g, '');
    const regex = /^(\d{2,3})-(\d{2}(?:\.\d+)?)([NSWE])$/;
    const match = clean.match(regex);

    if (!match) return null;

    const degrees = parseFloat(match[1]);
    const minutes = parseFloat(match[2]);
    const direction = match[3];

    let decimal = degrees + (minutes / 60);

    if (direction === 'S' || direction === 'W') {
        decimal = -decimal;
    }

    return decimal;
}

function extractCoordinates(text: string): { latitude: number; longitude: number }[] {
    const coords: { latitude: number; longitude: number }[] = [];

    // Pattern to find pairs like "69-56.01N 123-51.03W"
    // Also handling potential line breaks or loose lists if mentioned, but strict pair is best for points.
    // However, area bounds might list them sequentially.
    // Strategy: Find all tokens that look like coordinates, then pair them up if they are adjacent or in sequence.

    // Regex for a single coordinate token: \d{2,3}-\d{2}(\.\d+)?[NSWE]
    const coordRegex = /\b\d{2,3}-\d{2}(?:\.\d+)?[NSWE]\b/g;
    const matches = text.match(coordRegex);

    if (!matches) return [];

    // Naive pairing: Lat usually followed by Long, or distinct N/S vs E/W.
    // NGA warnings typically list "LAT LONG" pairs.
    for (let i = 0; i < matches.length - 1; i += 2) {
        const latStr = matches[i];
        const longStr = matches[i + 1];

        // Simple check: first should be N/S, second E/W? Or just assume pairs.
        // Let's check potential direction.
        const isLat = /[NS]$/.test(latStr);
        const isLong = /[WE]$/.test(longStr);

        if (isLat && isLong) {
            const lat = parseCoordinate(latStr);
            const long = parseCoordinate(longStr);
            if (lat !== null && long !== null) {
                coords.push({ latitude: lat, longitude: long });
            }
        } else {
            // Misaligned? Try to recover? For now, strict pairing.
            // If we have N N E E, this logic fails. But "76-22.00N 021-55.00E" is standard.
            // If strictly alternates, we are good.
            // Adjust step if not consumed? No, loop increments by 2.
        }
    }

    return coords;
}

function parseWarningText(rawText: string, areaName: string): NavigationWarning | null {
    // 1. Extract Date-Time Group from the start.
    // Structure typically: 
    // 301809Z JAN 26
    // NAVAREA IV 123/26(GEN).

    const lines = rawText.trim().split('\n');
    if (lines.length < 2) return null;

    const datetime = lines[0].trim();

    // Extract Reference (usually 2nd line, e.g., "HYDROARC 21/26(GEN).")
    // Sometimes it might be split? Assuming line 2 for now.
    const reference = lines[1]?.trim().replace(/\.$/, '') || "Unknown Reference";

    // 2. Split into Preamble and Bullets
    // Look for the first line starting with "1."
    const firstBulletIndex = lines.findIndex(line => /^\s*1\./.test(line));

    let preamble: string[] = [];
    let bullets: string[] = [];

    if (firstBulletIndex === -1) {
        // No numbered lists, maybe everything is preamble (or just text)
        // User said: "Everything before the first numbered bullet point... split across an array"
        // If no bullets, put all in preamble? Or is it valid? 
        // Some short warnings might not have numbered points. 
        // Check user request: "For each notice you then ndeed to... take Everything before the first numbered bulelt point... separate subarray... bullet points."
        // We will assume if no bullets, all is preamble.
        preamble = lines.slice(1); // Skip date
    } else {
        preamble = lines.slice(1, firstBulletIndex);

        // Extract bullets
        // We need to group lines belonging to "1.", "2.", etc.
        const bulletSection = lines.slice(firstBulletIndex);
        let currentBullet = "";

        bulletSection.forEach(line => {
            if (/^\s*\d+\./.test(line)) {
                if (currentBullet) bullets.push(currentBullet.trim());
                currentBullet = line;
            } else {
                currentBullet += "\n" + line;
            }
        });
        if (currentBullet) bullets.push(currentBullet.trim());
    }

    // Clean up preamble and bullets arrays (trim)
    preamble = preamble.map(s => s.trim()).filter(s => s.length > 0);

    // 3. Extract Coordinates
    // User: "For each notice, if it contains coordinates, they should be extracted"
    const fullText = rawText; // Search everywhere
    const coordinates = extractCoordinates(fullText);

    // 4. Check for "BOUND BY"
    const isArea = /\bBOUND BY\b/i.test(fullText);

    // 5. Extract Subregion/Authority from preamble?
    // User: "preamble... contains other information like countries etc."
    // We can try to extract, but user didn't specify strict logic for assignment.
    // Often: Line 3 is region, Line 4 is country.
    // e.g.
    // HYDROARC 20/26(42,43).
    // BARENTS SEA.
    // NORWAY.
    // DNC 22.
    // 1. HAZARDOUS...

    let subregion = undefined;
    let authority = undefined;

    // Heuristic: If preamble has >= 2 lines, take 1st as subregion, 2nd as authority?
    // Skip the reference line (which we effectively took as line[1] in overall file, but in preamble array it might be index 0 or filtered out if we consider reference separate)
    // Actually, in `preamble` array:
    // If Reference was line 1 (0-indexed in lines slice), Preamble starts at line 1?
    // Wait, `lines` 0 is Date. 
    // `lines` 1 is Reference.
    // So `preamble` starts at line 1 (includes reference).
    // Let's refine: Remove Reference from Preamble?
    // User said "Everything before the first numbered bullet".
    // Reference is usually the first line after date.

    // Let's refine preamble parsing to meaningful fields if possible, or just keep as array strings.
    // We will leave subregion/authority extraction basic or just rely on preamble array for display.
    // I'll populate subregion from the line after reference if available.
    if (preamble.length > 1) {
        // Line 0 is Ref.
        subregion = preamble[1];
        if (preamble.length > 2) {
            authority = preamble[2];
        }
    }

    return {
        reference,
        datetime,
        text: rawText,
        preamble,
        bullets,
        coordinates,
        isArea,
        subregion,
        authority,
        areaName
    };
}

export async function GET() {
    try {
        const warnings: NavigationWarning[] = [];

        await Promise.all(SOURCES.map(async (source) => {
            const res = await fetch(source.url);
            if (!res.ok) {
                console.error(`Failed to fetch ${source.name}`);
                return;
            }
            const text = await res.text();

            // Split text by Date-Time Group
            // Regex: \d{6}Z [A-Z]{3} \d{2}
            // Often preceded by newlines. 
            // The file usually starts with a general header, then repeated blocks.
            // Blocks start with DateTime line.
            // We can split by `\n\n` then check pattern? No, some might have single newline.
            // Reliable split: look for the Date Line pattern.

            // Example:
            // ...
            // supplement to those approved services.
            //
            // 301809Z JAN 26
            // HYDROARC 21/26(GEN).

            // We can use a regex with lookahead or just `split` with capturing group if we want to keep delimiters, 
            // but standard split consumes delimiter.
            // Let's match all DateTime headers and their indices.

            const dateRegex = /(\d{6}Z [A-Z]{3} \d{2})/g;
            // We can split by this, but we need to keep the date.

            // Alternative: split, but the regex needs to identify the start of a message.
            // Let's use `text.split(dateRegex)`
            // This will return: [ "Header garbage", "301809Z JAN 26", "Rest of message...", "Next Date", "Rest..." ]

            const parts = text.split(dateRegex);

            // parts[0] is usually the file header/disclaimer. Skip it.
            // Then we have pairs: Date, Body.

            for (let i = 1; i < parts.length; i += 2) {
                const dateStr = parts[i];
                const bodyStr = parts[i + 1] || "";

                // Construct the full raw text for this block to extract other fields
                // Wait, logic `parseWarningText` expects date at top.
                const fullBlock = dateStr + bodyStr;

                const warning = parseWarningText(fullBlock, source.name);
                if (warning) {
                    warnings.push(warning);
                }
            }
        }));

        return NextResponse.json({ warnings });

    } catch (error) {
        console.error("Error fetching navigation warnings:", error);
        return NextResponse.json({ error: "Failed to fetch navigation warnings" }, { status: 500 });
    }
}
