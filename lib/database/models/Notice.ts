/* lib/database/models/Notice.ts */
import { Schema, model, models, Types } from "mongoose";

const NoticeSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['best_team', 'best_employee', 'other'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    // For best team notices
    teamName: {
      type: String,
      required: false
    },
    teamMembers: {
      type: [String],
      default: [],
    },
    branchId: {
      type: Types.ObjectId,
      ref: "Branch",
      required: false
    },
    // For best employee notices
    employeeId: {
      type: Types.ObjectId,
      ref: "Employee",
      required: false
    },
    employeeName: {
      type: String,
      required: false
    },
    // Common fields
    isActive: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    createdBy: {
      type: String,
      required: true,
      default: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

const Notice = models?.Notice || model("Notice", NoticeSchema);

export default Notice;
