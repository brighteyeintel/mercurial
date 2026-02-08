/**
 * Risk analysis utilities for calculating proximity of shipping routes to risk points
 */

import { haversineDistance, type Point } from './geospatial';
import { dbConnect } from './mongo';
import { ShippingRouteModel, type ShippingRouteRecord } from '../models/ShippingRoute';
import type { WeatherAlert } from '../types/WeatherAlert';
import type { NavigationWarning } from '../types/NavigationWarning';
import type { Notam } from '../types/Notam';
import { decode } from '@googlemaps/polyline-codec';
import { TransportMode, type Stage, type Transport } from '../types/ShippingRouteData';

/**
 * Normalized risk point with coordinates
 */
export interface RiskPoint {
  id: string;
  lat: number;
  lon: number;
  type: 'weather' | 'navigation' | 'notam' | 'traffic' | 'jamming' | 'train-disruption';
  category?: string;
  severity?: number;
}

/**
 * Fetches road route with intermediate points from Google Maps API
 */
async function fetchRoadRoutePoints(
  origin: { lat: number; lon: number } | string,
  destination: { lat: number; lon: number } | string
): Promise<Point[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // Convert from {lat, lon} to {lat, lng} format for Google Maps API
    let formattedOrigin: { lat: number; lng: number } | string;
    let formattedDest: { lat: number; lng: number } | string;
    
    if (typeof origin === 'object') {
      // Check for invalid 0,0 coordinates
      if (origin.lat === 0 && origin.lon === 0) {
        return [];
      }
      formattedOrigin = { lat: origin.lat, lng: origin.lon };
    } else {
      formattedOrigin = origin;
    }
    
    if (typeof destination === 'object') {
      // Check for invalid 0,0 coordinates
      if (destination.lat === 0 && destination.lon === 0) {
        return [];
      }
      formattedDest = { lat: destination.lat, lng: destination.lon };
    } else {
      formattedDest = destination;
    }
    
    const response = await fetch(`${baseUrl}/api/roads/navigation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: formattedOrigin, destination: formattedDest }),
    });

    if (!response.ok) {
      console.error('[Risk Analysis] Failed to fetch road route:', response.status);
      return [];
    }

    const data = await response.json();

    if (data.polyline) {
      const decoded = decode(data.polyline) as [number, number][];
      // Convert from [lat, lng] to Point format
      return decoded.map(([lat, lon]) => ({ lat, lon }));
    }
  } catch (error) {
    console.error('[Risk Analysis] Error fetching road route:', error);
  }
  return [];
}

/**
 * Fetches rail route with intermediate points
 */
async function fetchRailRoutePoints(
  origin: string,
  destination: string
): Promise<Point[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/rail/navigation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination }),
    });

    if (!response.ok) {
      console.error('Failed to fetch rail route:', response.status);
      return [];
    }

    const data = await response.json();

    if (data.polyline) {
      const decoded = decode(data.polyline) as [number, number][];
      return decoded.map(([lat, lon]) => ({ lat, lon }));
    }
  } catch (error) {
    console.error('Error fetching rail route:', error);
  }
  return [];
}

/**
 * Fetches sea route with intermediate points
 */
async function fetchSeaRoutePoints(
  origin: string,
  destination: string
): Promise<Point[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(
      `${baseUrl}/api/maritime/navigation?source=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
    );

    if (!response.ok) {
      console.error('Failed to fetch sea route:', response.status);
      return [];
    }

    const data = await response.json();

    if (data.path && Array.isArray(data.path)) {
      // API returns GeoJSON [lon, lat], convert to Point {lat, lon}
      return data.path.map((p: [number, number]) => ({ lat: p[1], lon: p[0] }));
    }
  } catch (error) {
    console.error('Error fetching sea route:', error);
  }
  return [];
}

/**
 * Generates flight route with bezier curve approximation
 */
