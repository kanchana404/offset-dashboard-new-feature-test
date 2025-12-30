// app/tasks/page.tsx - Part 1

"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  X,
  Upload,
  PackageOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Info,
  User,
  Clock,
  Search,
  ImageIcon,
  CreditCard,
  DollarSign,
  FileText,
  RotateCcw,
  Calendar,
  Edit,
  Check,
  Printer,
  Globe,
  Palette,
} from "lucide-react";
import { ScannedProduct } from "@/components/ProductScanner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const UploadButton = dynamic(
  () => import("@/utils/uploadthing").then((mod) => mod.UploadButton),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
        Loading Upload...
      </div>
    ),
  }
);

const ProductScanner = dynamic(
  () => import("@/components/ProductScanner").then((mod) => mod.ProductScanner),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
        Loading Scanner...
      </div>
    ),
  }
);

export type ProductItem = {
  productType: string;
  productPrice: number;
  productQuantity: number;
  totalWaste?: number;
  dimensions?: string; // For Len / Wid / Qty field
};

export type Task = {
  _id: string;
  name: string;
  orderId: string;
  category?: string;
  products: ProductItem[];
  priority: string;
  branch: string;
  status:
  | "Pending"
  | "In Progress"
  | "Completed"
  | "Sent to Main Branch"
  | "Temporary Completed"
  | "Returned";
  startTime: string;
  employeeId?: string;
  artworkImage?: string;
  description?: string;
  images?: string[];
  isSent?: boolean;
  advancePayment?: number;
  fullPayment?: number;
  readyForPayment?: boolean;
  invoiceCreated?: boolean;
  invoiceData?: any;
  totalPrice?: number;
  lastPaymentMethod?: string;
  chequeStatus?: "pending" | "cleared" | "returned";
  chequeNotes?: string;
  onlinePaymentStatus?: "pending" | "confirmed" | "failed";
  onlinePaymentNotes?: string;
  paymentHistory?: any[];
  whatsappNumber?: string;
};

export type Employee = {
  _id: string;
  name: string;
};

export type Order = {
  orderId: string;
  customerName: string;
  customerEmail?: string;
  whatsappNumber: string;
  category: string;
  totalPrice: number;
  advancePayment: number;
  images?: string[];
};

// Print confirmation modal state
export type PrintableProduct = {
  productType: string;
  productPrice: number;
  productQuantity: number;
  totalWaste?: number;
  dimensions?: string; // For Len / Wid / Qty field
};

