// lib/database/models/Payment.ts
import { Schema, model, models } from "mongoose";

const PaymentSchema = new Schema(
  {
    orderId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    paymentType: { 
      type: String, 
      required: true,
      enum: ["CASH", "CARD", "CHEQUE", "ONLINE", "UPI", "BANK_TRANSFER"],
      default: "CASH"
    },
    paymentDate: { type: Date, required: true, default: Date.now },
    notes: { type: String },
    receivedBy: { type: String }, // Employee name/ID who received payment
    receiptNumber: { type: String }, // Optional receipt number
    chequeNumber: { type: String }, // For cheque payments
    chequeStatus: { 
      type: String, 
      enum: ["PENDING", "CLEARED", "RETURNED"],
      default: "PENDING"
    },
    transactionId: { type: String }, // For online/UPI payments
    branch: { type: String, required: true }, // Branch where payment was received
  },
  { timestamps: true }
);

// Index for faster queries
PaymentSchema.index({ orderId: 1, createdAt: -1 });

const Payment = models.Payment || model("Payment", PaymentSchema);
export default Payment;

