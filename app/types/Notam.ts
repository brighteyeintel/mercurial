export interface Notam {
    id: string;
    latitude: number;
    longitude: number;
    language: string; // "en"
    type: string; // "OB"
    notamCode: string; // "N0107/26"
    title: string; // "Obstacle erected"
    rawIcao: string; // "EGXX/QOBCE/..."
    description: string; // HTML content
    validity: string; // "FROM: ... TO: ..."
    // Additional fields from the notam() call that might be useful
    radius?: number;
    zoomMin?: number;
    color?: string;
}
