export enum TransportMode {
  Flight = 'flight',
  Sea = 'sea',
  Road = 'road',
  Rail = 'rail',
}

export interface Transport {
  source: string;
  destination: string;
  mode: TransportMode;
  courier?: string;
  additional?: string;
}

export interface Holding {
  location: string;
  duration: string;
  additional?: string;
}

export type Stage =
  | { transport: Transport; holding?: never }
  | { holding: Holding; transport?: never };

export class ShippingRouteData {
  stages: Stage[];
  goods_type: string;

  constructor(goods_type: string, stages: Stage[] = []) {
    this.goods_type = goods_type;
    this.stages = stages;
  }

  toJSON(): { goods_type: string; stages: Stage[] } {
    return {
      goods_type: this.goods_type,
      stages: this.stages,
    };
  }

  static fromJSON(json: any): ShippingRouteData {
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid JSON object');
    }

    const goods_type = String(json.goods_type || '');
    const stages = Array.isArray(json.stages)
      ? json.stages.map((stage: any) => {
          if (stage.transport) {
            return {
              transport: {
                ...stage.transport,
                mode: stage.transport.mode as TransportMode,
              },
            };
          } else if (stage.holding) {
            return { holding: stage.holding };
          }
          return stage;
        })
      : [];

    return new ShippingRouteData(goods_type, stages);
  }
}