export default function TaskAssignmentsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [branchInfo, setBranchInfo] = useState<{
    name: string;
    location: string;
    contact: string[];
    type: string;
  } | null>(null);
  const [allBranches, setAllBranches] = useState<Array<{
    name: string;
    location: string;
    contact: string[];
    type: string;
  }>>([]);
  const amountDueRef = useRef<number>(0);

  // Keep track of this customer's credit balance
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  // Confirmation dialog state for sending to workshop
  const [showSendToWorkshopConfirm, setShowSendToWorkshopConfirm] = useState(false);
  const [taskToSendToWorkshop, setTaskToSendToWorkshop] = useState<string | null>(null);

  // Inventory state for product name lookup
  const [inventory, setInventory] = useState<Array<{
    _id: string;
    name: string;
    productId: string;
    productCode: string;
    price: number;
    quantity: number;
    branch: string;
  }>>([]);

  const ITEMS_PER_PAGE = 5;
  const [pendingPage, setPendingPage] = useState(1);
  const [inProgressPage, setInProgressPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [temporaryPage, setTemporaryPage] = useState(1);
  const [returnedPage, setReturnedPage] = useState(1);
  
  // Payment method filter for Temporary Completed Tasks
  const [temporaryPaymentFilter, setTemporaryPaymentFilter] = useState<string>("all");

  const [showProductModal, setShowProductModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(
    null
  );
  const [manualProduct, setManualProduct] = useState<string>("");
  const [productPrice, setProductPrice] = useState<string>("");
  const [productQuantity, setProductQuantity] = useState<string>("");
  const [totalWaste, setTotalWaste] = useState<string>("");
  const [advancePayment, setAdvancePayment] = useState<string>("");
  const [fullPayment, setFullPayment] = useState<string>("");

  const [selectedTaskDetails, setSelectedTaskDetails] = useState<{
    description: string | null;
    images?: string[];
    taskId?: string;
    whatsappNumber?: string;
    customerName?: string;
    // Payment information
    totalCost?: number;
    advancePayment?: number;
    fullPayment?: number;
    remainingAmount?: number;
    paymentHistory?: any[];
    lastPaymentMethod?: string;
    orderId?: string;
    // Image information
    orderImages?: string[];
    artworkImage?: string;
    // Due date information
    dueDate?: string;
  } | null>(null);

  // Description editing state
  const [editingDescription, setEditingDescription] = useState<string>("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  // Payment Modal State
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [currentTaskToComplete, setCurrentTaskToComplete] =
    useState<Task | null>(null);
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState<"cash" | "card" | "cheque" | "credits" | "online">("cash");
  const [chequeNumber, setChequeNumber] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [chequeDate, setChequeDate] = useState<string>("");
  const [billNumber, setBillNumber] = useState<string>("");

  // Cheque Management Modal State
  const [showChequeModal, setShowChequeModal] = useState(false);
  const [currentChequeTask, setCurrentChequeTask] = useState<Task | null>(
    null
  );
  const [chequeAction, setChequeAction] = useState<"successful" | "return">(
    "successful"
  );
  const [chequeNotes, setChequeNotes] = useState<string>("");

  // Online Payment Management Modal State
  const [showOnlinePaymentModal, setShowOnlinePaymentModal] = useState(false);
  const [currentOnlinePaymentTask, setCurrentOnlinePaymentTask] = useState<Task | null>(
    null
  );
  const [onlinePaymentAction, setOnlinePaymentAction] = useState<"confirmed" | "failed">(
    "confirmed"
  );
  const [onlinePaymentNotes, setOnlinePaymentNotes] = useState<string>("");

  // Editable total price state
  const [editedTotalPrice, setEditedTotalPrice] = useState<string>("");
  const [isEditingTotalPrice, setIsEditingTotalPrice] = useState(false);

  // Print Confirmation Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [currentPrintTask, setCurrentPrintTask] = useState<Task | null>(null);
  const [editableProducts, setEditableProducts] = useState<PrintableProduct[]>([]);
  const [customTotalAmount, setCustomTotalAmount] = useState<string>("");

  // Invoice Creation Modal State
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [currentInvoiceTask, setCurrentInvoiceTask] = useState<Task | null>(null);
  const [invoiceProducts, setInvoiceProducts] = useState<PrintableProduct[]>([]);
  const [invoiceTotalAmount, setInvoiceTotalAmount] = useState<string>("");
  const [showInvoiceOrderDetails, setShowInvoiceOrderDetails] = useState(false);

  // Credit Payment Completion Modal State
  const [showCreditCompleteModal, setShowCreditCompleteModal] = useState(false);
  const [currentCreditTask, setCurrentCreditTask] = useState<Task | null>(null);
  // app/tasks/page.tsx - Part 2: Helper Functions and Data Fetching

  // ------------------------------
  // Helper functions
  // ------------------------------
  const getProductNameById = (productId: string) => {
    console.log("Looking up product name for:", productId, "Inventory items:", inventory.length);
    
    // First, try to find by MongoDB _id (most common case)
    const inventoryItemById = inventory.find(item => item._id === productId);
    if (inventoryItemById) {
      console.log("Found by _id:", inventoryItemById.name);
      return inventoryItemById.name;
    }
    
    // Find the product in inventory by productId
    const inventoryItem = inventory.find(item => item.productId === productId);
    if (inventoryItem) {
      console.log("Found by productId:", inventoryItem.name);
      return inventoryItem.name;
    }
    
    // If not found in inventory, try to find by productCode
    const inventoryItemByCode = inventory.find(item => item.productCode === productId);
    if (inventoryItemByCode) {
      console.log("Found by productCode:", inventoryItemByCode.name);
      return inventoryItemByCode.name;
    }
    
    // If it looks like a MongoDB ObjectId (24 characters), it might be a product reference
    if (productId && productId.length === 24) {
      console.log("Product ID format detected, but no match found in inventory");
      return "Product ID: " + productId.substring(0, 8) + "...";
    }
    
    // Fallback to the original productId if no match found
    console.log("No match found, returning original:", productId);
    return productId;
  };

  // Helper function to get the correct payment method display
  const getDisplayPaymentMethod = (task: Task) => {
    // Check payment history first for credit payments
    if (task.paymentHistory && task.paymentHistory.length > 0) {
      const hasCreditPayment = task.paymentHistory.some(payment => 
        payment.method === "credits" || payment.method === "credit"
      );
      if (hasCreditPayment) {
        return "credit";
      }
    }
    
    // Check if the task has a special marker for credit payments (from the old implementation)
    if (task.lastPaymentMethod === "cheque" && task.paymentHistory?.some(p => 
      p.chequeNumber === "CREDIT_ADJUSTMENT" || p.bankName === "INTERNAL"
    )) {
      return "credit";
    }
    
    // Check if lastPaymentMethod is "credits"
    if (task.lastPaymentMethod === "credits") {
      return "credit";
    }
    
    return task.lastPaymentMethod || "cheque";
  };

  // Helper function to check if a task is paid via credit
  const isCreditPayment = (task: Task) => {
    return getDisplayPaymentMethod(task) === "credit";
  };

  const getDisplayStatus = (task: Task) => {
    if (task.status === "Completed") {
      return "Completed";
    }
    if (task.status === "Temporary Completed") {
      return "Temporary Completed";
    }
    if (
      task.status === "In Progress" &&
      task.products.length > 0 &&
      task.artworkImage &&
      task.readyForPayment
    ) {
      if (!task.invoiceCreated) {
        return "Create Invoice";
      }
      if (task.advancePayment && task.advancePayment > 0) {
        return "Partial Payment";
      }
      return "Awaiting Payment";
    }
    return task.status;
  };

  const getBadgeColor = (status: string, displayStatus?: string) => {
    const statusForColor = displayStatus || status;
    switch (statusForColor) {
      case "Pending":
        return "bg-amber-100 text-amber-800 border border-amber-200";
      case "Sent to Main Branch":
        return "bg-purple-100 text-purple-800 border border-purple-200";
      case "In Progress":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "Create Invoice":
        return "bg-cyan-100 text-cyan-800 border border-cyan-200";
      case "Awaiting Payment":
        return "bg-orange-100 text-orange-800 border border-orange-200";
      case "Partial Payment":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      case "Temporary Completed":
        return "bg-indigo-100 text-indigo-800 border border-indigo-200";
      case "Completed":
        return "bg-green-100 text-green-800 border border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const calculateProductsTotal = (products: ProductItem[]) => {
    return products.reduce((total, product) => {
      // Parse len/width to get the multiplier
      let lenWidthMultiplier = 1;
      if (product.dimensions) {
        if (typeof product.dimensions === 'string') {
          const multiplier = parseFloat(product.dimensions);
          if (!isNaN(multiplier)) {
            lenWidthMultiplier = multiplier;
          }
        } else if (typeof product.dimensions === 'number') {
          lenWidthMultiplier = product.dimensions;
        }
      }
      
      return total + (product.productPrice * product.productQuantity * lenWidthMultiplier);
    }, 0);
  };

  const determineTaskTotal = (task: Task): number => {
    // First priority: Invoice amount if invoice has been created
    if (task.invoiceCreated && task.invoiceData?.totalAmount) {
      return task.invoiceData.totalAmount;
    }
    // Second priority: Task's totalPrice
    if (task.totalPrice !== undefined && task.totalPrice > 0) {
      return task.totalPrice;
    }
    // Third priority: Order's totalPrice
    const order = orders.find((o) => o.orderId === task.orderId);
    if (order && order.totalPrice > 0) {
      return order.totalPrice;
    }
    // Last priority: Calculate from products
    return calculateProductsTotal(task.products);
  };

  const getCustomerNameByOrderId = (orderId: string): string => {
    const order = orders.find((o) => o.orderId === orderId);
    return order ? order.customerName : "Unknown";
  };

  const getOrderDetailsByOrderId = (orderId: string): Order | null => {
    const found = orders.find((o) => o.orderId === orderId) || null;
    console.log(`🔍 Order lookup for ${orderId}:`, found ? "✅ Found" : "❌ Not found");
    return found;
  };

  const getDueDateByTask = (task: Task): string => {
    // First try to get due date from the task itself
    if (task.due_date) {
      return task.due_date;
    }
    
    // If not found, try to get it from the order
    const order = orders.find((o) => o.orderId === task.orderId);
    if (order && (order as any).due_date) {
      return (order as any).due_date;
    }
    
    return "Not specified";
  };

  const generateTaskDetailsHTML = (task: Task, orderDetails: Order | null) => {
    console.log("🖨️ Generating template for task:", task.orderId);
    console.log("📋 Order details:", orderDetails ? `Found (${orderDetails.category}, Rs${orderDetails.totalPrice})` : "Not found");
    
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short", 
      day: "numeric",
    });
    const formattedTime = currentDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Get customer details
    const customerName = orderDetails?.customerName || "Customer";
    const customerWhatsapp = orderDetails?.whatsappNumber || "";
    const customerEmail = orderDetails?.customerEmail || "";

    // Get branch details
    const currentBranchName = branchInfo?.name || "Branch";
    const currentBranchEmail = branchInfo?.contact?.find(contact => contact.includes('@')) || "";
    const branchLocation = branchInfo?.location || "Branch Location";
    const branchContact = branchInfo?.contact?.filter(contact => !contact.includes('@')).join(", ") || "Contact Information";

    // Get other branches list (excluding current branch, workshop, test, and Sales - Sri Lanka)
    const otherBranchesList = Array.isArray(allBranches) ? allBranches
      .filter(branch => 
        branch.name !== currentBranchName && 
        !branch.name.toLowerCase().includes('workshop') && 
        !branch.name.toLowerCase().includes('test') &&
        branch.name !== "Sales"
      )
      .map(branch => `${branch.name} - ${branch.location}`)
      .join('<br>') : "Loading branches...";

    // Calculate totals
    const totalCost = determineTaskTotal(task);
    const advancePayment = task.advancePayment || 0;
    const remainingAmount = totalCost - advancePayment;

    // Get due date
    const dueDate = getDueDateByTask(task);
    const dueDateFormatted = dueDate !== "Not specified" ? new Date(dueDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }) : "Not specified";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Details - ${task.orderId}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            font-size: 11px;
            line-height: 1.2;
        }
        
        @media print {
            body { 
                background-color: white !important;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            .no-print {
                display: none !important;
            }
        }
        .header {
            text-align: center;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .logo {
            display: flex;
            align-items: center;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        .logo-img {
            width: 35px;
            height: 35px;
            margin-right: 10px;
            object-fit: contain;
        }
        .contact-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 9px;
            line-height: 1.2;
        }
        .contact-section {
            flex: 1;
            padding: 0 5px;
        }
        .current-branch-section {
            flex: 1;
            padding: 0 5px;
            text-align: center;
        }
        .other-branches-section {
            flex: 1;
            padding: 0 5px;
            text-align: right;
        }
        .contact-section h4 {
            margin: 0 0 3px 0;
            font-size: 10px;
        }
        .current-branch-section h4 {
            margin: 0 0 3px 0;
            font-size: 10px;
            text-decoration: underline;
            font-weight: bold;
        }
        .other-branches-section h4 {
            margin: 0 0 3px 0;
            font-size: 10px;
        }
        .customer-invoice-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 11px;
        }
        .customer-info, .invoice-info {
            flex: 1;
        }
        .customer-info {
            padding-right: 15px;
        }
        .info-line {
            margin: 3px 0;
            display: flex;
            align-items: center;
        }
        .info-line label {
            font-weight: bold;
            margin-right: 8px;
            min-width: 80px;
            font-size: 10px;
        }
        .filled-info {
            flex: 1;
            border-bottom: 1px solid #333;
            padding: 1px 3px;
            min-height: 14px;
            font-size: 10px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .items-table th {
            background-color: #f0f0f0;
            border: 1px solid #333;
            padding: 5px;
            text-align: center;
            font-weight: bold;
            font-size: 10px;
        }
        .items-table td {
            border: 1px solid #333;
            padding: 5px;
            vertical-align: middle;
            text-align: center;
            font-size: 9px;
        }
        .footer-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
        }
        .total-section {
            width: 200px;
            text-align: right;
            font-size: 10px;
        }
        .total-line {
            margin: 3px 0;
            display: flex;
            justify-content: space-between;
            font-weight: bold;
        }
        .total-line:last-child {
            border-top: 2px solid #333;
            border-bottom: 2px solid #333;
        }
        .thank-you {
            text-align: center;
            font-size: 12px;
            font-weight: bold;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <div class="header">
            <div class="logo">
                <img src="/logo.jpg" alt="Solid Graphic Logo" class="logo-img" onerror="this.style.display='none'" />
                Solid Graphic (Pvt) Ltd
            </div>
        </div>

        <!-- Contact Information -->
        <div class="contact-info">
            <div class="contact-section">
                <div>
                    <h4>Head Office & Work shop</h4>
                    No. 89, Ranna East, Ranna.<br>
                    Tel. 070 2222 00 2/3/4/9<br>
                    workshop@solidgraphic.lk
                </div>
            </div>
            <div class="current-branch-section">
                <h4>${currentBranchName}</h4>
                <div>
                    ${branchLocation}<br>
                    ${branchContact}<br>
                    ${currentBranchEmail ? `${currentBranchEmail}` : ''}
                </div>
            </div>
            <div class="other-branches-section">
                <h4>Other Branches</h4>
                <div style="font-size: 8px; line-height: 1.1;">
                    ${otherBranchesList}
                </div>
            </div>
        </div>

        <!-- Customer and Invoice Information -->
        <div class="customer-invoice-info">
            <div class="customer-info">
                <div class="info-line">
                    <label>Cus. Name</label>
                    <span>-</span>
                    <div class="filled-info">${customerName}</div>
                </div>
                <div class="info-line">
                    <label>Cus. Number</label>
                    <span>-</span>
                    <div class="filled-info">${customerWhatsapp}</div>
                </div>
                <div class="info-line">
                    <label>Due Date</label>
                    <span>-</span>
                    <div class="filled-info">${dueDateFormatted}</div>
                </div>
            </div>
            <div class="invoice-info">
                <div class="info-line">
                    <label>Order ID</label>
                    <span>-</span>
                    <div class="filled-info">${task.orderId}</div>
                </div>
                <div class="info-line">
                    <label>Task Date</label>
                    <span>-</span>
                    <div class="filled-info">${formattedDate}</div>
                </div>
                <div class="info-line">
                    <label>Task Time</label>
                    <span>-</span>
                    <div class="filled-info">${formattedTime}</div>
                </div>
            </div>
        </div>

        <!-- Products Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th>CATEGORY NAME</th>
                    <th>QUANTITY</th>
                    <th>RATE (Rs)</th>
                    <th>TOTAL PRICE (Rs)</th>
                </tr>
            </thead>
            <tbody>
                ${(() => {
                  console.log("🔍 TASK PRODUCTS CHECK:");
                  console.log("task.products:", task.products);
                  console.log("task.products length:", task.products ? task.products.length : 'undefined');
                  
                  // Always show order information, regardless of products
                  const categoryName = orderDetails?.category || 'Category Not Found';
                  const totalAmount = orderDetails?.totalPrice ? orderDetails.totalPrice.toFixed(2) : 'Price Not Found';
                  
                  if (!task.products || task.products.length === 0) {
                    console.log("❌ NO PRODUCTS FOUND - showing order info instead");
                    const fallbackRow = `<tr><td>${categoryName}</td><td>1</td><td>Rs ${totalAmount}</td><td>Rs ${totalAmount}</td></tr>`;
                    console.log("🟢 Generated fallback row:", fallbackRow);
                    return fallbackRow;
                  }
                  
                  console.log("✅ PRODUCTS FOUND - generating product rows");
                  return task.products.map((product, index) => {
                    const quantity = product.productQuantity || 1;
                    const rate = product.productPrice ? product.productPrice.toFixed(2) : totalAmount;
                    
                    const htmlRow = `<tr><td>${categoryName}</td><td>${quantity}</td><td>Rs ${rate}</td><td>Rs ${totalAmount}</td></tr>`;
                    console.log(`🟢 Generated HTML Row ${index}:`, htmlRow);
                    
                    return htmlRow;
                  }).join('');
                })()}
            </tbody>
        </table>

        <!-- Footer Section -->
        <div class="footer-section">
            <div class="total-section" style="margin-left: auto;">
                <div class="total-line">
                    <span>SUB TOTAL</span>
                    <span>: Rs ${totalCost.toFixed(2)}</span>
                </div>
                ${advancePayment > 0 ? `
                <div class="total-line">
                    <span>ADVANCED PAY</span>
                    <span>: Rs ${advancePayment.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="total-line">
                    <span>REMAINING</span>
                    <span>: Rs ${remainingAmount.toFixed(2)}</span>
                </div>
            </div>
        </div>

        <!-- Order Status -->
        <div style="margin: 15px 0; padding: 10px; border: 1px solid #333; font-size: 10px; text-align: center;">
            <strong>Order Status: ${task.status}</strong>
        </div>

        <!-- Thank You Message -->
        <div class="thank-you">
            Thank You... Come Again...
        </div>
    </div>

    <button onclick="window.print()" class="no-print" style="margin-top: 15px; padding: 8px 16px; background-color: #4a90e2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
        Print Task Details
    </button>
</body>
</html>
    `;
  };

  const printTaskDetails = (task: Task) => {
    const orderDetails = getOrderDetailsByOrderId(task.orderId);
    
    // Generate printable HTML content
    const printContent = generateTaskDetailsHTML(task, orderDetails);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load, then trigger print
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
    } else {
      toast({
        title: "Print Error",
        description: "Unable to open print window. Please check your popup blocker.",
        variant: "destructive",
      });
    }
  };

  // ------------------------------
  // Fetch initial data
  // ------------------------------
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [tasksRes, sentRes] = await Promise.all([
          fetch("/api/tasks/main"),
          fetch("/api/sent-orders/main"),
        ]);
        const tasksData = await tasksRes.json();
        const sentData = await sentRes.json();

        if (!tasksRes.ok) {
          toast({
            title: "Error",
            description: tasksData.error || "Failed to fetch tasks",
            variant: "destructive",
          });
          return;
        }
        if (!sentRes.ok) {
          toast({
            title: "Error",
            description: sentData.error || "Failed to fetch sent orders",
            variant: "destructive",
          });
          return;
        }

        let tasksList: Task[] = tasksData.tasks.reverse();
        const sentOrders = sentData.sentOrders;
        const sentOrderIds = new Set(sentOrders.map((s: any) => s.orderId));

        // Store branch information
        if (tasksData.branchInfo) {
          setBranchInfo(tasksData.branchInfo);
        }

        tasksList = tasksList.map((task: any) => {
          const products = task.products || [];
          const totalPrice =
            task.totalPrice !== undefined ? task.totalPrice : 0;
          return {
            ...task,
            products,
            readyForPayment: !!task.readyForPayment,
            totalPrice,
          };
        });

        tasksList = tasksList.map((task: Task) =>
          sentOrderIds.has(task.orderId)
            ? { ...task, isSent: true, status: "Sent to Main Branch" }
            : task
        );

        setTasks(tasksList);
      } catch (error: any) {
        console.error("Error fetching tasks:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to fetch tasks",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const fetchEmployees = async () => {
      try {
        const res = await fetch("/api/employees/main");
        const data = await res.json();
        if (res.ok) {
          setEmployees(data.employees);
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to fetch employees",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error("Error fetching employees:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to fetch employees",
          variant: "destructive",
        });
      }
    };

    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/orders");
        const data = await res.json();
        if (res.ok) {
          console.log("📦 Orders loaded:", data.orders.length);
          setOrders(data.orders);
        } else {
          console.error("Failed to fetch orders:", data.error);
          toast({
            title: "Error",
            description: data.error || "Failed to fetch orders",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error("Error fetching orders:", error);
        toast({
          title: "Error",
          description: "Failed to fetch orders",
          variant: "destructive",
        });
      }
    };

      const fetchBranches = async () => {
    console.log("Fetching branches...");
    try {
      console.log("Making request to /api/branches");
      const res = await fetch("/api/branches");
      console.log("Branches API response status:", res.status);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log("Branches API response data:", data);
      
      if (data.branches && Array.isArray(data.branches)) {
        // Filter out the current branch and Sales - Sri Lanka
        const currentBranchName = branchInfo?.name;
        const filteredBranches = data.branches.filter((branch: any) => 
          branch.name !== currentBranchName && branch.name !== "Sales - Sri Lanka"
        );
        setAllBranches(filteredBranches);
        console.log("Branches set successfully (filtered):", filteredBranches);
        console.log("Current branch excluded:", currentBranchName);
      } else {
        console.warn("Branches data is not in expected format:", data);
        setAllBranches([]);
      }
    } catch (error: any) {
      console.error("Error fetching branches:", error);
      // Set empty array as fallback
      setAllBranches([]);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch("/api/inventory");
      if (res.ok) {
        const data = await res.json();
        console.log("Inventory data fetched:", data.inventory);
        setInventory(data.inventory || []);
      } else {
        console.warn("Failed to fetch inventory, using empty array");
        setInventory([]);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
      setInventory([]);
    }
  };

  // Fallback function to create mock branches if API fails
  const createMockBranches = async () => {
    console.log("Attempting to fetch real branches from database as fallback");
    try {
      // Try to fetch from a different endpoint or use existing data
      const res = await fetch("/api/branches");
      if (res.ok) {
        const data = await res.json();
        if (data.branches && Array.isArray(data.branches)) {
          // Filter out the current branch and Sales - Sri Lanka
          const currentBranchName = branchInfo?.name;
          const filteredBranches = data.branches.filter((branch: any) => 
            branch.name !== currentBranchName && branch.name !== "Sales - Sri Lanka"
          );
          console.log("Using real branches from database:", filteredBranches);
          setAllBranches(filteredBranches);
        } else {
          // If no branches found, create minimal fallback
          console.log("No branches found in database, using minimal fallback");
          setAllBranches([]);
        }
      } else {
        console.log("Failed to fetch branches, using empty array");
        setAllBranches([]);
      }
    } catch (error) {
      console.error("Error in createMockBranches:", error);
      setAllBranches([]);
    }
  };

    fetchData();
    fetchEmployees();
    fetchOrders();
    fetchBranches();
    fetchInventory();
    
    // Add timeout to prevent infinite loading
    const branchesTimeout = setTimeout(() => {
      if (!allBranches || allBranches.length === 0) {
        console.warn("Branches loading timeout - creating mock branches");
        createMockBranches();
      }
    }, 8000); // 8 second timeout
    
    return () => clearTimeout(branchesTimeout);
  }, [toast]);

  // Reset pagination when payment method filter changes
  useEffect(() => {
    setTemporaryPage(1);
  }, [temporaryPaymentFilter]);

  // ------------------------------
  // Filter + paginate
  // ------------------------------
  const filterTasks = (tasksList: Task[]) => {
    let filteredTasks = tasksList;
    
    // Text search filter
    if (searchQuery) {
      filteredTasks = filteredTasks.filter(
        (task) =>
          task.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          getCustomerNameByOrderId(task.orderId)
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (task.category &&
            task.category.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Date filter
    if (startDate || endDate) {
      filteredTasks = filteredTasks.filter((task) => {
        const taskDate = new Date(task.startTime);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        if (start && end) {
          return taskDate >= start && taskDate <= end;
        } else if (start) {
          return taskDate >= start;
        } else if (end) {
          return taskDate <= end;
        }
        return true;
      });
    }
    
    return filteredTasks;
  };

  // Clear date filters
  const clearDateFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  // Apply date filters
  const applyDateFilters = () => {
    // The filtering will be handled automatically in the filterTasks function
  };

  const pendingTasks = filterTasks(
    tasks.filter((task) => task.status === "Pending" && !task.isSent)
  );
  const inProgressTasks = filterTasks(
    tasks.filter(
      (task) =>
        task.status === "In Progress" &&
        (!task.readyForPayment || !task.artworkImage)
    )
  );
  const completedTasks = filterTasks(
    tasks.filter(
      (task) =>
        task.status === "Completed" ||
        (task.status === "In Progress" &&
          task.products.length > 0 &&
          task.artworkImage &&
          task.readyForPayment)
    )
  );
  const temporaryCompletedTasks = filterTasks(
    tasks.filter((task) => {
      if (task.status !== "Temporary Completed") return false;
      
      // Apply payment method filter
      if (temporaryPaymentFilter !== "all") {
        const displayPaymentMethod = getDisplayPaymentMethod(task);
        if (displayPaymentMethod !== temporaryPaymentFilter) return false;
      }
      
      return true;
    })
  );
  const returnedTasks = filterTasks(tasks.filter((task) => task.status === "Returned"));

  const getPaginatedTasks = (taskList: Task[], page: number) => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return taskList.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const pendingTasksPaginated = getPaginatedTasks(pendingTasks, pendingPage);
  const inProgressTasksPaginated = getPaginatedTasks(
    inProgressTasks,
    inProgressPage
  );
  const completedTasksPaginated = getPaginatedTasks(
    completedTasks,
    completedPage
  );
  const temporaryTasksPaginated = getPaginatedTasks(
    temporaryCompletedTasks,
    temporaryPage
  );
  const returnedTasksPaginated = getPaginatedTasks(returnedTasks, returnedPage);

  const getTotalPages = (totalItems: number) =>
    Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  // app/tasks/page.tsx - Part 3: Assignment and Payment Handlers

  // ------------------------------
  // Assignment / workshop / ready-for-payment handlers
  // ------------------------------
  const handleAssignEmployee = async (
    taskId: string,
    employeeId: string
  ) => {
    try {
      const res = await fetch("/api/tasks/assign", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, employeeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign task");
      setTasks((prev) =>
        prev.map((task) =>
          task._id === taskId ? (data.task as Task) : task
        )
      );
      toast({
        title: "Task Assigned",
        description: "Employee assigned to task successfully.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign employee",
        variant: "destructive",
      });
    }
  };

  const handleSendToWorkshop = async (taskId: string) => {
    // Show confirmation dialog first
    setTaskToSendToWorkshop(taskId);
    setShowSendToWorkshopConfirm(true);
  };

  const confirmSendToWorkshop = async () => {
    if (!taskToSendToWorkshop) return;
    
    try {
      const res = await fetch("/api/tasks/send-to-main", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: taskToSendToWorkshop }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send order");
      setTasks((prev) =>
        prev.map((task) =>
          task._id === taskToSendToWorkshop ? (data.task as Task) : task
        )
      );
      toast({
        title: "Sent to Workshop",
        description: "Order sent to main branch successfully.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send order",
        variant: "destructive",
      });
    } finally {
      // Close confirmation dialog
      setShowSendToWorkshopConfirm(false);
      setTaskToSendToWorkshop(null);
    }
  };

  const handleSetReadyForPayment = async (taskId: string) => {
    try {
      const res = await fetch("/api/tasks/ready-for-payment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to set task ready for payment");
      setTasks((prev) =>
        prev.map((task) =>
          task._id === taskId
            ? { ...task, readyForPayment: true }
            : task
        )
      );
      toast({
        title: "Task Ready for Payment",
        description: "Task has been moved to Awaiting Payment.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.message || "Failed to set task ready for payment",
        variant: "destructive",
      });
    }
  };

  // ------------------------------
  // "Pay & Complete" modal logic
  // ------------------------------
  const openCompleteModal = (task: Task) => {
    const currentTask = tasks.find((t) => t._id === task._id);
    if (!currentTask) {
      toast({
        title: "Error",
        description: "Could not find task details",
        variant: "destructive",
      });
      return;
    }

    setCurrentTaskToComplete(currentTask);
    setPaidAmount("");
    setPaymentMethod("cash");
    setChequeNumber("");
    setBankName("");
    setChequeDate("");
    setBillNumber("");
    setCreditBalance(null);

    // Fetch that customer's credits when the modal opens
    fetch(`/api/tasks/credit?orderId=${currentTask.orderId}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to fetch credits");
        setCreditBalance(json.balance);
      })
      .catch((err) => {
        console.error("Error fetching credit balance:", err);
        setCreditBalance(0);
      });

    // Use invoice amount if invoice has been created, otherwise use determineTaskTotal
    let totalAmount;
    if (currentTask.invoiceCreated && currentTask.invoiceData?.totalAmount) {
      totalAmount = currentTask.invoiceData.totalAmount;
    } else {
      totalAmount = determineTaskTotal(currentTask);
    }
    
    setEditedTotalPrice(totalAmount.toString());
    setIsEditingTotalPrice(false);
    setShowCompleteModal(true);
  };

  const handleCompleteTaskWithPayment = async () => {
    if (!currentTaskToComplete) return;

    const paymentAmount = parseFloat(paidAmount || "0");
    if (paymentAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount.",
        variant: "destructive",
      });
      return;
    }

    // If "credits" selected, check balance & deduct first
    if (paymentMethod === "credits") {
      if (
        creditBalance === null ||
        paymentAmount > creditBalance
      ) {
        toast({
          title: "Insufficient Credits",
          description: `You tried to use Rs ${paymentAmount.toFixed(
            2
          )}, but only Rs ${creditBalance?.toFixed(2) || "0.00"} available.`,
          variant: "destructive",
        });
        return;
      }

      //
      // 1) Deduct from the customer's credit balance:
      //
      try {
        setIsSubmitting(true);
        const res = await fetch("/api/tasks/credit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: currentTaskToComplete.orderId,
            amount: -paymentAmount, // negative means "subtract"
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to deduct credits");
        }
        setCreditBalance(json.balance);
      } catch (err: any) {
        console.error("Credit deduction failed:", err);
        toast({
          title: "Credit Deduction Error",
          description: err.message || "Could not apply credits.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      //
      // 2) Now "pay" the task with credits payment method
      //    This will move the task to "Temporary Completed" status
      //
      const requestData: any = {
        taskId: currentTaskToComplete._id,
        paidAmount: paymentAmount,
        paymentMethod: "credits",
        totalPrice: parseFloat(editedTotalPrice),
      };

      try {
        setIsSubmitting(true);
        const res = await fetch("/api/tasks/complete", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        });
        const data = await res.json();
        if (!res.ok) {
          console.error("Task‐complete API error:", data);
          throw new Error(data.error || "Failed to complete task");
        }

        // Update local state → it now shows up under "Temporary Completed"
        setTasks((prev) =>
          prev.map((t) =>
            t._id === currentTaskToComplete._id ? (data.task as Task) : t
          )
        );

        toast({
          title: "Credits Applied",
          description:
            "Credits were used; the order has moved into Temporary Completed status. Click 'Pay Credits' to complete the order.",
          variant: "default",
        });

        setShowCompleteModal(false);
        setCurrentTaskToComplete(null);
        setPaidAmount("");
        setChequeNumber("");
        setBankName("");
        setChequeDate("");
      } catch (err: any) {
        console.error("Payment processing error:", err);
        toast({
          title: "Error",
          description: err.message || "Could not process payment.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }

      // Done—no further "complete" call below
      return;
    }

    // FALL-THROUGH: non‐credit payments ("cash", "card", or real "cheque")
    const requestData: any = {
      taskId: currentTaskToComplete._id,
      paidAmount: paymentAmount,
      paymentMethod,
      totalPrice: parseFloat(editedTotalPrice),
    };

    if (paymentMethod === "cheque") {
      if (!chequeNumber.trim()) {
        toast({
          title: "Missing Cheque Number",
          description: "Please enter the cheque number.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      if (!bankName.trim()) {
        toast({
          title: "Missing Bank Name",
          description: "Please enter the bank name.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      requestData.chequeNumber = chequeNumber.trim();
      requestData.bankName = bankName.trim();
      if (chequeDate) {
        requestData.chequeDate = chequeDate;
      }
    }

    if (paymentMethod === "online") {
      if (!billNumber.trim()) {
        toast({
          title: "Missing Bill Number",
          description: "Please enter the bill number.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      if (!bankName.trim()) {
        toast({
          title: "Missing Bank Name",
          description: "Please enter the bank name.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      requestData.billNumber = billNumber.trim();
      requestData.bankName = bankName.trim();
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/tasks/complete", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Task‐complete API error:", data);
        throw new Error(data.error || "Failed to complete task");
      }

      // Update local state
      setTasks((prev) =>
        prev.map((t) =>
          t._id === currentTaskToComplete._id ? (data.task as Task) : t
        )
      );

      toast({
        title: "Payment Processed",
        description: data.message,
        variant: "default",
      });

      setShowCompleteModal(false);
      setCurrentTaskToComplete(null);
      setPaidAmount("");
      setChequeNumber("");
      setBankName("");
      setChequeDate("");
    } catch (err: any) {
      console.error("Payment processing error:", err);
      toast({
        title: "Error",
        description: err.message || "Could not process payment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  // app/tasks/page.tsx - Part 4: Cheque, Product, and Print Modal Handlers

  // ------------------------------
  // Cheque modal handlers
  // ------------------------------
  const openChequeModal = (task: Task, action: "successful" | "return") => {
    setCurrentChequeTask(task);
    setChequeAction(action);
    setChequeNotes("");
    setShowChequeModal(true);
  };

  const openOnlinePaymentModal = (task: Task, action: "confirmed" | "failed") => {
    setCurrentOnlinePaymentTask(task);
    setOnlinePaymentAction(action);
    setOnlinePaymentNotes("");
    setShowOnlinePaymentModal(true);
  };

  const handleChequeAction = async () => {
    if (!currentChequeTask) return;
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/tasks/cheque-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: currentChequeTask._id,
          action: chequeAction,
          notes: chequeNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update cheque status");
      }
      setTasks((prev) =>
        prev.map((task) =>
          task._id === currentChequeTask._id ? (data.task as Task) : task
        )
      );
      toast({
        title: "Cheque Status Updated",
        description: data.message,
        variant: "default",
      });
      setShowChequeModal(false);
      setCurrentChequeTask(null);
    } catch (err: any) {
      console.error("Cheque action error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to update cheque status",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOnlinePaymentAction = async () => {
    if (!currentOnlinePaymentTask) return;
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/tasks/online-payment-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: currentOnlinePaymentTask._id,
          action: onlinePaymentAction,
          notes: onlinePaymentNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update online payment status");
      }
      setTasks((prev) =>
        prev.map((task) =>
          task._id === currentOnlinePaymentTask._id ? (data.task as Task) : task
        )
      );
      toast({
        title: "Online Payment Status Updated",
        description: data.message,
        variant: "default",
      });
      setShowOnlinePaymentModal(false);
      setCurrentOnlinePaymentTask(null);
    } catch (err: any) {
      console.error("Online payment action error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to update online payment status",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------------------
  // Credit Payment Completion Handler
  // ------------------------------
  const handleCompleteCreditPayment = async () => {
    if (!currentCreditTask) return;
    
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/tasks/complete-credit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: currentCreditTask._id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete credit payment");
      }
      
      setTasks((prev) =>
        prev.map((task) =>
          task._id === currentCreditTask._id ? (data.task as Task) : task
        )
      );
      
      toast({
        title: "Credit Payment Completed",
        description: "Task has been marked as completed successfully.",
        variant: "default",
      });
      
      setShowCreditCompleteModal(false);
      setCurrentCreditTask(null);
    } catch (err: any) {
      console.error("Credit completion error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to complete credit payment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------------------
  // Product modal, artwork modal
  // ------------------------------
  const openProductModal = (taskId: string) => {
    setCurrentTaskId(taskId);
    setScannedProduct(null);
    setManualProduct("");
    setProductPrice("");
    setProductQuantity("");
    setTotalWaste("");
    setAdvancePayment("");
    setFullPayment("");
    setShowProductModal(true);
  };

  const openUploadModalForTask = (taskId: string) => {
    setCurrentTaskId(taskId);
    setShowUploadModal(true);
  };

  const handleSubmitProduct = async () => {
    if (!currentTaskId) return;
    const selectedProduct = scannedProduct ? scannedProduct._id : manualProduct;
    if (!selectedProduct) {
      toast({
        title: "Error",
        description: "Please provide a product",
        variant: "destructive",
      });
      return;
    }
    if (
      scannedProduct &&
      Number(productQuantity) > scannedProduct.quantity
    ) {
      toast({
        title: "Error",
        description: "Quantity exceeds available inventory",
        variant: "destructive",
      });
      return;
    }
    try {
      const newProduct = {
        productType: selectedProduct,
        productPrice: Number(productPrice),
        productQuantity: Number(productQuantity),
        totalWaste: Number(totalWaste),
      };
      const advancePaymentValue = advancePayment
        ? Number(advancePayment)
        : undefined;
      const fullPaymentValue = fullPayment
        ? Number(fullPayment)
        : undefined;
      const res = await fetch("/api/tasks/select-product", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: currentTaskId,
          newProduct,
          advancePayment: advancePaymentValue,
          fullPayment: fullPaymentValue,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.task) {
        throw new Error(data.error || "Failed to update product");
      }
      setTasks((prev) =>
        prev.map((t) => (t._id === currentTaskId ? (data.task as Task) : t))
      );
      toast({
        title: "Product Added",
        description: "Product details updated successfully.",
        variant: "default",
      });
      setShowProductModal(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update product",
        variant: "destructive",
      });
    }
  };

  const handleArtworkUploadForTask = async (taskId: string, resData: any) => {
    const artworkUrl = resData[0].url;
    try {
      const res = await fetch("/api/tasks/upload-artwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, artworkImage: artworkUrl }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to upload artwork");
      toast({
        title: "Artwork Uploaded",
        description: "Artwork image uploaded successfully.",
        variant: "default",
      });
      setTasks((prev) =>
        prev.map((t) =>
          t._id === taskId ? { ...t, artworkImage: artworkUrl } : t
        )
      );
      setShowUploadModal(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to upload artwork",
        variant: "destructive",
      });
    }
  };

  // ------------------------------
  // Print confirmation modal handlers
  // ------------------------------
  const openPrintModal = (task: Task) => {
    setCurrentPrintTask(task);
    
    // Initialize editable products
    if (task.products && task.products.length > 0) {
      // Map existing products and add dimensions field if missing
      setEditableProducts(task.products.map(product => ({
        ...product,
        dimensions: (product as any).dimensions || ""
      })));
    } else {
      // If no products, create a default "Printing Service" product
      setEditableProducts([{
        productType: "Printing Service",
        productPrice: 0,
        productQuantity: 1,
        dimensions: "",
      }]);
    }

    // Set custom total amount
    const totalAmount = determineTaskTotal(task);
    setCustomTotalAmount(totalAmount.toString());
    
    setShowPrintModal(true);
  };

  const handleProductChange = (index: number, field: keyof PrintableProduct, value: string | number) => {
    setEditableProducts(prev => 
      prev.map((product, i) => 
        i === index 
          ? { ...product, [field]: field === 'productType' ? value : Number(value) }
          : product
      )
    );
  };

  const addNewProduct = () => {
    setEditableProducts(prev => [
      ...prev,
      {
        productType: "",
        productPrice: 0,
        productQuantity: 1,
        dimensions: "",
      }
    ]);
  };

  const removeProduct = (index: number) => {
    if (editableProducts.length > 1) {
      setEditableProducts(prev => prev.filter((_, i) => i !== index));
    }
  };

  // ------------------------------
  // Invoice Creation Modal Handlers
  // ------------------------------
  const openInvoiceModal = (task: Task) => {
    setCurrentInvoiceTask(task);
    
    // Initialize invoice products
    if (task.products && task.products.length > 0) {
      setInvoiceProducts(task.products.map(product => ({
        ...product,
        dimensions: (product as any).dimensions || ""
      })));
    } else {
      setInvoiceProducts([{
        productType: "Printing Service",
        productPrice: 0,
        productQuantity: 1,
        dimensions: "",
      }]);
    }

    // Set total amount
    const totalAmount = determineTaskTotal(task);
    setInvoiceTotalAmount(totalAmount.toString());
    
    setShowInvoiceModal(true);
  };

  const handleInvoiceProductChange = (index: number, field: keyof PrintableProduct, value: string | number) => {
    setInvoiceProducts(prev => 
      prev.map((product, i) => 
        i === index 
          ? { ...product, [field]: field === 'productType' ? value : Number(value) }
          : product
      )
    );
  };

  const addNewInvoiceProduct = () => {
    setInvoiceProducts(prev => [
      ...prev,
      {
        productType: "",
        productPrice: 0,
        productQuantity: 1,
        dimensions: "",
      }
    ]);
  };

  const removeInvoiceProduct = (index: number) => {
    if (invoiceProducts.length > 1) {
      setInvoiceProducts(prev => prev.filter((_, i) => i !== index));
    }
  };

  const calculateInvoiceProductsTotal = () => {
    return invoiceProducts.reduce((total, product) => {
      // Parse len/width to get the multiplier
      let lenWidthMultiplier = 1;
      if (product.dimensions) {
        if (typeof product.dimensions === 'string') {
          const multiplier = parseFloat(product.dimensions);
          if (!isNaN(multiplier)) {
            lenWidthMultiplier = multiplier;
          }
        } else if (typeof product.dimensions === 'number') {
          lenWidthMultiplier = product.dimensions;
        }
      }
      
      return total + (product.productPrice * product.productQuantity * lenWidthMultiplier);
    }, 0);
  };

  const handleCreateInvoice = async () => {
    if (!currentInvoiceTask) return;

    try {
      setIsSubmitting(true);
      
      const totalAmount = parseFloat(invoiceTotalAmount) || calculateInvoiceProductsTotal();
      
      const res = await fetch("/api/tasks/create-invoice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: currentInvoiceTask._id,
          products: invoiceProducts,
          totalAmount: totalAmount
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create invoice");
      }

      // Update local state
      setTasks(prev =>
        prev.map(task =>
          task._id === currentInvoiceTask._id
            ? { ...task, invoiceCreated: true, invoiceData: data.invoice, products: invoiceProducts, totalPrice: totalAmount }
            : task
        )
      );

      toast({
        title: "Invoice Created",
        description: "Invoice has been created successfully. You can now proceed to payment.",
        variant: "default",
      });

      setShowInvoiceModal(false);
      setCurrentInvoiceTask(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateEditableProductsTotal = () => {
    return editableProducts.reduce((total, product) => {
      // Parse len/width to get the multiplier
      let lenWidthMultiplier = 1;
      if (product.dimensions) {
        if (typeof product.dimensions === 'string') {
          const multiplier = parseFloat(product.dimensions);
          if (!isNaN(multiplier)) {
            lenWidthMultiplier = multiplier;
          }
        } else if (typeof product.dimensions === 'number') {
          lenWidthMultiplier = product.dimensions;
        }
      }
      
      return total + (product.productPrice * product.productQuantity * lenWidthMultiplier);
    }, 0);
  };

  const calculateProductAmount = (product: PrintableProduct) => {
    // Parse len/width to get the multiplier
    let lenWidthMultiplier = 1;
    if (product.dimensions) {
      if (typeof product.dimensions === 'string') {
        const multiplier = parseFloat(product.dimensions);
        if (!isNaN(multiplier)) {
          lenWidthMultiplier = multiplier;
        }
      } else if (typeof product.dimensions === 'number') {
        lenWidthMultiplier = product.dimensions;
      }
    }
    
    return product.productPrice * product.productQuantity * lenWidthMultiplier;
  };

  const handleConfirmPrint = () => {
    if (!currentPrintTask) return;
    
    // Create a modified task object with the editable products and custom total
    const modifiedTask = {
      ...currentPrintTask,
      products: editableProducts,
      totalPrice: parseFloat(customTotalAmount) || calculateEditableProductsTotal(),
    };

    printTaskInvoice(modifiedTask);
    setShowPrintModal(false);
    setCurrentPrintTask(null);
  };

  const closeDescriptionPopup = () => {
    setSelectedTaskDetails(null);
  };

  const showTaskDetails = (taskId: string) => {
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;
    
    // Calculate payment information
    const totalCost = determineTaskTotal(task);
    const advancePayment = task.advancePayment || 0;
    const fullPayment = task.fullPayment || totalCost;
    const remainingAmount = totalCost - advancePayment;
    
    // Get order details for images
    const orderDetails = getOrderDetailsByOrderId(task.orderId);
    
    // Get due date
    const dueDate = getDueDateByTask(task);
    
    setSelectedTaskDetails({
      description: task.description || "No description",
      images: task.images || [],
      taskId: task._id,
      whatsappNumber: task.whatsappNumber || "Not provided",
      customerName: getCustomerNameByOrderId(task.orderId),
      // Payment information
      totalCost,
      advancePayment,
      fullPayment,
      remainingAmount,
      paymentHistory: task.paymentHistory || [],
      lastPaymentMethod: task.lastPaymentMethod,
      orderId: task.orderId,
      // Image information
      orderImages: orderDetails?.images || [],
      artworkImage: task.artworkImage || undefined,
      // Due date information
      dueDate: dueDate
    });
    // Initialize editing description with current description
    setEditingDescription(task.description || "");
    setIsEditingDescription(false);
  };

  const handleStartEditDescription = () => {
    setIsEditingDescription(true);
  };

  const handleCancelEditDescription = () => {
    setIsEditingDescription(false);
    setEditingDescription(selectedTaskDetails?.description || "");
  };

  const handleSaveDescription = async () => {
    if (!selectedTaskDetails?.taskId) return;
    
    try {
      setIsSavingDescription(true);
      const res = await fetch("/api/tasks/update-description", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedTaskDetails.taskId,
          description: editingDescription
        }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update description");
      }

      // Update local state
      setTasks(prev => 
        prev.map(task => 
          task._id === selectedTaskDetails.taskId 
            ? { ...task, description: editingDescription }
            : task
        )
      );

      // Update selected task details
      setSelectedTaskDetails(prev => 
        prev ? { ...prev, description: editingDescription } : null
      );

      setIsEditingDescription(false);
      toast({
        title: "Description Updated",
        description: "Task description has been updated successfully.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update description",
        variant: "destructive",
      });
    } finally {
      setIsSavingDescription(false);
    }
  };

  const handleDownloadImage = (imageUrl: string) => {
    const anchor = document.createElement("a");
    anchor.href = imageUrl;
    const filename = imageUrl.split("/").pop() || "download.jpg";
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const renderPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "cash":
        return <DollarSign className="h-3 w-3" />;
      case "card":
        return <CreditCard className="h-3 w-3" />;
      case "cheque":
        return <FileText className="h-3 w-3" />;
      case "credits":
        return <Clock className="h-3 w-3" />;
      case "online":
        return <Globe className="h-3 w-3" />;
      default:
        return <DollarSign className="h-3 w-3" />;
    }
  };
  // app/tasks/page.tsx - Part 5: Action Buttons and Invoice Generation

  const renderInProgressActionButtons = (task: Task) => {
    return (
      <div className="flex flex-col gap-2">
        <Button
          onClick={() => openProductModal(task._id)}
          className="bg-blue-600 hover:bg-blue-700 flex items-center px-3 py-2 h-auto text-xs rounded-lg"
          size="sm"
        >
          <PackageOpen className="mr-1.5 h-3.5 w-3.5" />
          Add Product
        </Button>
        {!task.artworkImage && (
          <Button
            onClick={() => openUploadModalForTask(task._id)}
            className="bg-purple-600 hover:bg-purple-700 flex items-center px-3 py-2 h-auto text-xs rounded-lg"
            size="sm"
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Upload Artwork
          </Button>
        )}
        {task.products.length > 0 && task.artworkImage && !task.readyForPayment && (
          <Button
            onClick={() => handleSetReadyForPayment(task._id)}
            className="bg-orange-600 hover:bg-orange-700 flex items-center px-3 py-2 h-auto text-xs rounded-lg"
            size="sm"
          >
            <CreditCard className="mr-1.5 h-3.5 w-3.5" />
            Move to Payment
          </Button>
        )}
      </div>
    );
  };

  const renderCompletedActionButton = (task: Task) => {
    if (task.status === "Completed") {
      return (
        <Button
          onClick={() => printTaskInvoice(task)}
          className="bg-gray-700 hover:bg-gray-800 px-3 py-2 h-auto text-xs rounded-lg flex items-center"
          size="sm"
        >
          <Printer className="mr-1.5 h-3.5 w-3.5" />
          Print Invoice
        </Button>
      );
    } else if (
      task.status === "In Progress" &&
      task.products.length > 0 &&
      task.artworkImage &&
      task.readyForPayment &&
      !task.invoiceCreated
    ) {
      // Show "Create Invoice" button
      return (
        <Button
          onClick={() => openInvoiceModal(task)}
          className="bg-cyan-600 hover:bg-cyan-700 flex items-center px-3 py-2 h-auto text-xs rounded-lg"
          size="sm"
        >
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          Create Invoice
        </Button>
      );
    } else if (
      task.status === "In Progress" &&
      task.products.length > 0 &&
      task.artworkImage &&
      task.readyForPayment &&
      task.invoiceCreated
    ) {
      // Show "Pay" button after invoice is created
      return (
        <Button
          onClick={() => openCompleteModal(task)}
          className="bg-green-600 hover:bg-green-700 flex items-center px-3 py-2 h-auto text-xs rounded-lg"
          size="sm"
        >
          <CreditCard className="mr-1.5 h-3.5 w-3.5" />
          Pay
        </Button>
      );
    } else {
      return (
        <Button
          onClick={() => openCompleteModal(task)}
          className="bg-green-600 hover:bg-green-700 flex items-center px-3 py-2 h-auto text-xs rounded-lg"
          size="sm"
        >
          <CreditCard className="mr-1.5 h-3.5 w-3.5" />
          Pay
        </Button>
      );
    }
  };

  const renderTemporaryCompletedActions = (task: Task) => {
    const isCredit = isCreditPayment(task);
    
    return (
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={() => printTaskInvoice(task)}
          className="bg-gray-700 hover:bg-gray-800 px-3 py-2 h-auto text-xs rounded-lg flex items-center"
          size="sm"
        >
          <Printer className="mr-1.5 h-3.5 w-3.5" />
          Print Bill
        </Button>
        {isCredit ? (
          <Button
            onClick={() => {
              setCurrentCreditTask(task);
              setShowCreditCompleteModal(true);
            }}
            className="bg-green-600 hover:bg-green-700 px-3 py-2 h-auto text-xs rounded-lg flex items-center"
            size="sm"
          >
            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
            Pay Credits
          </Button>
        ) : task.chequeStatus === "pending" ? (
          <Button
            onClick={() => openChequeModal(task, "successful")}
            className="bg-green-600 hover:bg-green-700 px-3 py-2 h-auto text-xs rounded-lg flex items-center"
            size="sm"
          >
            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
            Mark Cheque Successful
          </Button>
        ) : null}
      </div>
    );
  };

  const renderReturnedActionButton = (task: Task) => {
    return (
      <Button
        onClick={() => openCompleteModal(task)}
        className="bg-green-600 hover:bg-green-700 flex items-center px-3 py-2 h-auto text-xs rounded-lg"
        size="sm"
      >
        <CreditCard className="mr-1.5 h-3.5 w-3.5" />
        Re-Pay
      </Button>
    );
  };

  function generateTaskInvoiceHTML(task: Task, invoiceData?: any) {
    try {
      console.log("Generating task invoice HTML for task:", task);
      console.log("Current allBranches state:", allBranches);
      console.log("Current branchInfo state:", branchInfo);
      
      // Use invoice data if provided, otherwise use task data
      const productsToShow = invoiceData?.products || task.products || [];
      const totalAmount = invoiceData?.totalAmount || task.totalPrice || determineTaskTotal(task);
      
      const order = orders.find((o) => o.orderId === task.orderId);
      const advancePayment = task.advancePayment || order?.advancePayment || 0;
      const remainingAmount = Math.max(0, totalAmount - advancePayment);
      const invoiceNo = task.orderId;
      const currentDate = invoiceData?.createdAt ? new Date(invoiceData.createdAt) : new Date();
      const formattedDate = currentDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const formattedTime = currentDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Get customer details
      const customerName = invoiceData?.customerName || order?.customerName || getCustomerNameByOrderId(task.orderId) || "Customer";
      const customerWhatsapp = invoiceData?.whatsappNumber || order?.whatsappNumber || task.whatsappNumber || "";

      // Get branch details
      const branchName = branchInfo?.name || "Branch";
      const branchLocation = branchInfo?.location || "";
      const branchContact = branchInfo?.contact?.[0] || "";

      // Ensure allBranches is always an array and filter out current branch
      const safeBranches = Array.isArray(allBranches) ? allBranches : [];
      const filteredOtherBranches = safeBranches.filter(
        branch => branch.name !== branchName && branch.name !== "Sales"
      );
      
      console.log("Invoice data:", {
        customerName,
        customerWhatsapp,
        branchName,
        totalAmount,
        advancePayment
      });
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Solid Graphic Invoice</title>
    <link rel="stylesheet" href="/globals.css">
    <style>
        /* Print and display styles */
        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
        }
        
        @media print {
            body { 
                background-color: white !important;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            .no-print {
                display: none !important;
            }
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .logo {
            display: flex;
            align-items: center;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .logo-img {
            width: 50px;
            height: 50px;
            margin-right: 15px;
            object-fit: contain;
        }
        .contact-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 14px;
            line-height: 1.4;
            position: relative;
        }
        .centered-contact-info {
            text-align: center;
            margin-top: 10px;
            font-size: 14px;
            line-height: 1.4;
            width: 100%;
            display: block;
            font-weight: bold;
        }
        .contact-section {
            flex: 1;
            padding: 0 10px;
        }
        .current-branch-section {
            flex: 1;
            padding: 0 10px;
            text-align: center;
        }
        .other-branches-section {
            flex: 1;
            padding: 0 10px;
            text-align: right;
        }
        .contact-section h4 {
            margin: 0 0 5px 0;
            font-size: 15px;
        }
        .current-branch-section h4 {
            margin: 0 0 5px 0;
            font-size: 15px;
            text-decoration: underline;
            font-weight: bold;
        }
        .other-branches-section h4 {
            margin: 0 0 5px 0;
            font-size: 15px;
        }
        .other-branches-list {
            font-size: 12px;
            line-height: 1.2;
        }
        .other-branch-item {
            margin-bottom: 3px;
        }
        .customer-invoice-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 16px;
        }
        .customer-info, .invoice-info {
            flex: 1;
        }
        .customer-info {
            padding-right: 20px;
        }
        .info-line {
            margin: 5px 0;
            display: flex;
            align-items: center;
        }
        .info-line label {
            font-weight: bold;
            margin-right: 10px;
            min-width: 100px;
        }
        .dotted-line {
            border-bottom: 1px dotted #333;
            flex: 1;
            height: 16px;
        }
        .filled-info {
            flex: 1;
            border-bottom: 1px solid #333;
            padding: 2px 5px;
            min-height: 16px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .items-table th {
            background-color: #f0f0f0;
            border: 1px solid #333;
            padding: 8px;
            text-align: center;
            font-weight: bold;
            font-size: 20px;
        }
        .items-table td {
            border: none;
            padding: 8px;
            vertical-align: middle;
            text-align: center;
            font-size: 18px;
        }
        .data-row {
            height: 40px;
        }
        .column-space {
            width: 20%;
            position: relative;
            padding: 5px;
            color: #666;
            letter-spacing: 1px;
            font-size: 18px;
        }
        .column-space:nth-child(1) { 
            width: 30%; 
            text-align: left;
        }
        .column-space:nth-child(2) { width: 15%; }
        .column-space:nth-child(3) { width: 15%; }
        .column-space:nth-child(4) { width: 20%; }
        .column-space:nth-child(5) { width: 20%; }
        .footer-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        .remark-section {
            flex: 1;
            padding-right: 20px;
            font-size: 14px;
            line-height: 1.4;
        }
        .total-section {
            width: 300px;
            text-align: right;
        }
        .total-line {
            margin: 5px 0;
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            font-size: 20px;
        }
        .total-line:last-child {
            border-top: 2px solid #333;
            border-bottom: 2px solid #333;
        }
        .thank-you {
            text-align: center;
            font-size: 22px;
            font-weight: bold;
            margin: 20px 0;
        }
        .services-list {
            border: 1px solid #333;
            padding: 10px;
            font-size: 12px;
            line-height: 1.3;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <div class="header">
            <div class="logo">
                <img src="/logo.jpg" alt="Solid Graphic Logo" class="logo-img" />
                Solid Graphic (Pvt) Ltd
            </div>
        </div>

        <!-- Contact Information -->
        <div class="contact-info">
            <div class="contact-section">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4>Head Office & Work shop</h4>
                        No. 89, Ranna East, Ranna.<br>
                        Tel. 070 2222 00 2/3/4/9
                    </div>
                    
                </div>
            </div>
            <div class="current-branch-section">
               
                ${branchLocation ? branchLocation : ''}
                ${branchContact ? `<br>${branchContact}` : ''}
                <div>solid_graphic@yahoo.com</div>
            </div>
            <div class="other-branches-section">
                <h4>Branch</h4>
                <div class="other-branches-list">
                    ${filteredOtherBranches
                      .map(branch => `
                        <div class="other-branch-item">
                          <strong>${branch.name}</strong>
                        </div>
                      `).join('')}
                    ${filteredOtherBranches.length === 0 ? 
                      '<div class="other-branch-item">No other branches</div>' : ''}
                </div>
            </div>
        </div>

        <!-- Customer and Invoice Information -->
        <div class="customer-invoice-info">
            <div class="customer-info">
                <div class="info-line">
                    <label>Cus. Name</label>
                    <span>-</span>
                    <div class="filled-info">${customerName}</div>
                </div>
                <div class="info-line">
                    <label>Staff</label>
                    <span>-</span>
                    <div class="filled-info">${employees.find(emp => emp._id === task.employeeId)?.name || ''}</div>
                </div>
                <div class="info-line">
                    <label>Cus. Number</label>
                    <span>-</span>
                    <div class="filled-info">${customerWhatsapp || ''}</div>
                </div>
               
                <div class="info-line">
                    <label>Order Date</label>
                    <span>-</span>
                    <div class="filled-info">${task.startTime ? new Date(task.startTime).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : formattedDate}</div>
                </div>
            </div>
            <div class="invoice-info">
                <div class="info-line">
                    <label>Invoice No</label>
                    <span>-</span>
                    <div class="filled-info">${invoiceNo}</div>
                </div>
                <div class="info-line">
                    <label>Invoice Date</label>
                    <span>-</span>
                    <div class="filled-info">${formattedDate}</div>
                </div>
                <div class="info-line">
                    <label>Invoice Time</label>
                    <span>-</span>
                    <div class="filled-info">${formattedTime}</div>
                </div>

                <div class="info-line">
                    <label>Branch</label>
                    <span>-</span>
                    <div class="filled-info">${branchName}</div>
                </div>
            </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th>ITEM NAME</th>
                    <th>LEN / WID</th>
                    <th>QUANTITY</th>
                    <th>RATE (Rs)</th>
                    <th>AMOUNT (Rs)</th>
                </tr>
            </thead>
            <tbody>
                ${productsToShow && productsToShow.length > 0 ? 
                  productsToShow.map((product: any, index: number) => {
                    const qty = product.productQuantity || 1;
                    const rate = product.productPrice || 0;
                    
                    // Parse len/width to get the multiplier
                    let lenWidthMultiplier = 1;
                    if (product.dimensions) {
                      if (typeof product.dimensions === 'string') {
                        const multiplier = parseFloat(product.dimensions);
                        if (!isNaN(multiplier)) {
                          lenWidthMultiplier = multiplier;
                        }
                      } else if (typeof product.dimensions === 'number') {
                        lenWidthMultiplier = product.dimensions;
                      }
                    }
                    
                    const lenWidDisplay = (product.dimensions !== undefined && product.dimensions !== null && product.dimensions !== "")
                      ? (typeof product.dimensions === 'number' 
                          ? product.dimensions.toFixed(2) 
                          : (!isNaN(parseFloat(product.dimensions)) 
                              ? parseFloat(product.dimensions).toFixed(2) 
                              : String(product.dimensions)))
                      : ".......................";
                    
                    const amount = rate * qty * lenWidthMultiplier;
                    
                    return `
                      <tr class="data-row">
                          <td class="column-space">${getProductNameById(product.productType) || task.category || order?.category || "Printing Service"}</td>
                          <td class="column-space">${lenWidDisplay}</td>
                          <td class="column-space">${qty || "......................."}</td>
                          <td class="column-space">${rate ? `Rs ${rate.toFixed(2)}` : "......................."}</td>
                          <td class="column-space">${amount ? `Rs ${amount.toFixed(2)}` : "......................."}</td>
                      </tr>
                    `;
                  }).join('') + 
                  // Add empty rows if we have less than 3 products
                  Array.from({length: Math.max(0, 3 - productsToShow.length)}, () => `
                    <tr class="data-row">
                        <td class="column-space">.............................</td>
                        <td class="column-space">.......................</td>
                        <td class="column-space">.......................</td>
                        <td class="column-space">.......................</td>
                        <td class="column-space">.......................</td>
                    </tr>
                  `).join('')
                : 
                  // If no products, show 3 empty rows with category name in first row
                  `
                    <tr class="data-row">
                        <td class="column-space">${task.category || order?.category || "Printing Service"}</td>
                        <td class="column-space">.......................</td>
                        <td class="column-space">.......................</td>
                        <td class="column-space">.......................</td>
                        <td class="column-space">.......................</td>
                    </tr>
                    <tr class="data-row">
                        <td class="column-space">.............................</td>
                        <td class="column-space">.......................</td>
                        <td class="column-space">.......................</td>
                        <td class="column-space">.......................</td>
                        <td class="column-space">.......................</td>
                    </tr>
                    <tr class="data-row">
                        <td class="column-space">.............................</td>
                        <td class="column-space">.......................</td>
                        <td class="column-space">.......................</td>
                        <td class="column-space">.......................</td>
                        <td class="column-space">.......................</td>
                    </tr>
                  `
                }
            </tbody>
        </table>

        <!-- Footer Section -->
        <div class="footer-section">
            <div class="total-section" style="width: 100%; text-align: right;">
                <div class="total-line">
                    <span>SUB TOTAL</span>
                    <span>: <span style="border-bottom: 1px dotted #333; width: 100px; display: inline-block; height: 16px;">Rs ${totalAmount.toFixed(2)}</span></span>
                </div>
                ${advancePayment > 0 ? `
                <div class="total-line">
                    <span>ADVANCED PAY</span>
                    <span>: <span style="border-bottom: 1px dotted #333; width: 100px; display: inline-block; height: 16px;">Rs ${advancePayment.toFixed(2)}</span></span>
                </div>
                ` : ''}
                <div class="total-line">
                    <span>Settlement</span>
                    <span>: <span style="border-bottom: 1px dotted #333; width: 100px; display: inline-block; height: 16px;">Rs ${(totalAmount - advancePayment).toFixed(2)}</span></span>
                </div>
            </div>
        </div>

        <!-- Thank You Message -->
        <div class="thank-you">
            Thank You... Come Again...
        </div>

        <!-- Services List -->
        <div class="services-list">
            Digital Printing, Screen Printing, Ceramic (Mug/ Plate)/ Stone/ Tile Printing, Flash Stamping, Polythene Printing, Laser Engraving, Outdoor and Indoor Advertising, Structural Designs & Drawings, Architectural Tasks, Civil Tasks, Construction Estimation / BOQ, Plumbing & Electrical Layouts, Road Design, Planning & Construction Approvals, Land Design, Fire System Designs, Commercial Building & Apartment Planning, Building Permits, Site Supervision, Quantity Surveying, Interior Designing, Mechanical Services, Landscaping, Road Designs, Plumbing Designs, Coordination Services with Client
        </div>
    </div>

    <button onclick="window.print()" class="no-print" style="margin-top: 15px; padding: 8px 16px; background-color: #4a90e2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
        Print Invoice
    </button>
</body>
</html>
`;
    } catch (error: any) {
      console.error("Error generating task invoice HTML:", error);
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error - Invoice Generation Failed</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
            .error { color: red; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>Invoice Generation Error</h1>
          <div class="error">
            <p>Failed to generate invoice: ${error.message || 'Unknown error'}</p>
            <p>Please try again or contact support.</p>
          </div>
        </body>
        </html>
      `;
    }
  }

  function printTaskInvoice(task: Task) {
    // Use the stored invoice data if available, otherwise use current task data
    const invoiceData = task.invoiceData || {
      products: task.products,
      totalAmount: task.totalPrice || determineTaskTotal(task),
      customerName: getCustomerNameByOrderId(task.orderId),
      orderId: task.orderId,
      createdAt: new Date(),
      whatsappNumber: task.whatsappNumber || ""
    };
    
    console.log("Printing task invoice:", task);
    console.log("Branches loaded:", allBranches);
    
    const invoiceHTML = generateTaskInvoiceHTML(task, invoiceData);
    
    // Show loading toast
    toast({
      title: "Preparing Invoice",
      description: "Opening print window...",
      variant: "default",
    });
    
    // Try to open popup window
    let printWindow = window.open(
      "",
      "_blank",
      "popup,width=800,height=600,toolbar=0,scrollbars=0,status=0"
    );
    
    if (!printWindow) {
      // Fallback: try without popup features
      printWindow = window.open("", "_blank");
    }
    
    if (printWindow) {
      try {
        printWindow.document.open();
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        
        // Wait for content to load
        printWindow.onload = function () {
          try {
            setTimeout(() => {
              printWindow.focus();
              printWindow.print(); // Added the missing print() call
              
              toast({
                title: "Print Dialog Opened",
                description: "Print dialog should appear. If not, check your browser settings.",
                variant: "default",
              });
              
              // Monitor window status
              const checkClosedTimer = setInterval(() => {
                if (printWindow.closed) {
                  clearInterval(checkClosedTimer);
                } else {
                  try {
                    const test = printWindow.document;
                  } catch (e) {
                    printWindow.close();
                    clearInterval(checkClosedTimer);
                  }
                }
              }, 1000);
            }, 500); // Increased timeout for better reliability
          } catch (error) {
            console.error("Print error:", error);
            printWindow.close();
            toast({
              title: "Print Error",
              description: "Failed to print invoice. Please try again.",
              variant: "destructive",
            });
          }
        };
        
        // Fallback if onload doesn't fire
        setTimeout(() => {
          if (printWindow && !printWindow.closed) {
            try {
              printWindow.focus();
              printWindow.print();
            } catch (error) {
              console.error("Fallback print error:", error);
            }
          }
        }, 1000);
        
      } catch (error) {
        console.error("Window creation error:", error);
        printWindow.close();
        toast({
          title: "Error",
          description: "Failed to create print window. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Error",
        description: "Please allow popups for printing invoices or try a different browser.",
        variant: "destructive",
      });
    }
  }
  // app/tasks/page.tsx - Part 6: UI Components and Layout Structure

  // ------------------------------
  // UI Components
  // ------------------------------
  const PaginationControls = ({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) => (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-gray-500">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0 rounded-md"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous page</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0 rounded-md"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next page</span>
        </Button>
      </div>
    </div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
      <AlertCircle className="h-12 w-12 text-gray-300 mb-3" />
      <p className="text-gray-500 text-center">{message}</p>
    </div>
  );

  // ------------------------------
  // Rendering
  // ------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent mb-4"></div>
          <p className="text-gray-600">Loading task assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Task Assignments
        </h1>
        <div className="flex items-center space-x-4">
          {/* Date Filter Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`rounded-lg border-gray-200 ${showDateFilter ? 'bg-blue-50 border-blue-200' : ''}`}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Date Filter
          </Button>
          
          {/* Search Input */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 h-10 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Date Filter Row */}
      {showDateFilter && (
        <div className="flex flex-col md:flex-row gap-4 items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 flex-grow">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">From Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border-gray-200"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">To Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border-gray-200"
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={applyDateFilters}
              className="bg-green-600 hover:bg-green-700 rounded-lg"
              disabled={!startDate && !endDate}
            >
              Apply Filter
            </Button>
            <Button
              variant="outline"
              onClick={clearDateFilters}
              className="rounded-lg border-gray-200"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {(searchQuery || startDate || endDate) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Active Filters:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchQuery && (
              <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
                Search: "{searchQuery}"
              </Badge>
            )}
            {startDate && (
              <Badge className="bg-green-100 text-green-800 border border-green-200">
                From: {new Date(startDate).toLocaleDateString()}
              </Badge>
            )}
            {endDate && (
              <Badge className="bg-green-100 text-green-800 border border-green-200">
                To: {new Date(endDate).toLocaleDateString()}
              </Badge>
            )}
                         <Button
               variant="outline"
               size="sm"
               onClick={() => {
                 setSearchQuery("");
                 clearDateFilters();
               }}
               className="text-xs h-6 px-2"
             >
               Clear All
             </Button>
          </div>
        </div>
      )}

      {/* Print Confirmation Modal */}
      {showPrintModal && currentPrintTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">
                Print Invoice Confirmation
              </h2>
              <button
                onClick={() => setShowPrintModal(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-grow p-6">
              <div className="space-y-6">
                {/* Order Information */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="font-medium text-gray-700 mb-3">Order Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Order ID:</span>
                      <span className="ml-2 font-medium">{currentPrintTask.orderId}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Customer:</span>
                      <span className="ml-2 font-medium">{getCustomerNameByOrderId(currentPrintTask.orderId)}</span>
                    </div>
                  </div>
                </div>

                {/* Editable Products */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-700">Item & Services</h3>
                    <Button
                      onClick={addNewProduct}
                      className="bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1 h-8"
                      size="sm"
                    >
                      Add Product
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {editableProducts.map((product, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                          <div>
                            <Label className="text-xs font-medium text-gray-700">Item Name</Label>
                            <Input
                              value={product.productType}
                              onChange={(e) => handleProductChange(index, 'productType', e.target.value)}
                              placeholder="Item Name"
                              className="mt-1 text-sm"
                            />
                            {product.productType && product.productType !== getProductNameById(product.productType) && (
                              <p className="text-xs text-gray-500 mt-1">
                                Display Name: {getProductNameById(product.productType)}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-700">Quantity</Label>
                            <Input
                              type="number"
                              value={product.productQuantity}
                              onChange={(e) => handleProductChange(index, 'productQuantity', e.target.value)}
                              placeholder="Qty"
                              min="1"
                              className="mt-1 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-700">Len/Width Multiplier</Label>
                            <Input
                              value={product.dimensions || ""}
                              onChange={(e) => handleProductChange(index, 'dimensions', e.target.value)}
                              placeholder="e.g., 2.5"
                              className="mt-1 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-700">Rate (Rs)</Label>
                            <Input
                              type="number"
                              value={product.productPrice}
                              onChange={(e) => handleProductChange(index, 'productPrice', e.target.value)}
                              placeholder="Rate"
                              min="0"
                              step="0.01"
                              className="mt-1 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-700">Amount (Rs)</Label>
                            <div className="mt-1 px-3 py-2 bg-gray-100 border rounded-md text-sm font-medium">
                              {calculateProductAmount(product).toFixed(2)}
                            </div>
                          </div>
                          <div>
                            {editableProducts.length > 1 && (
                              <Button
                                onClick={() => removeProduct(index)}
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Amount */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Custom Total Amount (Rs)</Label>
                      <Input
                        type="number"
                        value={customTotalAmount}
                        onChange={(e) => setCustomTotalAmount(e.target.value)}
                        placeholder="Total amount"
                        min="0"
                        step="0.01"
                        className="mt-1 w-48"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave empty to use calculated total</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Calculated Total:</div>
                      <div className="text-lg font-semibold text-gray-900">
                        Rs {calculateEditableProductsTotal().toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t sticky bottom-0 bg-white z-10">
              <Button
                variant="outline"
                onClick={() => setShowPrintModal(false)}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmPrint}
                className="rounded-lg bg-green-600 hover:bg-green-700"
              >
                <Printer className="mr-2 h-4 w-4" />
                Confirm & Print
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTaskDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center p-6 border-b">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Task Details
                </h2>
                {selectedTaskDetails.orderDetails?.customerEmail && (
                  <div className="text-sm text-gray-600">
                    <span className="ml-1">{selectedTaskDetails.orderDetails.customerEmail}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => {
                    const task = tasks.find(t => t._id === selectedTaskDetails.taskId);
                    if (task) {
                      printTaskDetails(task);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print</span>
                </Button>
                <button
                  onClick={closeDescriptionPopup}
                  className="rounded-full p-1.5 hover:bg-gray-100 transition-colors text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Customer Information Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                    <User className="h-4 w-4 mr-2 text-blue-500" />
                    Customer Name
                  </h3>
                  <div className="text-gray-800 font-medium">
                    {selectedTaskDetails.customerName}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                    <svg
                      className="h-4 w-4 mr-2 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                    </svg>
                    WhatsApp Number
                  </h3>
                  <div className="text-gray-800 font-medium">
                    {selectedTaskDetails.whatsappNumber}
                  </div>
                  {selectedTaskDetails.whatsappNumber && selectedTaskDetails.whatsappNumber !== "Not provided" && (
                    <a
                      href={`https://wa.me/${selectedTaskDetails.whatsappNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors text-sm"
                    >
                      <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                      </svg>
                      Contact on WhatsApp
                    </a>
                  )}
                </div>
              </div>

              {/* Order Details Section */}
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 mb-6">
                <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-purple-500" />
                  Order Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-purple-200">
                    <p className="text-xs text-gray-500 mb-1">Order ID</p>
                    <p className="font-medium text-gray-900 font-mono text-sm">
                      {selectedTaskDetails.orderId}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-200">
                    <p className="text-xs text-gray-500 mb-1">Task ID</p>
                    <p className="font-medium text-gray-900 font-mono text-sm">
                      {selectedTaskDetails.taskId}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-200">
                    <p className="text-xs text-gray-500 mb-1 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Due Date
                    </p>
                    <p className="font-medium text-gray-900 text-sm">
                      {(() => {
                        const task = tasks.find(t => t._id === selectedTaskDetails.taskId);
                        if (task) {
                          const dueDate = getDueDateByTask(task);
                          if (dueDate !== "Not specified") {
                            return new Date(dueDate).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            });
                          }
                        }
                        return "Not specified";
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Details Section */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-green-500" />
                  Payment Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-green-200">
                    <p className="text-xs text-gray-500 mb-1">Total Cost</p>
                    <p className="font-semibold text-lg text-gray-900">
                      Rs {selectedTaskDetails.totalCost?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-green-200">
                    <p className="text-xs text-gray-500 mb-1">Advance Payment</p>
                    <p className="font-semibold text-lg text-green-600">
                      Rs {selectedTaskDetails.advancePayment?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-green-200">
                    <p className="text-xs text-gray-500 mb-1">Full Payment</p>
                    <p className="font-semibold text-lg text-blue-600">
                      Rs {selectedTaskDetails.fullPayment?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-green-200">
                    <p className="text-xs text-gray-500 mb-1">Remaining Amount</p>
                    <p className="font-semibold text-lg text-orange-600">
                      Rs {selectedTaskDetails.remainingAmount?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
                
                {/* Payment History */}
                {selectedTaskDetails.paymentHistory && selectedTaskDetails.paymentHistory.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-700 mb-2">Payment History</h4>
                    <div className="space-y-2">
                      {selectedTaskDetails.paymentHistory.map((payment, index) => (
                        <div key={index} className="bg-white p-2 rounded border border-green-200 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">
                              {payment.method?.charAt(0).toUpperCase() + payment.method?.slice(1)} - Rs {payment.amount?.toFixed(2)}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {new Date(payment.date).toLocaleDateString()}
                            </span>
                          </div>
                          {payment.chequeDetails && (
                            <div className="text-xs text-gray-500 mt-1">
                              Cheque: {payment.chequeDetails.chequeNumber} - {payment.chequeDetails.bankName}
                            </div>
                          )}
                          {payment.onlineDetails && (
                            <div className="text-xs text-gray-500 mt-1">
                              Bill: {payment.onlineDetails.billNumber} - {payment.onlineDetails.bankName}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Products Section */}
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 mb-6">
                <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                  <PackageOpen className="h-4 w-4 mr-2 text-yellow-500" />
                  Products & Services
                </h3>
                <div className="space-y-3">
                  {(() => {
                    const task = tasks.find(t => t._id === selectedTaskDetails.taskId);
                    if (!task || !task.products || task.products.length === 0) {
                      return (
                        <div className="text-gray-500 text-sm italic">
                          No products added to this task
                        </div>
                      );
                    }
                    
                    return task.products.map((product, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border border-yellow-200">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Product:</span>
                            <p className="font-medium text-gray-900">
                              {getProductNameById(product.productType)}
                              {product.productType !== getProductNameById(product.productType) && (
                                <span className="text-xs text-gray-500 block font-normal">
                                  ID: {product.productType}
                                </span>
                              )}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Quantity:</span>
                            <p className="font-medium text-gray-900">{product.productQuantity}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Rate (Rs):</span>
                            <p className="font-medium text-gray-900">{product.productPrice?.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Total:</span>
                            <p className="font-medium text-gray-900">
                              Rs {((product.productPrice || 0) * (product.productQuantity || 1)).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {product.totalWaste && product.totalWaste > 0 && (
                          <div className="mt-2 pt-2 border-t border-yellow-200">
                            <span className="text-gray-500 text-sm">Waste: Rs {product.totalWaste.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Description Section */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-gray-700 flex items-center">
                    <Info className="h-4 w-4 mr-2 text-blue-500" />
                    Description
                  </h3>
                  {!isEditingDescription ? (
                    <Button
                      onClick={handleStartEditDescription}
                      variant="outline"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveDescription}
                        disabled={isSavingDescription}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isSavingDescription ? (
                          <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-white border-r-transparent" />
                        ) : (
                          <Check className="h-3 w-3 mr-1" />
                        )}
                        {isSavingDescription ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        onClick={handleCancelEditDescription}
                        variant="outline"
                        size="sm"
                        className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-200"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
                {isEditingDescription ? (
                  <Textarea
                    value={editingDescription}
                    onChange={(e) => setEditingDescription(e.target.value)}
                    placeholder="Enter task description..."
                    className="min-h-[120px] resize-none"
                  />
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-gray-700 border border-gray-100">
                    {selectedTaskDetails.description || "No description available"}
                  </div>
                )}
              </div>

              {/* Images Section */}
              <div>
                <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                  <ImageIcon className="h-4 w-4 mr-2 text-blue-500" />
                  Images & Artwork
                </h3>
                
                {/* Order Images */}
                {selectedTaskDetails.orderImages && selectedTaskDetails.orderImages.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-600 mb-3 flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-gray-500" />
                      Order Images
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedTaskDetails.orderImages.map((imageUrl, index) => (
                        <div
                          key={`order-${index}`}
                          className="border rounded-lg overflow-hidden bg-white shadow-sm group relative"
                        >
                          <img
                            src={imageUrl}
                            alt={`Order image ${index + 1}`}
                            className="w-full h-40 object-cover"
                          />
                          <button
                            onClick={() => handleDownloadImage(imageUrl)}
                            className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors opacity-0 group-hover:opacity-100"
                            title="Download order image"
                          >
                            <Download size={16} className="text-gray-700" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Artwork Image */}
                {selectedTaskDetails.artworkImage && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-600 mb-3 flex items-center">
                      <Palette className="h-4 w-4 mr-2 text-gray-500" />
                      Artwork
                    </h4>
                    <div className="border rounded-lg overflow-hidden bg-white shadow-sm group relative">
                      <img
                        src={selectedTaskDetails.artworkImage}
                        alt="Artwork"
                        className="w-full h-48 object-cover"
                      />
                      <button
                        onClick={() => handleDownloadImage(selectedTaskDetails.artworkImage!)}
                        className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="Download artwork"
                      >
                        <Download size={16} className="text-gray-700" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Task Images */}
                {selectedTaskDetails.images && selectedTaskDetails.images.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-600 mb-3 flex items-center">
                      <ImageIcon className="h-4 w-4 mr-2 text-gray-500" />
                      Task Images
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedTaskDetails.images.map((imageUrl, index) => (
                        <div
                          key={`task-${index}`}
                          className="border rounded-lg overflow-hidden bg-white shadow-sm group relative"
                        >
                          <img
                            src={imageUrl}
                            alt={`Task image ${index + 1}`}
                            className="w-full h-40 object-cover"
                          />
                          <button
                            onClick={() => handleDownloadImage(imageUrl)}
                            className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors opacity-0 group-hover:opacity-100"
                            title="Download task image"
                          >
                            <Download size={16} className="text-gray-700" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Images Message */}
                {(!selectedTaskDetails.orderImages || selectedTaskDetails.orderImages.length === 0) &&
                 !selectedTaskDetails.artworkImage &&
                 (!selectedTaskDetails.images || selectedTaskDetails.images.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No images available for this task</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <Button
                onClick={closeDescriptionPopup}
                variant="outline"
                className="rounded-lg"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}     
      {/* Upload Artwork Modal */}
      {showUploadModal && currentTaskId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Upload Artwork
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Upload the artwork image for this task.
            </p>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
              <UploadButton
                endpoint="imageUploader"
                onClientUploadComplete={(res: any) =>
                  handleArtworkUploadForTask(currentTaskId, res)
                }
                onUploadError={(error: Error) => {
                  toast({
                    title: "Upload Failed",
                    description: `ERROR! ${error.message}`,
                    variant: "destructive",
                  });
                }}
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(false)}
                className="rounded-lg"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Online Payment Management Modal */}
      {showOnlinePaymentModal && currentOnlinePaymentTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl w-full max-w-sm sm:max-w-md shadow-xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b bg-white sticky top-0">
              <h2 className="text-sm sm:text-lg font-semibold pr-4">
                {onlinePaymentAction === "confirmed"
                  ? "Mark Online Payment as Confirmed"
                  : "Mark Online Payment as Failed"}
              </h2>
              <button
                onClick={() => setShowOnlinePaymentModal(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors text-gray-500 flex-shrink-0"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between text-xs sm:text-sm py-2 border-b">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-medium break-all">
                    {currentOnlinePaymentTask.orderId}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm py-2 border-b">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium text-right break-words max-w-[60%]">
                    {getCustomerNameByOrderId(
                      currentOnlinePaymentTask.orderId
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm py-2 border-b">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium flex items-center">
                    {renderPaymentMethodIcon(
                      currentOnlinePaymentTask.lastPaymentMethod || "online"
                    )}
                    <span className="ml-1 capitalize">
                      {currentOnlinePaymentTask.lastPaymentMethod || "online"}
                    </span>
                  </span>
                </div>

                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                    Notes (Optional):
                  </Label>
                  <Textarea
                    value={onlinePaymentNotes}
                    onChange={(e) => setOnlinePaymentNotes(e.target.value)}
                    placeholder={
                      onlinePaymentAction === "confirmed"
                        ? "Add any notes about the confirmed payment..."
                        : "Add notes about why the online payment failed..."
                    }
                    className="w-full text-xs sm:text-sm min-h-[80px] resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t bg-white sticky bottom-0">
              <Button
                variant="outline"
                onClick={() => setShowOnlinePaymentModal(false)}
                className="rounded-lg text-xs sm:text-sm h-9 sm:h-10 order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleOnlinePaymentAction}
                className={`rounded-lg text-xs sm:text-sm h-9 sm:h-10 order-1 sm:order-2 ${onlinePaymentAction === "confirmed"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
                  }`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    <span className="hidden sm:inline">Processing...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <span className="break-words">
                    {onlinePaymentAction === "confirmed"
                      ? "Mark as Confirmed"
                      : "Mark as Failed"}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Add Product to Order
              </h2>
              <button
                onClick={() => setShowProductModal(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-grow p-4 sm:p-6">
              <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-100">
                <ProductScanner
                  onProductScanned={(scanned: ScannedProduct) => {
                    setScannedProduct(scanned);
                    setManualProduct(scanned.name);
                    setProductQuantity(
                      scanned.quantity > 0 ? "1" : "0"
                    );
                    setProductPrice(
                      scanned.price ? scanned.price.toString() : ""
                    );
                  }}
                />
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Or Enter Manually:
                  </label>
                  <Input
                    value={manualProduct}
                    onChange={(e) => setManualProduct(e.target.value)}
                    className="w-full rounded-lg"
                    placeholder="Item Name"
                  />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (Rs):
                    </label>
                    <Input
                      type="number"
                      value={productPrice}
                      onChange={(e) =>
                        !scannedProduct &&
                        setProductPrice(e.target.value)
                      }
                      className={`w-full rounded-lg ${scannedProduct ? "bg-gray-100" : ""
                        }`}
                      placeholder="Product Price"
                      readOnly={!!scannedProduct}
                    />
                    {scannedProduct && (
                      <p className="text-xs text-gray-500 mt-1">
                        Price is fixed for scanned products
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity:
                    </label>
                    <Input
                      type="number"
                      value={productQuantity}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value);
                        if (!isNaN(newValue)) {
                          if (scannedProduct) {
                            if (newValue <= scannedProduct.quantity) {
                              setProductQuantity(e.target.value);
                            } else {
                              setProductQuantity(
                                scannedProduct.quantity.toString()
                              );
                              toast({
                                title: "Quantity Limited",
                                description: `Maximum available quantity is ${scannedProduct.quantity}`,
                                variant: "default",
                              });
                            }
                          } else {
                            setProductQuantity(e.target.value);
                          }
                        } else if (e.target.value === "") {
                          setProductQuantity("");
                        }
                      }}
                      min="1"
                      max={
                        scannedProduct ? scannedProduct.quantity : undefined
                      }
                      className="w-full rounded-lg"
                      placeholder="Product Quantity"
                    />
                    {scannedProduct && (
                      <div className="flex items-center mt-1">
                        <p className="text-xs text-gray-500">
                          Available:{" "}
                          <span className="font-medium">
                            {scannedProduct.quantity}
                          </span>
                        </p>
                        {scannedProduct.quantity <= 5 && (
                          <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-sm">
                            Low stock
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Waste:
                    </label>
                    <Input
                      type="number"
                      value={totalWaste}
                      onChange={(e) => setTotalWaste(e.target.value)}
                      className="w-full rounded-lg"
                      placeholder="Waste Amount"
                      min="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the total waste amount for this product
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 p-4 sm:p-6 border-t sticky bottom-0 bg-white z-10">
              <Button
                variant="outline"
                onClick={() => setShowProductModal(false)}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitProduct}
                className="rounded-lg"
                disabled={
                  !manualProduct ||
                  !productPrice ||
                  !productQuantity ||
                  !!(scannedProduct &&
                    (parseInt(productQuantity) || 0) > scannedProduct.quantity)
                }
              >
                Save Product
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Creation Modal */}
      {showInvoiceModal && currentInvoiceTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">
                Create Invoice
              </h2>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-grow p-6">
              <div className="space-y-6">
                {/* Order Information */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium text-gray-700">Order Information</h3>
                    <button
                      onClick={() => setShowInvoiceOrderDetails(!showInvoiceOrderDetails)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      {showInvoiceOrderDetails ? "Hide" : "View"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Order ID:</span>
                      <span className="ml-2 font-medium">{currentInvoiceTask.orderId}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Customer:</span>
                      <span className="ml-2 font-medium">{getCustomerNameByOrderId(currentInvoiceTask.orderId)}</span>
                    </div>
                  </div>
                  
                  {/* Expandable Order Details */}
                  {showInvoiceOrderDetails && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      {(() => {
                        const orderDetails = getOrderDetailsByOrderId(currentInvoiceTask.orderId);
                        if (!orderDetails) {
                          return (
                            <p className="text-sm text-gray-500 italic">No additional order details available.</p>
                          );
                        }
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">WhatsApp:</span>
                              <span className="ml-2 font-medium">{orderDetails.whatsappNumber || "Not provided"}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Category:</span>
                              <span className="ml-2 font-medium">{orderDetails.category}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Total Price:</span>
                              <span className="ml-2 font-medium">Rs {(orderDetails.totalPrice || 0).toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Advance Payment:</span>
                              <span className="ml-2 font-medium">Rs {(orderDetails.advancePayment || 0).toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Remaining:</span>
                              <span className="ml-2 font-medium">Rs {((orderDetails.totalPrice || 0) - (orderDetails.advancePayment || 0)).toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Invoice Products */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-700">Item & Services</h3>
                    <Button
                      onClick={addNewInvoiceProduct}
                      className="bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1 h-8"
                      size="sm"
                    >
                      Add Product
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {invoiceProducts.map((product, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                          <div>
                            <Label className="text-xs font-medium text-gray-700">Item Name</Label>
                            <Input
                              value={product.productType}
                              onChange={(e) => handleInvoiceProductChange(index, 'productType', e.target.value)}
                              placeholder="Item Name"
                              className="mt-1 text-sm"
                            />
                            {product.productType && product.productType !== getProductNameById(product.productType) && (
                              <p className="text-xs text-gray-500 mt-1">
                                Display Name: {getProductNameById(product.productType)}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-700">Quantity</Label>
                            <Input
                              type="number"
                              value={product.productQuantity}
                              onChange={(e) => handleInvoiceProductChange(index, 'productQuantity', e.target.value)}
                              placeholder="Qty"
                              min="1"
                              className="mt-1 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-700">Len/Width Multiplier</Label>
                            <Input
                              value={product.dimensions || ""}
                              onChange={(e) => handleInvoiceProductChange(index, 'dimensions', e.target.value)}
                              placeholder="e.g., 2.5"
                              className="mt-1 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-700">Rate (Rs)</Label>
                            <Input
                              type="number"
                              value={product.productPrice}
                              onChange={(e) => handleInvoiceProductChange(index, 'productPrice', e.target.value)}
                              placeholder="Rate"
                              min="0"
                              step="0.01"
                              className="mt-1 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-700">Amount (Rs)</Label>
                            <div className="mt-1 px-3 py-2 bg-gray-100 border rounded-md text-sm font-medium">
                              {calculateProductAmount(product).toFixed(2)}
                            </div>
                          </div>
                          <div>
                            {invoiceProducts.length > 1 && (
                              <Button
                                onClick={() => removeInvoiceProduct(index)}
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Amount */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Custom Total Amount (Rs)</Label>
                      <Input
                        type="number"
                        value={invoiceTotalAmount}
                        onChange={(e) => setInvoiceTotalAmount(e.target.value)}
                        placeholder="Total amount"
                        min="0"
                        step="0.01"
                        className="mt-1 w-48"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave empty to use calculated total</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Calculated Total:</div>
                      <div className="text-lg font-semibold text-gray-900">
                        Rs {calculateInvoiceProductsTotal().toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t sticky bottom-0 bg-white z-10">
              <Button
                variant="outline"
                onClick={() => setShowInvoiceModal(false)}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateInvoice}
                disabled={isSubmitting}
                className="rounded-lg bg-cyan-600 hover:bg-cyan-700"
              >
                <FileText className="mr-2 h-4 w-4" />
                {isSubmitting ? "Creating..." : "Create Invoice"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Send to Workshop Confirmation Modal */}
      {showSendToWorkshopConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Confirm Send to Workshop
              </h2>
              <button
                onClick={() => {
                  setShowSendToWorkshopConfirm(false);
                  setTaskToSendToWorkshop(null);
                }}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-purple-100 rounded-full mb-4">
                  <PackageOpen className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                  Send Order to Workshop?
                </h3>
                <p className="text-gray-600 text-center">
                  Are you sure you want to send this order to the main workshop? This action cannot be undone.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSendToWorkshopConfirm(false);
                    setTaskToSendToWorkshop(null);
                  }}
                  className="rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmSendToWorkshop}
                  className="rounded-lg bg-purple-600 hover:bg-purple-700"
                >
                  <PackageOpen className="mr-2 h-4 w-4" />
                  Send to Workshop
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showCompleteModal && currentTaskToComplete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl w-full max-w-sm sm:max-w-md lg:max-w-lg shadow-xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 sm:p-6 border-b bg-white sticky top-0 z-10">
              <h2 className="text-base sm:text-lg font-semibold">
                Pay & Complete Order
              </h2>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors text-gray-500 flex-shrink-0"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4">
              {/* Order Details */}
              <div className="space-y-3">
                <div className="flex justify-between text-xs sm:text-sm py-2 border-b">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-medium break-all">
                    {currentTaskToComplete.orderId}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm py-2 border-b">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium text-right break-words max-w-[60%]">
                    {getCustomerNameByOrderId(
                      currentTaskToComplete.orderId
                    )}
                  </span>
                </div>
              </div>

              {/* Products Section */}
              {currentTaskToComplete.products &&
                currentTaskToComplete.products.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b text-xs sm:text-sm font-medium">
                      Products
                    </div>
                    <div className="p-2 sm:p-3">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm min-w-[300px]">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left pb-2 pr-2">Product</th>
                              <th className="text-right pb-2 px-1">Qty</th>
                              <th className="text-right pb-2 px-1">Price</th>
                              <th className="text-right pb-2 pl-2">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentTaskToComplete.products.map(
                              (product, idx) => (
                                <TableRow
                                  key={idx}
                                  className="border-b last:border-0"
                                >
                                  <TableCell className="py-2 pr-2 break-words max-w-[100px]">
                                                    {getProductNameById(product.productType)}
                                  </TableCell>
                                  <TableCell className="py-2 text-right px-1">
                                    {product.productQuantity}
                                  </TableCell>
                                  <TableCell className="py-2 text-right px-1">
                                    Rs {product.productPrice.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="py-2 text-right pl-2">
                                    Rs{" "}
                                    {(
                                      product.productPrice *
                                      product.productQuantity
                                    ).toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

              {/* Payment Information */}
              {(() => {
                const productTotal = calculateProductsTotal(
                  currentTaskToComplete.products
                );
                const order = orders.find(
                  (o) => o.orderId === currentTaskToComplete.orderId
                );

                let advancePaymentValue = 0;
                if (
                  currentTaskToComplete.advancePayment &&
                  currentTaskToComplete.advancePayment > 0
                ) {
                  advancePaymentValue =
                    currentTaskToComplete.advancePayment;
                } else if (order?.advancePayment && order.advancePayment > 0) {
                  advancePaymentValue = order.advancePayment;
                }

                let systemTotalPrice = 0;
                if (
                  currentTaskToComplete.totalPrice !== undefined &&
                  currentTaskToComplete.totalPrice > 0
                ) {
                  systemTotalPrice =
                    currentTaskToComplete.totalPrice;
                } else if (order?.totalPrice && order.totalPrice > 0) {
                  systemTotalPrice = order.totalPrice;
                } else {
                  systemTotalPrice = productTotal;
                }

                const totalAmountNumber =
                  Number(editedTotalPrice) || systemTotalPrice;
                const remainingAmount = Math.max(
                  0,
                  totalAmountNumber - advancePaymentValue
                );
                amountDueRef.current = remainingAmount;

                return (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs sm:text-sm py-2 border-b font-medium">
                      <span className="text-gray-600">
                        Invoiced Amount:
                      </span>
                      <span>Rs {productTotal.toFixed(2)}</span>
                    </div>

                    {systemTotalPrice !== productTotal && (
                      <div className="flex justify-between text-xs sm:text-sm py-2 border-b">
                        <span className="text-gray-600">Create Order Billed:</span>
                        <span>Rs {systemTotalPrice.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-xs sm:text-sm py-2 border-b font-medium">
                      <span className="text-gray-600">Final Amount:</span>
                      <div className="text-right">
                        {isEditingTotalPrice ? (
                          <Input
                            type="number"
                            value={editedTotalPrice}
                            onChange={(e) =>
                              setEditedTotalPrice(e.target.value)
                            }
                            onBlur={() => setIsEditingTotalPrice(false)}
                            autoFocus
                            className="w-24 sm:w-32 h-6 text-xs"
                          />
                        ) : (
                          <div
                            onDoubleClick={() =>
                              setIsEditingTotalPrice(true)
                            }
                            className="cursor-pointer"
                          >
                            <span>
                              Rs {Number(editedTotalPrice).toFixed(2)}
                            </span>
                            <div className="text-[10px] text-gray-500 mt-1">
                              (double-click to edit)
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm py-2 border-b">
                      <span className="text-gray-600">
                        Advance Payment:
                      </span>
                      <span className="font-medium text-green-600">
                        Rs {advancePaymentValue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm py-2 border-b bg-blue-50 px-2 rounded font-medium">
                      <span>Amount Due:</span>
                      <span className="text-blue-700">
                        Rs {remainingAmount.toFixed(2)}
                      </span>
                    </div>

                    {/* Show credit balance if "credits" option is selected */}
                    {paymentMethod === "credits" && (
                      <div className="flex justify-between text-xs sm:text-sm py-2 border-b">
                        <span className="text-gray-600">
                          Available Credits:
                        </span>
                        <span className="font-medium text-indigo-600">
                          Rs {creditBalance !== null
                            ? creditBalance.toFixed(2)
                            : "—"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Payment Method Selection */}
              <div>
                <Label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                  Payment Method:
                </Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value: any) => setPaymentMethod(value)}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">
                      <div className="flex items-center">
                        <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        <span className="text-xs sm:text-sm">Cash</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="card">
                      <div className="flex items-center">
                        <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        <span className="text-xs sm:text-sm">Card</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="cheque">
                      <div className="flex items-center">
                        <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        <span className="text-xs sm:text-sm">Cheque</span>
                      </div>
                    </SelectItem>
                    <SelectItem
                      value="credits"
                      disabled={creditBalance === null || creditBalance <= 0}
                    >
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        <span className="text-xs sm:text-sm">
                          Credits
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="online">
                      <div className="flex items-center">
                        <Globe className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        <span className="text-xs sm:text-sm">Pay Online</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cheque Details */}
              {paymentMethod === "cheque" && (
                <div className="space-y-3 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-yellow-600" />
                    <span className="text-xs sm:text-sm font-medium text-yellow-800">
                      Cheque Details Required
                    </span>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      Cheque Number *
                    </Label>
                    <Input
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      placeholder="e.g., 001234567890"
                      className="mt-1 border-2 border-yellow-300 focus:border-yellow-500 text-xs sm:text-sm h-9 sm:h-10"
                      required
                    />
                    {!chequeNumber && (
                      <p className="text-xs text-red-500 mt-1">
                        Cheque number is required
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      Bank Name *
                    </Label>
                    <Input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g., Bank of Ceylon"
                      className="mt-1 border-2 border-yellow-300 focus:border-yellow-500 text-xs sm:text-sm h-9 sm:h-10"
                      required
                    />
                    {!bankName && (
                      <p className="text-xs text-red-500 mt-1">
                        Bank name is required
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      Cheque Date
                    </Label>
                    <Input
                      type="date"
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                      className="mt-1 border-2 border-yellow-300 focus:border-yellow-500 text-xs sm:text-sm h-9 sm:h-10"
                      max={new Date().toISOString().split("T")[0]}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to use today&apos;s date
                    </p>
                  </div>

                  {(!chequeNumber || !bankName) && (
                    <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                      <p className="text-xs text-red-600 font-medium">
                        ⚠️ Both cheque number and bank name are required for
                        cheque payments
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Online Payment Details */}
              {paymentMethod === "online" && (
                <div className="space-y-3 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Globe className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-blue-600" />
                    <span className="text-xs sm:text-sm font-medium text-blue-800">
                      Online Payment Details Required
                    </span>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      Bank Name *
                    </Label>
                    <Input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g., Bank of Ceylon"
                      className="mt-1 border-2 border-blue-300 focus:border-blue-500 text-xs sm:text-sm h-9 sm:h-10"
                      required
                    />
                    {!bankName && (
                      <p className="text-xs text-red-500 mt-1">
                        Bank name is required
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                      Bill Number *
                    </Label>
                    <Input
                      value={billNumber}
                      onChange={(e) => setBillNumber(e.target.value)}
                      placeholder="e.g., BILL123456789"
                      className="mt-1 border-2 border-blue-300 focus:border-blue-500 text-xs sm:text-sm h-9 sm:h-10"
                      required
                    />
                    {!billNumber && (
                      <p className="text-xs text-red-500 mt-1">
                        Bill number is required
                      </p>
                    )}
                  </div>

                  {(!bankName || !billNumber) && (
                    <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                      <p className="text-xs text-red-600 font-medium">
                        ⚠️ Both bank name and bill number are required for
                        online payments
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Amount */}
              <div>
                <Label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">
                  Enter Payment Amount (Rs):
                </Label>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full rounded-lg text-xs sm:text-sm h-9 sm:h-10"
                />
                <div className="flex flex-col sm:flex-row sm:items-center mt-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPaidAmount(amountDueRef.current.toString())
                    }
                    className="text-xs w-full sm:w-auto"
                  >
                    Pay Full Amount (Rs{" "}
                    {amountDueRef.current.toFixed(2)})
                  </Button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t bg-white sticky bottom-0">
              <Button
                variant="outline"
                onClick={() => setShowCompleteModal(false)}
                className="rounded-lg text-xs sm:text-sm h-9 sm:h-10 order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCompleteTaskWithPayment}
                className="rounded-lg text-xs sm:text-sm h-9 sm:h-10 order-1 sm:order-2"
                disabled={
                  !paidAmount ||
                  parseFloat(paidAmount) <= 0 ||
                  isSubmitting ||
                  (paymentMethod === "cheque" && (!chequeNumber || !bankName)) ||
                  (paymentMethod === "online" && (!billNumber || !bankName))
                }
              >
                {isSubmitting ? (
                  <>
                    <div className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    <span className="hidden sm:inline">Processing...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <span className="break-words">
                    Pay &{" "}
                    {paymentMethod === "cheque" || paymentMethod === "online"
                      ? "Temporary Complete"
                      : "Complete"}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cheque Management Modal */}
      {showChequeModal && currentChequeTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl w-full max-w-sm sm:max-w-md shadow-xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b bg-white sticky top-0">
              <h2 className="text-sm sm:text-lg font-semibold pr-4">
                {chequeAction === "successful"
                  ? "Mark Cheque as Successful"
                  : "Mark Cheque as Returned"}
              </h2>
              <button
                onClick={() => setShowChequeModal(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors text-gray-500 flex-shrink-0"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between text-xs sm:text-sm py-2 border-b">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-medium break-all">
                    {currentChequeTask.orderId}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm py-2 border-b">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium text-right break-words max-w-[60%]">
                    {getCustomerNameByOrderId(
                      currentChequeTask.orderId
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm py-2 border-b">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium flex items-center">
                    {renderPaymentMethodIcon(
                      currentChequeTask.lastPaymentMethod || "cheque"
                    )}
                    <span className="ml-1 capitalize">
                      {currentChequeTask.lastPaymentMethod || "cheque"}
                    </span>
                  </span>
                </div>

                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                    Notes (Optional):
                  </Label>
                  <Textarea
                    value={chequeNotes}
                    onChange={(e) => setChequeNotes(e.target.value)}
                    placeholder={
                      chequeAction === "successful"
                        ? "Add any notes about the successful payment..."
                        : "Add notes about why the cheque was returned..."
                    }
                    className="w-full text-xs sm:text-sm min-h-[80px] resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t bg-white sticky bottom-0">
              <Button
                variant="outline"
                onClick={() => setShowChequeModal(false)}
                className="rounded-lg text-xs sm:text-sm h-9 sm:h-10 order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleChequeAction}
                className={`rounded-lg text-xs sm:text-sm h-9 sm:h-10 order-1 sm:order-2 ${chequeAction === "successful"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
                  }`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    <span className="hidden sm:inline">Processing...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <span className="break-words">
                    {chequeAction === "successful"
                      ? "Mark as Successful"
                      : "Mark as Returned"}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Payment Completion Modal */}
      {showCreditCompleteModal && currentCreditTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl w-full max-w-sm sm:max-w-md shadow-xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b bg-white sticky top-0">
              <h2 className="text-sm sm:text-lg font-semibold pr-4">
                Complete Credit Payment
              </h2>
              <button
                onClick={() => {
                  setShowCreditCompleteModal(false);
                  setCurrentCreditTask(null);
                }}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors text-gray-500 flex-shrink-0"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-100 rounded-full mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>

                <div className="text-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Confirm Credit Payment Completion
                  </h3>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to mark this order as completed? This will move the order from "Temporary Completed" to "Completed" status.
                  </p>
                </div>

                <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between text-sm py-2 border-b">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-medium">
                      {currentCreditTask.orderId}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium text-right max-w-[60%] break-words">
                      {getCustomerNameByOrderId(currentCreditTask.orderId)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-medium flex items-center">
                      {renderPaymentMethodIcon("credit")}
                      <span className="ml-1 capitalize">Credit</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t bg-white sticky bottom-0">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreditCompleteModal(false);
                  setCurrentCreditTask(null);
                }}
                className="rounded-lg text-xs sm:text-sm h-9 sm:h-10 order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCompleteCreditPayment}
                className="rounded-lg text-xs sm:text-sm h-9 sm:h-10 order-1 sm:order-2 bg-green-600 hover:bg-green-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    <span className="hidden sm:inline">Processing...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    <span className="break-words">Mark as Completed</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Tasks */}
      <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
          <CardTitle className="flex items-center text-lg">
            <Clock className="h-5 w-5 mr-2 text-amber-500" />
            Pending Tasks
            <Badge className="ml-2 bg-amber-100 text-amber-800 border border-amber-200">
              {pendingTasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pendingTasks.length === 0 ? (
            <EmptyState message="No pending tasks available." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50 border-b border-gray-100">
                    <TableRow>
                      <TableHead className="font-medium text-gray-600">
                        Order ID
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Customer
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Category
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Status
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Employee
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Details
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Assign
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTasksPaginated.map((task) => (
                      <TableRow
                        key={task._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <TableCell className="font-medium text-blue-600">
                          {task.orderId}
                        </TableCell>
                        <TableCell>
                          {getCustomerNameByOrderId(task.orderId)}
                        </TableCell>
                        <TableCell>
                          {task.category || "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Badge className={getBadgeColor(task.status)}>
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <User className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                            <span className="text-sm">
                              {task.employeeId
                                ? employees.find(
                                  (emp) => emp._id === task.employeeId
                                )?.name || "Unassigned"
                                : "Unassigned"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => showTaskDetails(task._id)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 h-auto text-xs"
                          >
                            View Details
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={task.employeeId || ""}
                            onValueChange={(value) =>
                              handleAssignEmployee(task._id, value)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs rounded-md w-32 bg-white border-gray-200">
                              <SelectValue placeholder="Assign" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map((emp) => (
                                <SelectItem key={emp._id} value={emp._id}>
                                  {emp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="p-4 border-t border-gray-100">
                <PaginationControls
                  currentPage={pendingPage}
                  totalPages={getTotalPages(pendingTasks.length)}
                  onPageChange={setPendingPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* In Progress Tasks */}
      <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
          <CardTitle className="flex items-center text-lg">
            <PackageOpen className="h-5 w-5 mr-2 text-blue-500" />
            In Progress Tasks
            <Badge className="ml-2 bg-blue-100 text-blue-800 border border-blue-200">
              {inProgressTasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {inProgressTasks.length === 0 ? (
            <EmptyState message="No tasks in progress." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50 border-b border-gray-100">
                    <TableRow>
                      <TableHead className="font-medium text-gray-600">
                        Order ID
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Customer
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Category
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Status
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Products
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Employee
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Details
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Actions
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Workshop
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inProgressTasksPaginated.map((task) => (
                      <TableRow
                        key={task._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <TableCell className="font-medium text-blue-600">
                          {task.orderId}
                        </TableCell>
                        <TableCell>
                          {getCustomerNameByOrderId(task.orderId)}
                        </TableCell>
                        <TableCell>
                          {task.category || "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Badge className={getBadgeColor(task.status)}>
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <PackageOpen className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                            <span className="text-sm">
                              {task.products && task.products.length > 0
                                ? `${task.products.length} item(s)`
                                : "No products"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <User className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                            <span className="text-sm">
                              {task.employeeId
                                ? employees.find(
                                  (emp) => emp._id === task.employeeId
                                )?.name || "Unassigned"
                                : "Unassigned"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => showTaskDetails(task._id)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 h-auto text-xs"
                          >
                            View Details
                          </Button>
                        </TableCell>
                        <TableCell>
                          {renderInProgressActionButtons(task)}
                        </TableCell>
                        <TableCell>
                          {!task.isSent ? (
                            <Button
                              onClick={() => handleSendToWorkshop(task._id)}
                              className="bg-purple-600 hover:bg-purple-700 px-3 py-2 h-auto text-xs rounded-lg"
                              size="sm"
                            >
                              Send to Workshop
                            </Button>
                          ) : (
                            <span className="text-sm text-purple-700 flex items-center px-2 py-1 rounded-md bg-purple-50 border border-purple-100">
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Sent
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="p-4 border-t border-gray-100">
                <PaginationControls
                  currentPage={inProgressPage}
                  totalPages={getTotalPages(inProgressTasks.length)}
                  onPageChange={setInProgressPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Completed Tasks */}
      <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
          <CardTitle className="flex items-center text-lg">
            <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
            Completed Tasks
            <Badge className="ml-2 bg-green-100 text-green-800 border border-green-200">
              {completedTasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {completedTasks.length === 0 ? (
            <EmptyState message="No completed tasks." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50 border-b border-gray-100">
                    <TableRow>
                      <TableHead className="font-medium text-gray-600">
                        Order ID
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Customer
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Category
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Status
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Payment Method
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Details
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedTasksPaginated.map((task) => {
                      const displayStatus = getDisplayStatus(task);
                      return (
                        <TableRow
                          key={task._id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <TableCell className="font-medium text-blue-600">
                            {task.orderId}
                          </TableCell>
                          <TableCell>
                            {getCustomerNameByOrderId(task.orderId)}
                          </TableCell>
                          <TableCell>
                            {task.category || "Unknown"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getBadgeColor(
                                task.status,
                                displayStatus
                              )}
                            >
                              {displayStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {task.lastPaymentMethod ? (
                              <div className="flex items-center">
                                {renderPaymentMethodIcon(
                                  task.lastPaymentMethod
                                )}
                                <span className="ml-1 text-sm capitalize">
                                  {task.lastPaymentMethod}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">
                                –
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => showTaskDetails(task._id)}
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 h-auto text-xs"
                            >
                              View Details
                            </Button>
                          </TableCell>
                          <TableCell>
                            {renderCompletedActionButton(task)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="p-4 border-t border-gray-100">
                <PaginationControls
                  currentPage={completedPage}
                  totalPages={getTotalPages(completedTasks.length)}
                  onPageChange={setCompletedPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Temporary Completed Tasks */}
      <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg">
              <Calendar className="h-5 w-5 mr-2 text-indigo-500" />
              Temporary Completed Tasks (Cheque Pending)
              <Badge className="ml-2 bg-indigo-100 text-indigo-800 border border-indigo-200">
                {temporaryCompletedTasks.length}
              </Badge>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Filter by Payment Method:</label>
              <Select
                value={temporaryPaymentFilter}
                onValueChange={setTemporaryPaymentFilter}
              >
                <SelectTrigger className="w-40 h-8">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {temporaryCompletedTasks.length === 0 ? (
            <EmptyState message="No temporary completed tasks." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50 border-b border-gray-100">
                    <TableRow>
                      <TableHead className="font-medium text-gray-600">
                        Order ID
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Customer
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Category
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Status
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Payment Method
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Cheque Status
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Details
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {temporaryTasksPaginated.map((task) => (
                      <TableRow
                        key={task._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <TableCell className="font-medium text-blue-600">
                          {task.orderId}
                        </TableCell>
                        <TableCell>
                          {getCustomerNameByOrderId(task.orderId)}
                        </TableCell>
                        <TableCell>
                          {task.category || "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Badge className={getBadgeColor(task.status)}>
                            {getDisplayStatus(task)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {renderPaymentMethodIcon(
                              getDisplayPaymentMethod(task)
                            )}
                            <span className="ml-1 text-sm capitalize">
                              {getDisplayPaymentMethod(task)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {!isCreditPayment(task) ? (
                            <Badge
                              className={
                                task.chequeStatus === "pending"
                                  ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                  : task.chequeStatus === "cleared"
                                    ? "bg-green-100 text-green-800 border border-green-200"
                                    : "bg-red-100 text-red-800 border border-red-200"
                              }
                            >
                              {task.chequeStatus || "pending"}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => showTaskDetails(task._id)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 h-auto text-xs"
                          >
                            View Details
                          </Button>
                        </TableCell>
                        <TableCell>
                          {renderTemporaryCompletedActions(task)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="p-4 border-t border-gray-100">
                <PaginationControls
                  currentPage={temporaryPage}
                  totalPages={getTotalPages(
                    temporaryCompletedTasks.length
                  )}
                  onPageChange={setTemporaryPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Returned Tasks */}
      <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
          <CardTitle className="flex items-center text-lg">
            <RotateCcw className="h-5 w-5 mr-2 text-red-500" />
            Returned Tasks (Cheque Bounced)
            <Badge className="ml-2 bg-red-100 text-red-800 border border-red-200">
              {returnedTasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {returnedTasks.length === 0 ? (
            <EmptyState message="No returned tasks." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50 border-b border-gray-100">
                    <TableRow>
                      <TableHead className="font-medium text-gray-600">
                        Order ID
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Customer
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Category
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Status
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Payment Method
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Return Notes
                      </TableHead>
                      <TableHead className="font-medium text-gray-600">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnedTasksPaginated.map((task) => (
                      <TableRow
                        key={task._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <TableCell className="font-medium text-blue-600">
                          {task.orderId}
                        </TableCell>
                        <TableCell>
                          {getCustomerNameByOrderId(task.orderId)}
                        </TableCell>
                        <TableCell>
                          {task.category || "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Badge className={getBadgeColor(task.status)}>
                            {getDisplayStatus(task)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {renderPaymentMethodIcon(
                              task.lastPaymentMethod || "cheque"
                            )}
                            <span className="ml-1 text-sm capitalize">
                              {task.lastPaymentMethod || "cheque"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate text-sm text-gray-600">
                            {task.chequeNotes || "Cheque returned by bank"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {renderReturnedActionButton(task)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="p-4 border-t border-gray-100">
                <PaginationControls
                  currentPage={returnedPage}
                  totalPages={getTotalPages(returnedTasks.length)}
                  onPageChange={setReturnedPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}