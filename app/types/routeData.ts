
export enum TransportMode {
    Flight = 'flight',
    Sea = 'sea',
    Road = 'road',
    Rail = 'rail'
}

export interface Transport {
    source: string;
    destination: string;
    mode: TransportMode;
    courier?: string; // Optional per schema
    additional?: string; // Optional per schema
}

export interface Holding {
    location: string;
    duration: string;
    additional?: string;
}

export type Stage =
    | { transport: Transport; holding?: never }
    | { holding: Holding; transport?: never };

export class RouteData {
    stages: Stage[];
    goods_type: string;

    constructor(goods_type: string, stages: Stage[] = []) {
        this.goods_type = goods_type;
        this.stages = stages;
    }

    /**
     * Explicitly controls the serialization process.
     * Ensures only the expected properties are included in the JSON output.
     */
    toJSON(): { goods_type: string; stages: Stage[] } {
        return {
            goods_type: this.goods_type,
            stages: this.stages
        };
    }

    /**
     * Creates a Route instance from a plain object, ensuring types.
     * Useful for deserialization.
     */
    static fromJSON(json: any): RouteData {
        if (!json || typeof json !== 'object') {
            throw new Error('Invalid JSON object');
        }

        const goods_type = String(json.goods_type || '');
        const stages = Array.isArray(json.stages) ? json.stages.map((stage: any) => {
            // Simple validation could be added here
            if (stage.transport) {
                // Ensure mode is a valid enum value if possible, or cast
                // Simply casting here for now, could add validation logic
                return { transport: { ...stage.transport, mode: stage.transport.mode as TransportMode } };
            } else if (stage.holding) {
                return { holding: stage.holding };
            }
            return stage;
        }) : [];

        return new RouteData(goods_type, stages);
    }
}
