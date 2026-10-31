import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    complaintCode: { type: String, required: true, unique: true },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    category: { type: String, required: true },
    description: { type: String, required: true, trim: true },
    attachments: [{ type: String }],
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"],
      default: "PENDING",
    },
    resolutionNote: { type: String, default: "" },
  },
  { timestamps: true }
);

const Complaint = mongoose.model("Complaint", complaintSchema);
export default Complaint;
