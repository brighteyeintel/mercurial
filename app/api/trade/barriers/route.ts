import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const response = await fetch('https://data.api.trade.gov.uk/v1/datasets/market-barriers/versions/v1.0.10/data?format=json', {
            headers: {
                'Accept': 'application/json',
            },
            next: { revalidate: 3600 } // Revalidate every hour
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch trade barriers: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching trade barriers:', error);
        return NextResponse.json(
            { error: 'Failed to fetch trade barriers' },
            { status: 500 }
        );
    }
}
