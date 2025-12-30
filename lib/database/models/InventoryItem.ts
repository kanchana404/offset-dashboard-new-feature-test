import { Schema, model, models } from "mongoose";

function generate8DigitCode() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

const InventoryItemSchema = new Schema(
  {
    name: { type: String, required: true },
    branch: { type: String, required: true },
    quantity: { type: Number, required: true },
    status: { type: String, default: "In Stock" },
    image: { type: String },
    productId: { type: String, required: true },
    productCode: { type: String },
    price: { type: Number, required: true } // new column
  },
  { timestamps: true }
);

// Create compound unique indexes to enforce uniqueness per branch only.
InventoryItemSchema.index({ branch: 1, productId: 1 }, { unique: true });
InventoryItemSchema.index({ branch: 1, productCode: 1 }, { unique: true });

// Pre-save hook to generate a productCode if missing (unique within branch)
InventoryItemSchema.pre("save", async function (next) {
  if (!this.productCode) {
    let code = generate8DigitCode();
    let existing = await this.constructor.findOne({ branch: this.branch, productCode: code });
    while (existing) {
      code = generate8DigitCode();
      existing = await this.constructor.findOne({ branch: this.branch, productCode: code });
    }
    this.productCode = code;
  }
  next();
});

const InventoryItemModel = models.InventoryItem || model("InventoryItem", InventoryItemSchema);
export default InventoryItemModel;
