import { NextResponse } from 'next/server';
import https from 'https';
import { PowerOutage, ElectricityData } from '../../../types/PowerOutage';

export const dynamic = 'force-dynamic';

// HTTPS agent that bypasses certificate verification for problematic endpoints
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

// Common browser-like headers
const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-GB,en;q=0.9',
};

/**
 * Fetch with insecure SSL (for endpoints with certificate issues)
 */
async function fetchInsecure(url: string): Promise<any> {
    return new Promise((resolve) => {
        https.get(url, {
            agent: insecureAgent,
            headers: browserHeaders
        }, (res) => {
            if (res.statusCode !== 200) {
                resolve(null);
                return;
            }
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    resolve(null);
                }
            });
        }).on('error', (err) => {
            console.log(`HTTPS request failed for ${url}:`, err.message);
            resolve(null);
        });
    });
}

/**
 * Fetch UK Power Networks data
 * https://ukpowernetworks.opendatasoft.com/api/explore/v2.1/catalog/datasets/ukpn-live-faults/records
 */
async function fetchUKPowerNetworks(): Promise<PowerOutage[]> {
    try {
        const response = await fetch(
            'https://ukpowernetworks.opendatasoft.com/api/explore/v2.1/catalog/datasets/ukpn-live-faults/records?limit=100',
            { next: { revalidate: 300 } }
        );

        if (!response.ok) return [];

        const data = await response.json();

        return (data.results || []).map((item: any): PowerOutage => ({
            id: `ukpn-${item.incidentreference}`,
            provider: 'ukpn',
            providerName: 'UK Power Networks',
            type: item.powercuttype?.toLowerCase() === 'planned' ? 'planned' : 'unplanned',
            status: item.restoreddatetime ? 'restored' : (item.statusid === 1 ? 'investigating' : 'active'),
            title: item.incidentcategorycustomerfriendlydescription || `Power outage in ${item.operatingzone || 'Unknown area'}`,
            description: item.mainmessage || item.incidentdescription,
            lat: item.geopoint?.lat || 0,
            lon: item.geopoint?.lon || 0,
            postcodesAffected: item.fullpostcodedata?.split(';').filter(Boolean) || [],
            customersAffected: item.nocustomeraffected || 0,
            region: item.operatingzone,
            createdAt: item.creationdatetime || item.receiveddate,
            estimatedRestoration: item.estimatedrestorationdate,
            restoredAt: item.restoreddatetime,
            reference: item.incidentreference
        })).filter((o: PowerOutage) => o.lat !== 0 && o.lon !== 0);
    } catch (error) {
        console.error('Error fetching UK Power Networks:', error);
        return [];
    }
}




/**
 * Fetch National Grid data
 * New API: https://connecteddata.nationalgrid.co.uk/api/3/action/datastore_search?resource_id=a1365982-4e05-463c-8304-8323a2ba0ccd
 */
async function fetchNationalGrid(): Promise<PowerOutage[]> {
    try {
        const response = await fetch(
            'https://connecteddata.nationalgrid.co.uk/api/3/action/datastore_search?resource_id=a1365982-4e05-463c-8304-8323a2ba0ccd&limit=1000',
            {
                next: { revalidate: 300 },
                headers: browserHeaders
            }
        );

        if (!response.ok) return [];

        const data = await response.json();

        if (!data.success || !data.result || !data.result.records) return [];

        return data.result.records.map((item: any): PowerOutage | null => {
            const lat = item.location_latitude;
            const lon = item.location_longitude;

            if (!lat || !lon) return null;

            // Determine status based on API fields
            let status: 'active' | 'restored' | 'scheduled' | 'investigating' = 'active';
            if (item.status === 'Restored' || (item.restored > 0 && item.confirmed_off === 0)) {
                status = 'restored';
            } else if (item.status === 'In Progress') {
                status = 'active'; // Default to active for In Progress
            }

            // Determine type
            const isPlanned = item.planned === 'true' || item.planned === true;

            return {
                id: `ng-${item.fault_id}`,
                provider: 'nationalgrid',
                providerName: 'National Grid',
                type: isPlanned ? 'planned' : 'unplanned',
                status: status,
                title: item.category || `Power outage in ${item.licence_area || 'Unknown area'}`,
                description: item.planned_outage_reason || `Fault category: ${item.category}`,
                lat: parseFloat(lat),
                lon: parseFloat(lon),
                postcodesAffected: item.postcode ? item.postcode.split(',').map((p: string) => p.trim()) : [],
                customersAffected: item.confirmed_off || 0,
                region: item.licence_area,
                createdAt: item.date_of_reported_fault || new Date().toISOString(),
                estimatedRestoration: item.etr,
                restoredAt: item.date_of_restoration || (status === 'restored' ? item.last_updated : undefined),
                reference: item.fault_id
            };
        }).filter((o: PowerOutage | null): o is PowerOutage => o !== null);

    } catch (error) {
        console.error('Error fetching National Grid:', error);
        return [];
    }
}

