import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

export async function GET(request: NextRequest) {
    try {
        await connectDB();
        
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q');
        const type = searchParams.get('type'); // 'orderId', 'customer', 'astrologer'

        if (!query || query.trim() === '') {
            return NextResponse.json({ success: true, orders: [] }, { status: 200 });
        }

        const safeQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape regex characters
        
        let filter = {};

        switch (type) {
            case 'orderId':
                // Search exact or partial orderId
                filter = { orderId: { $regex: `^${safeQuery}`, $options: 'i' } };
                break;
            case 'customer':
                filter = { 'customerDetails.customer_name': { $regex: `^${safeQuery}`, $options: 'i' } };
                break;
            case 'astrologer':
                filter = { 'astrologerDetails.astrologerName': { $regex: `^${safeQuery}`, $options: 'i' } };
                break;
            default:
                return NextResponse.json({ success: false, error: 'Invalid search type' }, { status: 400 });
        }

        // Limit results to prevent massive payloads if someone searches "A"
        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .limit(50);
            
        return NextResponse.json({ success: true, orders }, { status: 200 });
    } catch (error: unknown) {
        console.error('Error searching orders:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
