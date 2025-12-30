// lib/database/models/OnlinePayment.ts
import { Schema, model, models } from "mongoose";

const OnlinePaymentSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    orderId: { type: String, required: true },
    amount: { type: Number, required: true },
    bankName: { type: String, required: true },
    billNumber: { type: String, required: true },
    paymentDate: { type: Date, default: Date.now },
    status: { 
      type: String, 
      enum: ["pending", "confirmed", "failed"], 
      default: "pending" 
    },
    notes: { type: String },
    branch: { type: String, required: true },
    customerName: { type: String },
    customerWhatsapp: { type: String }
  },
  { timestamps: true }
);

// Create index for efficient querying
OnlinePaymentSchema.index({ taskId: 1 });
OnlinePaymentSchema.index({ orderId: 1 });
OnlinePaymentSchema.index({ status: 1 });

const OnlinePayment = models.OnlinePayment || model("OnlinePayment", OnlinePaymentSchema);
export default OnlinePayment; 