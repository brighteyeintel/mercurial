import { dbConnect } from '../../lib/mongo';
import { ShippingRouteModel } from '../../models/ShippingRoute';

export const runtime = 'nodejs';

export async function GET() {
  await dbConnect();
  const routes = await ShippingRouteModel.find({}).lean();
  return Response.json({ routes });
}

export async function POST(request: Request) {
  await dbConnect();

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const goods_type = String((body as any).goods_type ?? '').trim();
  const stages = Array.isArray((body as any).stages) ? (body as any).stages : [];

  if (!goods_type) {
    return Response.json({ error: 'goods_type is required' }, { status: 400 });
  }

  for (const stage of stages) {
    const hasTransport = !!stage?.transport;
    const hasHolding = !!stage?.holding;
    if ((hasTransport && hasHolding) || (!hasTransport && !hasHolding)) {
      return Response.json({ error: 'Each stage must have exactly one of transport or holding' }, { status: 400 });
    }
  }

  const created = await ShippingRouteModel.create({ goods_type, stages });
  return Response.json({ route: created.toObject() }, { status: 201 });
}
