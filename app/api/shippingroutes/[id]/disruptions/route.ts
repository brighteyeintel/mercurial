import { dbConnect } from '../../../../lib/mongo';
import { ShippingRouteModel } from '../../../../models/ShippingRoute';
import { getRisksNearUserRoutesMap } from '../../../../lib/risk-analysis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/authOptions';

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

    const route = await ShippingRouteModel.findOne({
        _id: id,
        $or: [
            { user_email: email },
            { user_email: { $exists: false } },
            { user_email: null },
        ],
    }).lean();

    if (!route) {
        return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const routeIdToRisks = await getRisksNearUserRoutesMap(email);
    const risks = routeIdToRisks[id] || [];

    return Response.json({ routeId: id, risks });
}