function generateFlightRoutePoints(
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number }
): Point[] {
  const points: Point[] = [];
  const steps = 50; // Resolution of the curve

  const p0 = origin;
  const p2 = destination;

  // Calculate midpoint
  const midLat = (p0.lat + p2.lat) / 2;
  const midLon = (p0.lon + p2.lon) / 2;

  // Calculate control point for arc
  const dist = Math.sqrt(
    Math.pow(p2.lat - p0.lat, 2) + Math.pow(p2.lon - p0.lon, 2)
  );
  const curvature = 0.2;
  const direction = midLat >= 0 ? 1 : -1;

  const p1 = {
    lat: midLat + dist * curvature * direction,
    lon: midLon,
  };

  // Generate bezier curve points
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat =
      Math.pow(1 - t, 2) * p0.lat +
      2 * (1 - t) * t * p1.lat +
      Math.pow(t, 2) * p2.lat;
    const lon =
      Math.pow(1 - t, 2) * p0.lon +
      2 * (1 - t) * t * p1.lon +
      Math.pow(t, 2) * p2.lon;
    points.push({ lat, lon });
  }

  return points;
}

/**
 * Extracts route points including intermediate waypoints from routing APIs
 * Now async to fetch detailed paths for each transport stage
 */
async function extractStagePoints(stage: Stage): Promise<Point[]> {
  if (!stage.transport) {
    return [];
  }
  
  const transport = stage.transport;
  let stagePoints: Point[] = [];
  
  try {
    switch (transport.mode) {
      case TransportMode.Road: {
        const origin = { lat: transport.source.latitude, lon: transport.source.longitude };
        const destination = { lat: transport.destination.latitude, lon: transport.destination.longitude };
        
        // Check if we have valid coordinates
        const hasOriginCoords = origin.lat !== 0 || origin.lon !== 0;
        const hasDestCoords = destination.lat !== 0 || destination.lon !== 0;
        
        if (hasOriginCoords && hasDestCoords) {
          stagePoints = await fetchRoadRoutePoints(origin, destination);
        } else if (transport.source.name && transport.destination.name) {
          stagePoints = await fetchRoadRoutePoints(transport.source.name, transport.destination.name);
        }
        break;
      }
      
      case TransportMode.Rail: {
        if (transport.source.name && transport.destination.name) {
          stagePoints = await fetchRailRoutePoints(transport.source.name, transport.destination.name);
        }
        break;
      }
      
      case TransportMode.Sea: {
        // Sea routes use port codes or names
        const origin = transport.source.code || transport.source.name;
        const destination = transport.destination.code || transport.destination.name;
        
        if (origin && destination) {
          stagePoints = await fetchSeaRoutePoints(origin, destination);
        }
        break;
      }
      
      case TransportMode.Flight: {
        const origin = { lat: transport.source.latitude, lon: transport.source.longitude };
        const destination = { lat: transport.destination.latitude, lon: transport.destination.longitude };
        stagePoints = generateFlightRoutePoints(origin, destination);
        break;
      }
    }
  } catch (error) {
    console.error(`[Risk Analysis] Error fetching route for ${transport.mode} stage:`, error);
  }
  
  // Fallback: if API failed, use start and end points only
  if (stagePoints.length === 0) {
    stagePoints = [
      { lat: transport.source.latitude, lon: transport.source.longitude },
      { lat: transport.destination.latitude, lon: transport.destination.longitude }
    ];
  }
  
  return stagePoints;
}

/**
 * Extracts route points including intermediate waypoints from routing APIs
 */
async function extractRoutePoints(route: ShippingRouteRecord): Promise<Point[]> {
  const allPoints: Point[] = [];
  
  for (const stage of route.stages) {
    const stagePoints = await extractStagePoints(stage);
    allPoints.push(...stagePoints);
  }
  
  console.log(`[Risk Analysis] Route "${route.name}" has ${allPoints.length} points extracted (including intermediate waypoints)`);
  
  return allPoints;
}

/**
 * Fetches all active weather alerts from the API
 */
async function fetchWeatherAlerts(): Promise<RiskPoint[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/weather/alerts`, {
      next: { revalidate: 300 } // Cache for 5 minutes
    } as any);
    
    if (!response.ok) {
      console.error('Failed to fetch weather alerts:', response.status);
      return [];
    }
    
    const data = await response.json();
    const alerts: WeatherAlert[] = data.alerts || [];
    
    return alerts.map(alert => ({
      id: alert.id,
      lat: alert.lat,
      lon: alert.lon,
      type: 'weather' as const
    }));
  } catch (error) {
    console.error('Error fetching weather alerts:', error);
    return [];
  }
}

/**
 * Fetches all navigation warnings from the API
 */
async function fetchNavigationWarnings(): Promise<RiskPoint[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/maritime/navigationwarnings`, {
      next: { revalidate: 300 } // Cache for 5 minutes
    } as any);
    
    if (!response.ok) {
      console.error('Failed to fetch navigation warnings:', response.status);
      return [];
    }
    
    const data = await response.json();
    const warnings: NavigationWarning[] = data.warnings || [];
    
    // Extract all coordinate points from warnings
    const riskPoints: RiskPoint[] = [];
    for (const warning of warnings) {
      if (warning.coordinates && warning.coordinates.length > 0) {
        // Use the first coordinate as the primary risk point
        // Could also use centroid if needed
        riskPoints.push({
          id: warning.reference,
          lat: warning.coordinates[0].latitude,
          lon: warning.coordinates[0].longitude,
          type: 'navigation' as const
        });
      }
    }
    
    return riskPoints;
  } catch (error) {
    console.error('Error fetching navigation warnings:', error);
    return [];
  }
}

