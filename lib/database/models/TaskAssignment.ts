// lib/database/models/TaskAssignment.ts
import { Schema, model, models, Types } from "mongoose";

const TaskAssignmentSchema = new Schema(
  {
    task: { type: Types.ObjectId, ref: "Task", required: true },
    employee: { type: Types.ObjectId, ref: "Employee", required: true },
    branch: { type: String, required: true },
    assignedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const TaskAssignment = models.TaskAssignment || model("TaskAssignment", TaskAssignmentSchema);
export default TaskAssignment;