/**
 * Fetch Northern Power Grid data
 * https://power.northernpowergrid.com/Powercut_API/rest/powercuts/getall
 */
async function fetchNorthernPowerGrid(): Promise<PowerOutage[]> {
    try {
        // Try with insecure SSL first as this endpoint may have certificate issues
        let data = await fetchInsecure('https://power.northernpowergrid.com/Powercut_API/rest/powercuts/getall');

        if (!data) {
            // Fallback to regular fetch
            const response = await fetch(
                'https://power.northernpowergrid.com/Powercut_API/rest/powercuts/getall',
                { next: { revalidate: 300 } }
            );
            if (!response.ok) return [];
            data = await response.json();
        }


        const incidents = data.powercuts || data.Powercuts || data || [];

        // Northern Powergrid returns an array where each object is a postcode level entry, not unique incidents.
        // We need to group them by IncidentID/Reference to avoid duplicates in the main list, OR treat them as individual points if they have distinct coordinates.
        // The sample shows different postcodes/coordinates for the same Reference. 
        // Let's create a unique ID based on Reference + Lat + Lng to show all affected locations, or group them.
        // Given the desired map visualization, showing all points is probably better, but we need unique IDs.

        return incidents.map((item: any, index: number): PowerOutage | null => {
            const lat = item.Lat || item.Latitude;
            const lon = item.Lng || item.Longitude;

            if (!lat || !lon) return null;

            // Use a composite ID to ensure uniqueness for different locations of the same incident
            const uniqueId = `npg-${item.Reference}-${index}`;

            return {
                id: uniqueId,
                provider: 'northernpowergrid',
                providerName: 'Northern Power Grid',
                type: 'unplanned', // Default to unplanned as per sample data implication (Reason mentions "unexpected problem")
                status: 'active', // Default to active as sample implies current incidents
                title: item.NatureOfOutage || `Power outage in ${item.Area || 'Unknown area'}`,
                description: item.Reason || item.CustomerStageSequenceMessage,
                lat: parseFloat(lat),
                lon: parseFloat(lon),
                postcodesAffected: item.Postcode ? [item.Postcode.trim()] : [],
                customersAffected: item.TotalConfirmedPowercut || 0,
                region: item.Area,
                createdAt: item.LoggedTime || item.InsertDate || new Date().toISOString(),
                estimatedRestoration: item.EstimatedTimeTillResolution || item.EtrEndRange,
                reference: item.Reference
            };
        }).filter((o: PowerOutage | null): o is PowerOutage => o !== null);

    } catch (error) {
        console.error('Error fetching Northern Power Grid:', error);
        return [];
    }
}

/**
 * GET /api/utilities/electricity
 * Fetches and federates electricity outage data from all UK providers
 */
export async function GET() {
    try {
        // Fetch from all providers in parallel
        const [ukpnOutages, ngOutages, npgOutages] = await Promise.all([
            fetchUKPowerNetworks(),
            fetchNationalGrid(),
            fetchNorthernPowerGrid()
        ]);

        // Combine all outages and deduplicate by ID
        const allOutagesRaw: PowerOutage[] = [...ukpnOutages, ...ngOutages, ...npgOutages];

        // Deduplicate by ID - keep the first occurrence
        const seenIds = new Map<string, PowerOutage>();
        for (const outage of allOutagesRaw) {
            if (!seenIds.has(outage.id)) {
                seenIds.set(outage.id, outage);
            }
        }
        const allOutages = Array.from(seenIds.values());

        // Sort by creation date (newest first)
        allOutages.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const response: ElectricityData = {
            outages: allOutages,
            lastUpdated: new Date().toISOString(),
            providers: {
                ukpn: {
                    count: ukpnOutages.length,
                    active: ukpnOutages.filter(o => o.status === 'active' || o.status === 'investigating').length
                },
                nationalgrid: {
                    count: ngOutages.length,
                    active: ngOutages.filter(o => o.status === 'active').length
                },
                northernpowergrid: {
                    count: npgOutages.length,
                    active: npgOutages.filter(o => o.status === 'active').length
                }
            }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching electricity data:', error);
        return NextResponse.json({
            outages: [],
            lastUpdated: new Date().toISOString(),
            providers: {
                ukpn: { count: 0, active: 0 },
                nationalgrid: { count: 0, active: 0 },
                northernpowergrid: { count: 0, active: 0 }
            },
            error: 'Failed to fetch electricity data'
        }, { status: 500 });
    }
}
