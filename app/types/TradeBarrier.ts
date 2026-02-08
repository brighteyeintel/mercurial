export interface TradeBarrier {
    id: string;
    title: string;
    summary: string;
    is_resolved: boolean;
    status_date: string;
    country_or_territory: {
        name: string;
        trading_bloc: {
            code: string;
            name: string;
            short_name: string;
            overseas_regions: {
                name: string;
                id: string;
            }[];
        } | null;
    };
    caused_by_trading_bloc: boolean | null;
    location: string;
    sectors: {
        name: string;
    }[];
    last_published_on: string;
    reported_on: string;
}

export interface TradeBarriersResponse {
    barriers: TradeBarrier[];
}
