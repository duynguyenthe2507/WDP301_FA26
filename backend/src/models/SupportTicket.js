import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const supportTicketSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', default: null },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    category: { type: String, enum: ['OPERATIONS', 'TECHNICAL', 'PAYOUT', 'VERIFICATION', 'ACCOUNT', 'OTHER'], required: true },
    subject: { type: String, required: true, maxlength: 160 },
    description: { type: String, required: true, maxlength: 4000 },
    attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },
    status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'WAITING_PARTNER', 'RESOLVED', 'ESCALATED'], default: 'PENDING', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    responses: { type: [responseSchema], default: [] },
    firstRespondedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model('SupportTicket', supportTicketSchema);
