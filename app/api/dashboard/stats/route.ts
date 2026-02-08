import { dbConnect } from '../../../lib/mongo';
import { ShippingRouteModel } from '../../../models/ShippingRoute';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/authOptions';
import { countRisksNearUserRoutes } from '../../../lib/risk-analysis';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const email = session?.user?.email;

        if (!email) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // 1. Number of routes saved by a user
        const savedRoutesCount = await ShippingRouteModel.countDocuments({ user_email: email });

        // 2. Number of risks within 20km of any user route
        const risksNearRoutes = await countRisksNearUserRoutes(email, 20);

        // 3. fixed integer 10
        const fixedTen = 10;

        return Response.json({
            savedRoutesCount,
            risksNearRoutes,
            fixedTen
        });
    } catch (error) {
        console.error('Error in dashboard stats API:', error);
        return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
