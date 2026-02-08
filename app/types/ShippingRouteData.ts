export interface Location {
  name: string;
  latitude: number;
  longitude: number;
  code?: string;
}

export enum TransportMode {
  Flight = 'flight',
  Sea = 'sea',
  Road = 'road',
  Rail = 'rail',
}

export interface Transport {
  source: Location;
  destination: Location;
  mode: TransportMode;
  courier?: string;
  additional?: string;
}

export interface Holding {
  location: string;
  duration?: string;
  additional?: string;
}

export type Stage =
  | { transport: Transport; holding?: never }
  | { holding: Holding; transport?: never };

export class ShippingRouteData {
  name: string;
  stages: Stage[];
  goods_type: string;
  monitors: string[];
  feeds: string[];

  constructor(name: string, goods_type: string, stages: Stage[] = [], monitors: string[] = [], feeds: string[] = []) {
    this.name = name;
    this.goods_type = goods_type;
    this.stages = stages;
    this.monitors = monitors;
    this.feeds = feeds;
  }

  toJSON(): { name: string; goods_type: string; stages: Stage[]; monitors: string[]; feeds: string[] } {
    return {
      name: this.name,
      goods_type: this.goods_type,
      stages: this.stages,
      monitors: this.monitors,
      feeds: this.feeds,
    };
  }

  static fromJSON(json: any): ShippingRouteData {
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid JSON object');
    }

    const name = String(json.name || '');
    const goods_type = String(json.goods_type || '');
    const monitors = Array.isArray(json.monitors) ? json.monitors.map(String) : [];
    const feeds = Array.isArray(json.feeds) ? json.feeds.map(String) : [];
    const stages = Array.isArray(json.stages)
      ? json.stages.map((stage: any) => {
        if (stage.transport) {
          // Helper to safe parse location
          const parseLocation = (loc: any): Location => ({
            name: String(loc?.name || ''),
            latitude: Number(loc?.latitude || 0),
            longitude: Number(loc?.longitude || 0),
            code: loc?.code ? String(loc.code) : undefined
          });

          return {
            transport: {
              ...stage.transport,
              source: parseLocation(stage.transport.source),
              destination: parseLocation(stage.transport.destination),
              mode: stage.transport.mode as TransportMode,
            },
          };
        } else if (stage.holding) {
          return { holding: stage.holding };
        }
        return stage;
      })
      : [];

    return new ShippingRouteData(name, goods_type, stages, monitors, feeds);
  }
}
