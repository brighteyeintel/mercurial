// Unified Power Outage type for all UK electricity providers
export interface PowerOutage {
    id: string;
    provider: 'ukpn' | 'nationalgrid' | 'northernpowergrid';
    providerName: string;
    type: 'planned' | 'unplanned' | 'unknown';
    status: 'active' | 'restored' | 'scheduled' | 'investigating';
    title: string;
    description?: string;
    lat: number;
    lon: number;
    postcodesAffected?: string[];
    customersAffected?: number;
    region?: string;
    createdAt: string;
    estimatedRestoration?: string;
    restoredAt?: string;
    reference?: string;
}

export interface ElectricityData {
    outages: PowerOutage[];
    lastUpdated: string;
    providers: {
        ukpn: { count: number; active: number };
        nationalgrid: { count: number; active: number };
        northernpowergrid: { count: number; active: number };
    };
}
