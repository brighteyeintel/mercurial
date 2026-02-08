/**
 * Geospatial utility functions for distance calculations
 */

/**
 * Calculates the great-circle distance between two points on Earth
 * using the Haversine formula.
 * 
 * @param lat1 - Latitude of the first point in decimal degrees
 * @param lon1 - Longitude of the first point in decimal degrees
 * @param lat2 - Latitude of the second point in decimal degrees
 * @param lon2 - Longitude of the second point in decimal degrees
 * @returns Distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  
  // Convert degrees to radians
  const toRad = (degrees: number) => degrees * (Math.PI / 180);
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

export interface Point {
  lat: number;
  lon: number;
}

export interface ClosestPointResult {
  distance: number;
  closestPoint: Point;
  index: number;
}

/**
 * Finds the closest point along a route to a given risk point.
 * 
 * @param routePoints - Array of points along the route
 * @param riskPoint - The risk point to compare against
 * @returns Object containing the minimum distance, closest point, and its index
 */
export function findClosestPointToRisk(
  routePoints: Point[],
  riskPoint: Point
): ClosestPointResult | null {
  if (routePoints.length === 0) {
    return null;
  }
  
  let minDistance = Infinity;
  let closestPoint = routePoints[0];
  let closestIndex = 0;
  
  for (let i = 0; i < routePoints.length; i++) {
    const point = routePoints[i];
    const distance = haversineDistance(
      point.lat,
      point.lon,
      riskPoint.lat,
      riskPoint.lon
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = point;
      closestIndex = i;
    }
  }
  
  return {
    distance: minDistance,
    closestPoint,
    index: closestIndex
  };
}

/**
 * Calculates distances from all route points to a risk point.
 * 
 * @param routePoints - Array of points along the route
 * @param riskPoint - The risk point to compare against
 * @returns Array of distances in kilometers (same order as routePoints)
 */
export function calculateAllDistancesToRisk(
  routePoints: Point[],
  riskPoint: Point
): number[] {
  return routePoints.map(point =>
    haversineDistance(point.lat, point.lon, riskPoint.lat, riskPoint.lon)
  );
}

/**
 * Checks if any point along a route is within a specified distance of a risk point.
 * 
 * @param routePoints - Array of points along the route
 * @param riskPoint - The risk point to check against
 * @param thresholdKm - Maximum distance threshold in kilometers
 * @returns True if any point is within the threshold distance
 */
export function isRouteNearRisk(
  routePoints: Point[],
  riskPoint: Point,
  thresholdKm: number
): boolean {
  return routePoints.some(point =>
    haversineDistance(point.lat, point.lon, riskPoint.lat, riskPoint.lon) <= thresholdKm
  );
}

/**
 * Finds all points along a route that are within a specified distance of a risk point.
 * 
 * @param routePoints - Array of points along the route
 * @param riskPoint - The risk point to check against
 * @param thresholdKm - Maximum distance threshold in kilometers
 * @returns Array of points with their distances and indices
 */
export function findPointsNearRisk(
  routePoints: Point[],
  riskPoint: Point,
  thresholdKm: number
): Array<{ point: Point; distance: number; index: number }> {
  return routePoints
    .map((point, index) => ({
      point,
      distance: haversineDistance(point.lat, point.lon, riskPoint.lat, riskPoint.lon),
      index
    }))
    .filter(result => result.distance <= thresholdKm);
}
