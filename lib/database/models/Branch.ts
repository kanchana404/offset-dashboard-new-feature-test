/* lib/database/models/Branch.ts */
import { Schema, model, models } from "mongoose";

const BranchSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['main', 'sub'], 
      required: true 
    },
    location: { type: String, required: true },
    contact: { 
      type: [String], 
      default: [] 
    },
    allowedProducts: { 
      type: [String], 
      default: function() {
        return this.type === 'main' 
          ? ['mug', 'plate', 'tshirt', 'banner']
          : ['mug', 'plate', 'banner'];
      },
      validate: {
        validator: function(products) {
          // Define allowed products based on branch type
          const mainBranchProducts = ['mug', 'plate', 'tshirt', 'banner'];
          const subBranchProducts = ['mug', 'plate', 'banner'];
          
          // Check if all products are allowed for the branch type
          return products.every(product => 
            this.type === 'main' 
              ? mainBranchProducts.includes(product)
              : subBranchProducts.includes(product)
          );
        },
        message: 'Invalid products for branch type.'
      }
    },
    isActive: { 
      type: Boolean, 
      default: true 
    }
  },
  { timestamps: true }
);

BranchSchema.pre("save", async function (next) {
  // Ensure only one main branch exists
  if (this.type === 'main') {
    const existingMain = await BranchModel.findOne({ type: 'main', _id: { $ne: this._id } });
    if (existingMain) {
      const error = new Error("A main branch already exists.");
      error.name = "MainBranchValidationError";
      return next(error);
    }
  }

  next();
});

const BranchModel = models.Branch || model("Branch", BranchSchema);
export default BranchModel;