/**
 * Fetches all NOTAMs from the API
 */
async function fetchNotams(): Promise<RiskPoint[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/aviation/notams`, {
      next: { revalidate: 300 } // Cache for 5 minutes
    } as any);
    
    if (!response.ok) {
      console.error('Failed to fetch NOTAMs:', response.status);
      return [];
    }
    
    const data = await response.json();
    const notams: Notam[] = data.notams || [];
    
    return notams.map(notam => ({
      id: notam.id,
      lat: notam.latitude,
      lon: notam.longitude,
      type: 'notam' as const
    }));
  } catch (error) {
    console.error('Error fetching NOTAMs:', error);
    return [];
  }
}

/**
 * Fetches all traffic alerts from the API
 */
async function fetchTrafficAlerts(): Promise<RiskPoint[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/roads/traffic`, {
      next: { revalidate: 300 } // Cache for 5 minutes
    } as any);
    
    if (!response.ok) {
      console.error('Failed to fetch traffic alerts:', response.status);
      return [];
    }
    
    const data = await response.json();
    const events: any[] = data.events || [];
    
    return events.map(event => ({
      id: event.guid || event.title,
      lat: event.latitude,
      lon: event.longitude,
      type: 'traffic' as const,
      category: event.category
    }));
  } catch (error) {
    console.error('Error fetching traffic alerts:', error);
    return [];
  }
}

/**
 * Fetches all GPS jamming data from the API
 */
async function fetchJammingRisks(): Promise<RiskPoint[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/aviation/gps`, {
      next: { revalidate: 300 } // Cache for 5 minutes
    } as any);
    
    if (!response.ok) {
      console.error('Failed to fetch GPS jamming data:', response.status);
      return [];
    }
    
    const data = await response.json();
    const points: any[] = data.points || [];
    
    return points.map(p => ({
      id: `jamming-${p.id}`,
      lat: p.lat,
      lon: p.lon,
      type: 'jamming' as const,
      severity: p.percentage
    }));
  } catch (error) {
    console.error('Error fetching GPS jamming data:', error);
    return [];
  }
}

/**
 * Fetches all train disruptions from the API
 */
async function fetchTrainDisruptionRisks(): Promise<RiskPoint[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/rail/disruption`, {
      next: { revalidate: 300 } // Cache for 5 minutes
    } as any);
    
    if (!response.ok) {
      console.error('Failed to fetch train disruptions:', response.status);
      return [];
    }
    
    const data = await response.json();
    const points: any[] = data.disruptions || [];

    console.log(points);
    
    return points.map(p => ({
      id: `train-disruption-${p.id}`,
      lat: p.lat,
      lon: p.lon,
      type: 'train-disruption' as const,
      severity: p.severity
    }));
  } catch (error) {
    console.error('Error fetching train disruptions:', error);
    return [];
  }
}

/**
 * Fetches all active risks from all sources
 */
export async function fetchAllRisks(): Promise<RiskPoint[]> {
  const [weatherAlerts, navigationWarnings, notams, trafficAlerts, jammingRisks, trainDisruptions] = await Promise.all([
    fetchWeatherAlerts(),
    fetchNavigationWarnings(),
    fetchNotams(),
    fetchTrafficAlerts(),
    fetchJammingRisks(),
    fetchTrainDisruptionRisks()
  ]);
  
  return [...weatherAlerts, ...navigationWarnings, ...notams, ...trafficAlerts, ...jammingRisks, ...trainDisruptions];
}

