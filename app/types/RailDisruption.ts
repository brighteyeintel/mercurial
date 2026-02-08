export interface RailDisruption {
    id: string;
    title: string;
    status?: string;
    description?: string;
    operator?: string;
    affected?: string[];
    updatedAt?: string;
    link?: string;
    lat?: number;
    lon?: number;
    stationName?: string;
    crsCode?: string;
}