'use server';

import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Grievance from '@/models/Grievance';

export async function submitGrievance(data: { salespersonName: string, orderId: string, grievanceType: string, explainIssue: string }) {
    try {
        const { salespersonName, orderId, grievanceType, explainIssue } = data;

        if (!salespersonName || !orderId || !grievanceType || !explainIssue) {
            return { success: false, error: 'All fields are required' };
        }

        await connectDB();

        // Validate the invoice number (only query orderId as requested)
        const order = await Order.findOne({ orderId: orderId.trim() });
        
        if (!order) {
            return { success: false, error: 'Invalid Order ID' };
        }

        // Store the grievance in new table
        await Grievance.create({
            invoiceId: orderId.trim(),
            salespersonName,
            grievanceType,
            grievanceDescription: explainIssue
        });

        // Change the order status of that invoice number to "RTO"
        await Order.updateOne(
            { _id: order._id },
            { $set: { status: 'RTO' } }
        );

        return { success: true };
    } catch (error: any) {
        console.error('Error submitting grievance:', error);
        return { success: false, error: error.message || 'Internal server error' };
    }
}
