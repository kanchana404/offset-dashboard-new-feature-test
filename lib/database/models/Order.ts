// lib/database/models/Order.ts
import { Schema, model, models } from "mongoose";

const OrderSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: false },
    whatsappNumber: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    images: { type: [String], default: [] }, // Array of image URLs
    orderItems: [
      {
        product: { type: String, required: true },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        totalWaste: { type: Number, required: true },
      },
    ],
    totalPrice: { type: Number, required: true, default: 0 },
    advancePayment: { type: Number, required: true, default: 0 },
    sendToMainBranch: { type: Boolean, required: true },
    assignTask: { type: Boolean, required: true, default: true },
    sentToMainBranch: { type: Boolean, required: true },
    orderDate: { type: Date, required: true },
    due_date: { type: Date, required: true }, // Expected Completion Date
    branch: { type: String, required: false }
  },
  { timestamps: true }
);

const Order = models.Order || model("Order", OrderSchema);
export default Order;