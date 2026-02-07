export interface NavigationWarning {
    reference: string;
    datetime: string;
    text: string;
    preamble: string[];
    bullets: string[];
    coordinates: { latitude: number; longitude: number }[];
    isArea: boolean;
    subregion?: string;
    authority?: string;
    areaName?: string; // e.g. "NAVAREA IV", "HYDROLANT" based on source
}
