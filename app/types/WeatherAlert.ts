export interface WeatherAlert {
    id: string; // sender_name + event + start + end hash or similar unique ID
    sender_name: string;
    event: string; // The alert event name (e.g., "Tornado Warning")
    start: number; // Unix timestamp
    end: number; // Unix timestamp
    description: string;
    tags: string[]; // specific tags like "Wind", "Rain"
    lat: number;   // Centroid latitude
    lon: number;   // Centroid longitude
    coordinates?: { latitude: number; longitude: number }[]; // For polygon representation
    // Optional enriched fields from GDACS
    alertLevel?: 'Green' | 'Orange' | 'Red';
    country?: string;
    eventType?: string;
    severity?: string;
    link?: string;
}
