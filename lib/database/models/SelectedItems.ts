// lib/database/models/SelectedItems.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface ISelectedItem extends Document {
  _id: string;
  inventoryItemId: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  category: string;
  price: number;
  selectedQuantity: number;
  unit: string;
  totalPrice: number;
  userId?: string; // Optional: to associate with a specific user
  sessionId?: string; // Optional: to group selections by session
  createdAt: Date;
  updatedAt: Date;
}

const SelectedItemSchema = new Schema<ISelectedItem>({
  inventoryItemId: {
    type: Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  selectedQuantity: {
    type: Number,
    required: true,
    min: 0.01
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  userId: {
    type: String,
    trim: true,
    index: true
  },
  sessionId: {
    type: String,
    trim: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes
SelectedItemSchema.index({ userId: 1, createdAt: -1 });
SelectedItemSchema.index({ sessionId: 1, createdAt: -1 });
SelectedItemSchema.index({ inventoryItemId: 1, userId: 1 });

export default mongoose.models.SelectedItem || mongoose.model<ISelectedItem>('SelectedItem', SelectedItemSchema);