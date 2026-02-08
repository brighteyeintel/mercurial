import { getServerSession } from 'next-auth/next';

import { authOptions } from '../../lib/authOptions';
import { dbConnect } from '../../lib/mongo';
import { EventModel } from '../../models/Event';

export const runtime = 'nodejs';

export async function GET() {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const events = await EventModel.find({ user_email: email })
        .sort({ createdAt: -1 })
        .lean();

    return Response.json({ events });
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const route_id = String((body as any).route_id ?? '').trim();
    const action = String((body as any).action ?? '').trim();

    if (!route_id) {
        return Response.json({ error: 'route_id is required' }, { status: 400 });
    }

    if (!action) {
        return Response.json({ error: 'action is required' }, { status: 400 });
    }

    const created = await EventModel.create({ user_email: email, route_id, action });
    return Response.json({ event: created.toObject() }, { status: 201 });
}
