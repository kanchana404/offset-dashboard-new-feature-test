// lib/database/models/OrderCounter.ts
import { Schema, model, models } from "mongoose";

const OrderCounterSchema = new Schema(
  {
    branchName: { 
      type: String, 
      required: true, 
      unique: true 
    },
    branchPrefix: { 
      type: String, 
      required: true,
      uppercase: true,
      maxlength: 3
    },
    lastOrderNumber: { 
      type: Number, 
      required: true, 
      default: 0 
    },
    lastOrderId: {
      type: String,
      required: false
    }
  },
  { timestamps: true }
);

// Create compound index for faster queries
OrderCounterSchema.index({ branchName: 1, branchPrefix: 1 });

const OrderCounter = models.OrderCounter || model("OrderCounter", OrderCounterSchema);
export default OrderCounter;