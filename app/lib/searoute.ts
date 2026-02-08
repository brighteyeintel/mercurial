
import { featureEach, coordEach } from '@turf/meta';
import { point, lineString } from '@turf/helpers';
import type { Feature, LineString, Point, Position } from 'geojson';
import length from '@turf/length';
import rhumbDistance from '@turf/rhumb-distance';
import pointToLineDistance from '@turf/point-to-line-distance';
// @ts-ignore
import PathFinder from 'geojson-path-finder';
import marnetData from './data/marnet.json';

const marnet = marnetData as any;
const pathFinder = new PathFinder(marnet);

interface RouteResult {
    type: 'Feature';
    properties: {
        units: string;
        length: number;
    };
    geometry: {
        type: 'LineString';
        coordinates: Position[];
    };
}

export function searoute(origin: Position, destination: Position, units: string = 'nautical_miles'): RouteResult | null {
    try {
        const snappedOrigin = snapToNetwork(origin);
        const snappedDestination = snapToNetwork(destination);

        const route = pathFinder.findPath(snappedOrigin, snappedDestination);

        if (!route) {
            console.warn("No route found by pathFinder");
            return null;
        }

        // PREPEND original origin and APPEND original destination to the path
        // to ensure it connects exactly to the requested points.
        const pathCoords = route.path;

        // Check if we need to add them (avoid duplicates if snapped point is identical, though unlikely with float precision)
        // Simple approach: just add them. Turf/GeoJSON line strings can have close points.
        const fullPath = [origin, ...pathCoords, destination];

        const routeLine = lineString(fullPath);

        // Calculate length based on units
        // turf length default is kilometers.
        // We want nautical miles largely.
        // searoute-js logic: units == 'nm' ? length(miles) * 1.15 : length(units)

        let routeLength: number;
        if (units === 'nautical_miles' || units === 'nm') {
            const miles = length(routeLine, { units: 'miles' });
            routeLength = miles * 0.868976; // Wait, 1 mile = 0.868976 nm. 
            // searoute-js used 1.15? 
            // 1 nm = 1.15 miles. So miles / 1.15 = nm.
            // searoute-js code: length(lineString, { units: 'miles' }) * 1.15078
            // That converts miles TO something bigger? 
            // If length is 100 miles. 115 something. 
            // 100 miles = 86.8 nm. 
            // 100 nm = 115 miles. 
            // So if turf returns miles, and we want nm. 
            // user wants generic logic from library.
            // library: length(lineString, { units: 'miles' }) * 1.15078
            // This looks like it converts miles to... KM approx? 1 mile = 1.6km.
            // Actually 1 nm = 1.852 km. 1 mile = 1.609 km.

            // Let's stick to standard turf conversions.
            // routeLength = length(routeLine, { units: 'nauticalmiles' });
            // checking turf types... usually degrees, radians, miles, kilometers. 
            // meters, millimeters, centimeters, kilometers, miles, nauticalmiles, inches, yards, feet, radians, degrees, hectares
            // 'nauticalmiles' no underscore in some versions?

            // Safe bet: calculate in km and convert.
            const km = length(routeLine, { units: 'kilometers' });
            routeLength = km / 1.852;
        } else {
            // @ts-ignore
            routeLength = length(routeLine, { units: units });
        }

        routeLine.properties = {
            units: units,
            length: routeLength
        };

        return routeLine as RouteResult;

    } catch (err) {
        console.error("Error in searoute logic:", err);
        throw err;
    }
}

function snapToNetwork(pt: Position): Feature<Point> {
    let nearestLineIndex = 0;
    let minDistance = Infinity;

    const ptFeature = point(pt);

    featureEach(marnet, function (feature, ftIndex) {
        const dist = pointToLineDistance(ptFeature, feature as Feature<LineString>, { units: 'kilometers' });
        if (dist < minDistance) {
            minDistance = dist;
            nearestLineIndex = ftIndex;
        }
    });

    let nearestVertexDist = Infinity;
    let nearestCoord: Position | null = null;

    //console.log(`Nearest line index: ${nearestLineIndex}, dist: ${minDistance}`);

    if (marnet.features[nearestLineIndex]) {
        coordEach(marnet.features[nearestLineIndex], function (currentCoord) {
            const distToVertex = rhumbDistance(ptFeature, point(currentCoord));

            if (distToVertex < nearestVertexDist) {
                nearestVertexDist = distToVertex;
                nearestCoord = currentCoord;
            }
        });
    }

    if (!nearestCoord) {
        // Fallback if something fails, use original point (though unlikely to connect)
        return ptFeature;
    }

    return point(nearestCoord);
}
