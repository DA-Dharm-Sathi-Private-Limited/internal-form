import mongoose from 'mongoose';

const GrievanceSchema = new mongoose.Schema(
    {
        invoiceId: {
            type: String,
            required: true,
        },
        salespersonName: {
            type: String,
            required: true,
        },
        grievanceType: {
            type: String,
            required: true,
        },
        grievanceDescription: {
            type: String,
            required: true,
        }
    },
    { timestamps: true }
);

export default mongoose.models.Grievance || mongoose.model('Grievance', GrievanceSchema);
