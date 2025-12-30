// lib/database/models/Task.ts
import { Schema, model, models } from "mongoose";

const ProductItemSchema = new Schema({
  productType: { type: String, required: true },
  productPrice: { type: Number, required: true },
  productQuantity: { type: Number, required: true },
  totalWaste: { type: Number }
});

const TaskSchema = new Schema(
  {
    name: { type: String, required: true },
    orderId: { type: String, required: true, unique: true },
    products: { type: [ProductItemSchema], default: [] },
    priority: { type: String, required: true },
    branch: { type: String, required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    status: { 
      type: String, 
      default: "INVOICED",
      enum: ["INVOICED", "IN_PROGRESS", "COMPLETED", "PAID", "Pending", "In Progress", "Completed"] // Include old values for backward compatibility
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    startPrice: { type: Number },
    endPrice: { type: Number },
    needsTransfer: { type: Boolean, default: false },
    description: { type: String },
    artworkImage: { type: String },
    // New payment tracking fields
    totalAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    // Legacy payment fields (keep for backward compatibility)
    advancePayment: { type: Number },
    fullPayment: { type: Number },
    readyForPayment: { type: Boolean, default: false },
    invoiceCreated: { type: Boolean, default: true }, // Auto-created now
    invoiceData: { type: Object }, // Store invoice details
    // Payment related fields
    lastPaymentMethod: { type: String },
    chequeStatus: { type: String, enum: ["pending", "cleared", "returned"] },
    chequeNotes: { type: String },
    onlinePaymentStatus: { type: String, enum: ["pending", "confirmed", "failed"] },
    onlinePaymentNotes: { type: String },
    paymentHistory: { type: [Object], default: [] },
    // Keep backward compatibility for legacy tasks
    productType: { type: String },
    productPrice: { type: Number },
    productQuantity: { type: Number },
    totalWaste: { type: Number }
  },
  { timestamps: true, strict: false }
);

const Task = models.Task || model("Task", TaskSchema);
export default Task;