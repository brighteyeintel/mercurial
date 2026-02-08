import mongoose, { model, models, type Model } from 'mongoose';

import type { Stage } from '../types/ShippingRouteData';
import { TransportMode } from '../types/ShippingRouteData';

export interface ShippingRouteRecord {
  _id: mongoose.Types.ObjectId;
  user_email: string;
  name: string;
  goods_type: string;
  stages: Stage[];
  monitors: string[];
  feeds: string[];
}

const TransportSchema = new mongoose.Schema(
  {
    source: {
      name: { type: String, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      code: { type: String, required: false }
    },
    destination: {
      name: { type: String, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      code: { type: String, required: false }
    },
    mode: { type: String, required: true, enum: Object.values(TransportMode) },
    courier: { type: String, required: false },
    additional: { type: String, required: false },
  },
  { _id: false }
);

const HoldingSchema = new mongoose.Schema(
  {
    location: { type: String, required: true },
    duration: { type: String, required: false },
    additional: { type: String, required: false },
  },
  { _id: false }
);

const StageSchema = new mongoose.Schema(
  {
    transport: { type: TransportSchema, required: false },
    holding: { type: HoldingSchema, required: false },
  },
  { _id: false }
);

StageSchema.path('transport').validate(function (this: any) {
  const hasTransport = !!this.transport;
  const hasHolding = !!this.holding;
  return (hasTransport && !hasHolding) || (!hasTransport && hasHolding);
}, 'Stage must have exactly one of transport or holding');

const RouteSchema = new mongoose.Schema(
  {
    user_email: { type: String, required: true, index: true },
    name: { type: String, required: true },
    goods_type: { type: String, required: true },
    stages: { type: [StageSchema], default: [] },
    monitors: { type: [String], default: [] },
    feeds: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Force re-compilation of the model to ensuring schema updates specific to monitors/feeds are applied
// in development mode without requiring a server restart.
if (models.ShippingRoute) {
  delete models.ShippingRoute;
}

export const ShippingRouteModel: Model<ShippingRouteRecord> =
  model<ShippingRouteRecord>('ShippingRoute', RouteSchema, 'routes');

// Helpers

export async function createShippingRoute(data: {
  user_email: string;
  name: string;
  goods_type: string;
  stages?: ShippingRouteRecord['stages'];
  monitors?: string[];
  feeds?: string[];
}): Promise<ShippingRouteRecord> {
  const route = new ShippingRouteModel({
    user_email: data.user_email,
    name: data.name,
    goods_type: data.goods_type,
    stages: data.stages ?? [],
    monitors: data.monitors ?? [],
    feeds: data.feeds ?? [],
  });
  await route.save();
  return route;
}


export async function getShippingRoutes(): Promise<ShippingRouteRecord[] | null> {
  const routes = await ShippingRouteModel.find({});
  return routes;
}

export async function getShippingRoute(id: string): Promise<ShippingRouteRecord | null> {
  const route = await ShippingRouteModel.findById(id);
  return route;
}