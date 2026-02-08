import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { RailDisruption } from '../types/RailDisruption';

interface StationRecord {
    stationName: string;
    stationNameLower: string;
    lat: number;
    lon: number;
    crsCode?: string;
}

let stationsCache: StationRecord[] | null = null;
let stationsCachePromise: Promise<StationRecord[]> | null = null;

async function loadStations(): Promise<StationRecord[]> {
    if (stationsCache) return stationsCache;
    if (stationsCachePromise) return stationsCachePromise;

    stationsCachePromise = (async () => {
        const stationsPath = path.join(process.cwd(), 'app', 'api', 'rail', 'stations.csv');
        const raw = await readFile(stationsPath, 'utf8');
        const lines = raw.split(/\r?\n/).filter(Boolean);
        if (lines.length <= 1) return [];

        // Header: stationName,lat,long,crsCode,...
        const out: StationRecord[] = [];
        for (const line of lines.slice(1)) {
            const parts = line.split(',');
            const stationName = (parts[0] ?? '').trim();
            const lat = parseFloat((parts[1] ?? '').trim());
            const lon = parseFloat((parts[2] ?? '').trim());
            const crsCode = (parts[3] ?? '').trim() || undefined;

            if (!stationName || Number.isNaN(lat) || Number.isNaN(lon)) continue;
            out.push({
                stationName,
                stationNameLower: stationName.toLowerCase(),
                lat,
                lon,
                crsCode,
            });
        }

        // Prefer longer names first so e.g. "King's Cross" isn't swallowed by "Cross"
        out.sort((a, b) => b.stationNameLower.length - a.stationNameLower.length);

        stationsCache = out;
        stationsCachePromise = null;
        return out;
    })().catch((e) => {
        stationsCachePromise = null;
        console.error('Failed to load stations.csv:', e);
        return [];
    });

    return stationsCachePromise;
}

function isWordChar(ch: string | undefined): boolean {
    if (!ch) return false;
    return /[a-z0-9]/i.test(ch);
}

function containsStation(textLower: string, stationLower: string): boolean {
    // Fast substring search with a simple word-boundary-ish check at edges.
    let idx = textLower.indexOf(stationLower);
    while (idx !== -1) {
        const before = idx > 0 ? textLower[idx - 1] : undefined;
        const after = idx + stationLower.length < textLower.length ? textLower[idx + stationLower.length] : undefined;

        // If we're in the middle of an alphanumeric token, skip (reduces false positives).
        if (!isWordChar(before) && !isWordChar(after)) {
            return true;
        }
        idx = textLower.indexOf(stationLower, idx + 1);
    }
    return false;
}

async function expandWithStations(disruptions: RailDisruption[]): Promise<RailDisruption[]> {
    const stations = await loadStations();
    if (stations.length === 0) return disruptions;

    const expanded: RailDisruption[] = [];
    for (const d of disruptions) {
        const blob = `${d.title ?? ''} ${d.description ?? ''} ${d.operator ?? ''} ${(d.affected ?? []).join(' ')}`.toLowerCase();
        const matched: StationRecord[] = [];

        for (const s of stations) {
            if (containsStation(blob, s.stationNameLower)) {
                matched.push(s);
            }
        }

        if (matched.length === 0) {
            expanded.push(d);
            continue;
        }

        // Emit one disruption per matched station.
        for (const s of matched) {
            expanded.push({
                ...d,
                id: `${d.id}-${s.crsCode ?? s.stationNameLower.replace(/\s+/g, '-')}`,
                lat: s.lat,
                lon: s.lon,
                stationName: s.stationName,
                crsCode: s.crsCode,
            });
        }
    }

    return expanded;
}

function asString(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return undefined;
}

function normalizeDisruption(item: any, idx: number): RailDisruption {
    const id =
        asString(item?.id) ||
        asString(item?.uuid) ||
        asString(item?.slug) ||
        asString(item?.key) ||
        `trainline-${idx}`;

    const title =
        asString(item?.title) ||
        asString(item?.headline) ||
        asString(item?.summary) ||
        asString(item?.message) ||
        'Rail disruption';

    const affectedRaw = item?.affected || item?.affectedLines || item?.lines || item?.operators;
    const affected = Array.isArray(affectedRaw)
        ? (affectedRaw
            .map((v: any) => asString(v?.name ?? v))
            .filter(Boolean) as string[])
        : undefined;

    return {
        id,
        title,
        status: asString(item?.status) || asString(item?.severity) || asString(item?.level),
        description: asString(item?.description) || asString(item?.details) || asString(item?.body),
        operator: asString(item?.operator) || asString(item?.company) || asString(item?.network),
        affected,
        updatedAt:
            asString(item?.updatedAt) ||
            asString(item?.updated_at) ||
            asString(item?.lastUpdated) ||
            asString(item?.timestamp),
        link: asString(item?.url) || asString(item?.link),
    };
}

async function fetchTrainlineDisruptions(): Promise<RailDisruption[]> {
    const url = 'https://www.thetrainline.com/en/help/api/railway-status';

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'mercurial/1.0 (+https://example.invalid)',
                'Accept': 'application/json,text/plain,*/*',
            },
            next: { revalidate: 300 },
        });

        if (!response.ok) {
            console.error('Trainline status fetch failed:', response.status);
            return [];
        }

        const data: any = await response.json().catch(() => null);
        if (!data || typeof data !== 'object') {
            return [];
        }

        const candidates =
            (Array.isArray(data?.disruptions) && data.disruptions) ||
            (Array.isArray(data?.items) && data.items) ||
            (Array.isArray(data?.messages) && data.messages) ||
            (Array.isArray(data?.data) && data.data) ||
            (Array.isArray(data) && data) ||
            [];

        if (!Array.isArray(candidates)) {
            return [];
        }

        const flattened = candidates.flatMap((item: any) => {
            const incidents = Array.isArray(item?.incidents) ? item.incidents : [];
            if (incidents.length === 0) return [item];
            return incidents.map((incident: any) => ({
                ...item,
                ...incident,
            }));
        });

        const normalized = flattened.map((it: any, i: number) => normalizeDisruption(it, i));
        const result = await expandWithStations(normalized);
        return result;
    } catch (error) {
        console.error('Error fetching Trainline railway status:', error);
        return [];
    }
}

export async function GET() {
    const disruptions = await fetchTrainlineDisruptions();

    const fallback: RailDisruption[] = [
        {
            id: 'mock-rail-1',
            title: 'Rail status unavailable',
            status: 'unknown',
            description: 'Live railway status could not be fetched from Trainline at this time.',
        },
    ];

    return NextResponse.json({ disruptions: disruptions.length > 0 ? disruptions : fallback });
}