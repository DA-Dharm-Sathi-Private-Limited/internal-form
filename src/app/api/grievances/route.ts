import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Grievance from '@/models/Grievance';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '5', 10);

        const skip = (page - 1) * limit;

        const [grievances, total] = await Promise.all([
            Grievance.find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Grievance.countDocuments()
        ]);

        return NextResponse.json({
            success: true,
            grievances,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching grievances:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch grievances' },
            { status: 500 }
        );
    }
}
