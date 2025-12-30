/* lib/database/models/Employee.ts */
import { Schema, model, models, Types } from "mongoose";

const EmployeeSchema = new Schema(
  {
    branchId: {
      type: Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    position: {
      type: String,
      required: true,
    },
    branch: {
      type: String,
      required: true,
    },
    salary: {
      type: Number,
      required: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const EmployeeModel = models.Employee || model("Employee", EmployeeSchema);
export default EmployeeModel;
