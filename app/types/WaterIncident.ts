export interface WaterIncident {
    incidentRef: string;
    dateTime: string;
    postCode: string;
    longitude: number;
    latitude: number;
    areasAffected: string;
    location: string;
    servicesAffected: string;
    moreInfoUrl: string;
    moreInfoText: string;
    category: string;
    description: string;
    twitterTags: string;
    status: string;
    radiusDistance: number;
    majorIncidentUrl: string;
    lastUpdated: string;
    numberAffected: number;
    source: string;
}

export interface WaterData {
    incidents: WaterIncident[];
    lastUpdated: string;
    count: number;
}
