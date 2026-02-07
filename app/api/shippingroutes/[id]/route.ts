import { dbConnect } from '../../../lib/mongo';
import { ShippingRouteModel } from '../../../models/ShippingRoute';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/authOptions';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_request: Request, { params }: Params) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const resolvedParams = await Promise.resolve(params);
    const id = String(resolvedParams?.id ?? '').trim();
    if (!id) {
        return Response.json({ error: 'id is required' }, { status: 400 });
    }

    const route = await ShippingRouteModel.findOne({ _id: id, user_email: email }).lean();
    if (!route) {
        return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json({ route });
}

export async function PUT(request: Request, { params }: Params) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const resolvedParams = await Promise.resolve(params);
    const id = String(resolvedParams?.id ?? '').trim();
    if (!id) {
        return Response.json({ error: 'id is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const name = String((body as any).name ?? '').trim();
    const goods_type = String((body as any).goods_type ?? '').trim();
    const stages = Array.isArray((body as any).stages) ? (body as any).stages : [];

    if (!name) {
        return Response.json({ error: 'name is required' }, { status: 400 });
    }

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

    const updated = await ShippingRouteModel.findOneAndUpdate(
        { _id: id, user_email: email },
        { $set: { name, goods_type, stages } },
        { new: true }
    ).lean();

    if (!updated) {
        return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json({ route: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const resolvedParams = await Promise.resolve(params);
    const id = String(resolvedParams?.id ?? '').trim();
    if (!id) {
        return Response.json({ error: 'id is required' }, { status: 400 });
    }

    const deleted = await ShippingRouteModel.findOneAndDelete({ _id: id, user_email: email }).lean();
    if (!deleted) {
        return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json({ ok: true });
}
