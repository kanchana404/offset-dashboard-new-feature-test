
// lib/database/models/CompletedTask.ts
import { Schema, model, models } from "mongoose";

const CompletedTaskSchema = new Schema(
  {
    name: { type: String, required: true },
    orderId: { type: String, required: true, unique: true },
    productType: { type: String, required: true },
    priority: { type: String, required: true },
    branch: { type: String, required: true },
    status: { type: String, default: "Completed" },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    startPrice: { type: Number },
    endPrice: { type: Number },
    needsTransfer: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const CompletedTask = models.CompletedTask || model("CompletedTask", CompletedTaskSchema);
export default CompletedTask;
