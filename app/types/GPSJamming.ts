// GPS Jamming Point type for frontend rendering
export interface GPSJammingPoint {
    id: string;
    lat: number;
    lon: number;
    color: string;
    percentage: number;
    lowQualityCount: number;
    totalAircraftCount: number;
    timestamp: string;
    boundary: { lat: number; lon: number }[];
}

export interface GPSJammingData {
    points: GPSJammingPoint[];
    attribution: string;
    license?: string;
    lastUpdated?: string;
    totalCells?: number;
    affectedCells?: number;
}
