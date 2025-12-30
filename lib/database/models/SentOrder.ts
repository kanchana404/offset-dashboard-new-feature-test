// lib/database/models/SentOrder.ts
import { Schema, model, models } from "mongoose";

const SentOrderSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    orderDate: { type: Date, required: true },
    totalPrice: { type: Number, required: true },
    sentBranch: { type: String, required: true },
    status: { type: String, default: "Sent to Main Branch" },
    level: { type: Number, default: 1 }, // New field to store the level
    images: { type: [String], default: [] }, // Array of image URLs
    
    // Invoice and payment fields
    invoiceCreated: { type: Boolean, default: false },
    invoiceData: { type: Schema.Types.Mixed },
    products: [{ type: Schema.Types.Mixed }],
    fullPayment: { type: Number, default: 0 },
    lastPaymentMethod: { type: String },
    paymentHistory: [{ type: Schema.Types.Mixed }]
  },
  { timestamps: true }
);

const SentOrder = models.SentOrder || model("SentOrder", SentOrderSchema);
export default SentOrder;
