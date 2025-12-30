/* lib/database/models/Branches_Login.ts */
import { Schema, model, models } from "mongoose";

const BranchesLoginSchema = new Schema(
  {
    branch: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      unique: true,
    },
    username: { type: String, required: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

const BranchesLogin =
  models.Branches_Login || model("Branches_Login", BranchesLoginSchema);
export default BranchesLogin;
