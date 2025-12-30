import { Schema, model, models } from "mongoose";

export interface ICredit {
  whatsappNumber: string;
  customerName: string;
  customerEmail?: string;
  balance: number;
  usedAmount: number;
}

const CreditSchema = new Schema<ICredit>(
  {
    whatsappNumber: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String },
    // “balance” is how many credits remain:
    balance: { type: Number, required: true, default: 0 },
    // “usedAmount” tracks total credits spent (for your own reporting, if needed)
    usedAmount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

const Credit = models.Credit || model<ICredit>("Credit", CreditSchema);
export default Credit;
