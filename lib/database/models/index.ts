// lib/database/models/index.ts
// This file ensures all models are properly registered in production environments

import SelectedItemModel from './SelectedItems';
import InventoryItemModel from './InventoryItem';
import BranchModel from './Branch';
import BranchesLoginModel from './Branches_login';
import CategoriesModel from './Categories';
import CompletedTaskModel from './CompletedTask';
import CreditModel from './Credits';
import EmployeeModel from './Employee';
import NoticeModel from './Notice';
import OnlinePaymentModel from './OnlinePayment';
import OrderModel from './Order';
import OrderCounterModel from './OrderCounter';
import SentOrderModel from './SentOrder';
import TaskModel from './Task';
import TaskAssignmentModel from './TaskAssignment';
import PaymentModel from './Payment';

// Export all models to ensure they're registered
export {
  SelectedItemModel,
  InventoryItemModel,
  BranchModel,
  BranchesLoginModel,
  CategoriesModel,
  CompletedTaskModel,
  CreditModel,
  EmployeeModel,
  NoticeModel,
  OnlinePaymentModel,
  OrderModel,
  OrderCounterModel,
  SentOrderModel,
  TaskModel,
  TaskAssignmentModel,
  PaymentModel
};

// This ensures all models are loaded and registered
export default {
  SelectedItemModel,
  InventoryItemModel,
  BranchModel,
  BranchesLoginModel,
  CategoriesModel,
  CompletedTaskModel,
  CreditModel,
  EmployeeModel,
  NoticeModel,
  OnlinePaymentModel,
  OrderModel,
  OrderCounterModel,
  SentOrderModel,
  TaskModel,
  TaskAssignmentModel,
  PaymentModel
};
