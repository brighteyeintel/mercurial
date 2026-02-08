import { dbConnect } from '../../../lib/mongo';
import { EventModel } from '../../../models/Event';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/authOptions';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const email = session?.user?.email;

        if (!email) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const events = await EventModel.find({ user_email: email })
            .sort({ createdAt: -1 })
            .lean();

        return Response.json({
            events
        });
    } catch (error) {
        console.error('Error in dashboard activity API:', error);
        return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