/**
 * Checks if a route comes within the threshold distance of a risk point.
 * Uses optimization: checks start and end points first before checking all points.
 * 
 * @param routePoints - All points along the route
 * @param riskPoint - The risk point to check against
 * @param thresholdKm - Distance threshold in kilometers
 * @returns True if any point on the route is within threshold distance
 */
function isRouteNearRisk(
  routePoints: Point[],
  riskPoint: RiskPoint,
  thresholdKm: number
): boolean {
  if (routePoints.length === 0) {
    return false;
  }
  
  // Optimization: Check endpoints first
  // Only skip if both endpoints are farther than double the route length
  const startPoint = routePoints[0];
  const endPoint = routePoints[routePoints.length - 1];
  
  const startDistance = haversineDistance(
    startPoint.lat,
    startPoint.lon,
    riskPoint.lat,
    riskPoint.lon
  );
  
  const endDistance = haversineDistance(
    endPoint.lat,
    endPoint.lon,
    riskPoint.lat,
    riskPoint.lon
  );
  
  // Calculate the distance between start and end points
  const routeLength = haversineDistance(
    startPoint.lat,
    startPoint.lon,
    endPoint.lat,
    endPoint.lon
  );
  
  // Early exit: if both endpoints are farther than 2x the route length, skip this route
  // This is geometrically sound - if both ends are very far away relative to the route,
  // the risk point cannot be close to any point along the route
  const earlyExitThreshold = routeLength * 2;
  if (startDistance > earlyExitThreshold && endDistance > earlyExitThreshold) {
    return false;
  }
  
  // If either endpoint is close enough, check if within actual threshold
  if (startDistance <= thresholdKm || endDistance <= thresholdKm) {
    return true;
  }
  
  // Check all intermediate points and track minimum distance
  let minDistance = Math.min(startDistance, endDistance);
  for (const point of routePoints) {
    const distance = haversineDistance(
      point.lat,
      point.lon,
      riskPoint.lat,
      riskPoint.lon
    );
    
    if (distance < minDistance) {
      minDistance = distance;
    }
    
    if (distance <= thresholdKm) {
      // console.log(`[Risk Analysis] Risk ${riskPoint.id} within threshold at intermediate point (${distance.toFixed(1)}km)`);
      return true;
    }
  }

  return false;
}

// Simple server-side cache for risk counts
const cache: Record<string, { value: number; timestamp: number }> = {};
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Builds a map of route ID -> nearby risks, applying mode-specific rules.
 *
 * @param userEmail - Email of the user whose routes to check
 * @param thresholdKm - Base distance threshold in kilometers (default: 20)
 * @returns Map of route ID -> list of nearby RiskPoints
 */
