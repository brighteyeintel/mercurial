import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ReactNode } from "react";

export interface TrafficEvent {
    title: string;
    description: string;
    link: string;
    guid: string;
    pubDate: string;
    category: string;
    latitude: number;
    longitude: number;
    overallStart?: string;
    overallEnd?: string;
    radius?: number;
}

export interface MapProps {
    children?: ReactNode;
}

const MapComponent = ({ children }: MapProps) => {
    return (
        <MapContainer
            center={[51.505, -0.09]} // Default center (London)
            zoom={13}
            scrollWheelZoom={true}
            className="h-[calc(100vh-64px)] w-full z-0" // Subtract navbar height (64px)
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                className="map-tiles-dark"
            />
            {children}
        </MapContainer>
    );
};

export default MapComponent;
