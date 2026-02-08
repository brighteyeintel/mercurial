import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RailDisruption {
    id: string;
    title: string;
    status?: string;
    description?: string;
    operator?: string;
    affected?: string[];
    updatedAt?: string;
    link?: string;
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
        
        const result = candidates.flatMap(item =>
            item.incidents.map((incident: any) => ({
                ...item,
                ...incident
            }))
        );
        return result.map((it: any, i: number) => normalizeDisruption(it, i));
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