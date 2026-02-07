export interface Port {
    regionName: string;
    xcoord: number;
    portNumber: number;
    ycoord: number;
    regionNumber: number;
    portName: string;
    countryCode: string;
}

export interface WorldPortsData {
    ports: Record<string, Port>;
}
