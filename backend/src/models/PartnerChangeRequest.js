import mongoose from 'mongoose';

const changeSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    currentValue: mongoose.Schema.Types.Mixed,
    proposedValue: mongoose.Schema.Types.Mixed,
  },
  { _id: false },
);

const fileSchema = new mongoose.Schema({ name: String, url: String, type: String }, { _id: false });

const partnerChangeRequestSchema = new mongoose.Schema(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    changes: { type: [changeSchema], required: true },
    documents: { type: [fileSchema], default: [] },
    status: {
      type: String,
      enum: ['PENDING', 'ADDITIONAL_INFO_REQUIRED', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    decisionNote: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model('PartnerChangeRequest', partnerChangeRequestSchema);