export async function getRisksNearUserRoutesMap(
  userEmail: string,
  thresholdKm: number = 20
): Promise<Record<string, RiskPoint[]>> {
  // Fetch user's routes
  await dbConnect();
  const routes = await ShippingRouteModel.find({
    $or: [
      { user_email: userEmail },
      { user_email: { $exists: false } },
      { user_email: null }
    ]
  }).lean();

  console.log(`[Risk Analysis] Found ${routes.length} routes for user`);

  if (routes.length === 0) {
    return {};
  }

  // Fetch all active risks
  const risks = await fetchAllRisks();

  console.log(`[Risk Analysis] Found ${risks.length} total risks (weather: ${risks.filter(r => r.type === 'weather').length}, nav: ${risks.filter(r => r.type === 'navigation').length}, notams: ${risks.filter(r => r.type === 'notam').length})`);

  if (risks.length === 0) {
    return {};
  }

  const routeIdToRisks: Record<string, RiskPoint[]> = {};

  for (const route of routes) {
    const routeId = String((route as any)._id ?? (route as any).id ?? route.name);
    const routeRiskIds = new Set<string>();

    for (const stage of route.stages) {
      if (!stage.transport) continue;

      const mode = stage.transport.mode;

      // Define mode-specific thresholds and allowed risk types
      let stageThresholdKm = thresholdKm;
      let allowedRiskTypes: RiskPoint['type'][] = [];

      switch (mode) {
        case TransportMode.Road:
          stageThresholdKm = thresholdKm;
          allowedRiskTypes = ['traffic', 'weather'];
          break;
        case TransportMode.Rail:
          stageThresholdKm = thresholdKm;
          allowedRiskTypes = ['weather', 'train-disruption'];
          break;
        case TransportMode.Sea:
          stageThresholdKm = 100;
          allowedRiskTypes = ['navigation'];
          break;
        case TransportMode.Flight:
          stageThresholdKm = 100;
          allowedRiskTypes = ['notam', 'jamming'];
          break;
      }

      const stagePoints = await extractStagePoints(stage);
      let jammingRiskFoundInStage = false;

      for (const risk of risks) {
        // Skip if already counted for this route or not relevant for this mode
        if (routeRiskIds.has(risk.id)) continue;
        if (!allowedRiskTypes.includes(risk.type)) continue;

        // Special filtering for traffic risks on road stages
        if (mode === TransportMode.Road && risk.type === 'traffic') {
          const category = risk.category || '';
          const isAllowedCategory = category === 'Accidents' || category === 'Congestion' || category === 'Other';
          if (!isAllowedCategory) continue;
        }

        // Special rule for GPS jamming on flight stages
        if (mode === TransportMode.Flight && risk.type === 'jamming') {
          // Requirement: Only flag maximum one risk per flight stage, only if severity > 50%
          if (jammingRiskFoundInStage) continue;
          if ((risk.severity || 0) <= 50) continue;
        }

        const isNear = isRouteNearRisk(stagePoints, risk, stageThresholdKm);
        if (isNear) {
          routeRiskIds.add(risk.id);
          if (!routeIdToRisks[routeId]) routeIdToRisks[routeId] = [];
          routeIdToRisks[routeId].push(risk);

          if (risk.type === 'jamming') {
            jammingRiskFoundInStage = true;
          }

          console.log(`[Risk Analysis] ✓ Route ${routeId} Stage ${mode}: Risk "${risk.id}" (${risk.type}${risk.category ? ` - ${risk.category}` : ''}${risk.severity ? ` - ${risk.severity}%` : ''}) is within ${stageThresholdKm}km of route "${route.name}"`);
        }
      }
    }
  }

  return routeIdToRisks;
}

/**
 * Counts the number of unique risks within a specified distance of any user route.
 * 
 * @param userEmail - Email of the user whose routes to check
 * @param thresholdKm - Distance threshold in kilometers (default: 20)
 * @returns Number of unique risks within threshold distance
 */
export async function countRisksNearUserRoutes(
  userEmail: string,
  thresholdKm: number = 20
): Promise<number> {
  const cacheKey = `${userEmail}-${thresholdKm}`;
  const now = Date.now();
  
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL_MS) {
    console.log(`[Risk Analysis] Returning cached result for user ${userEmail}: ${cache[cacheKey].value}`);
    return cache[cacheKey].value;
  }

  try {
    const routeIdToRisks = await getRisksNearUserRoutesMap(userEmail, thresholdKm);

    const uniqueRiskIds = new Set<string>();
    for (const risks of Object.values(routeIdToRisks)) {
      for (const risk of risks) {
        uniqueRiskIds.add(risk.id);
      }
    }

    console.log(`[Risk Analysis] Total risks within threshold: ${uniqueRiskIds.size}`);
    
    // Update cache
    cache[cacheKey] = { value: uniqueRiskIds.size, timestamp: Date.now() };
    
    return uniqueRiskIds.size;
  } catch (error) {
    console.error('Error counting risks near user routes:', error);
    return 0;
  }
}
/**
 * Counts the number of unique routes with at least one risk.
 * 
 * @param userEmail - Email of the user whose routes to check
 * @param thresholdKm - Distance threshold in kilometers (default: 20)
 * @returns Number of unique routes with at least one risk
 */
export async function countRoutesAtRisk(
  userEmail: string,
  thresholdKm: number = 20
): Promise<number> {
  const cacheKey = `routes-at-risk-${userEmail}-${thresholdKm}`;
  const now = Date.now();
  
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL_MS) {
    console.log(`[Risk Analysis] Returning cached result for routes at risk: ${cache[cacheKey].value}`);
    return cache[cacheKey].value;
  }

  try {
    const routeIdToRisks = await getRisksNearUserRoutesMap(userEmail, thresholdKm);
    const routesWithRisksCount = Object.keys(routeIdToRisks).length;

    console.log(`[Risk Analysis] Total routes with risks: ${routesWithRisksCount}`);
    
    // Update cache
    cache[cacheKey] = { value: routesWithRisksCount, timestamp: Date.now() };
    
    return routesWithRisksCount;
  } catch (error) {
    console.error('Error counting routes at risk:', error);
    return 0;
  }
}
