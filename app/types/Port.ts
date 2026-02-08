export interface Port {
    regionName: string;
    latitude: number;
    portNumber: number;
    longitude: number;
    regionNumber: number;
    portName: string;
    countryCode: string;
}

export interface WorldPortsData {
    ports: Record<string, Port>;
}
