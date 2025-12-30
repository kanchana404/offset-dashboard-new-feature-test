"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  Package, 
  RefreshCw, 
  Calendar, 
  DollarSign, 
  Building,
  Truck,
  ArrowUpDown,
  Search,
  CheckCircle,
  FileText,
  CreditCard,
  X,
  Printer,
  Eye,
  User,
  Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

type SentOrder = {
  orderId: string;
  customerName: string;
  orderDate: string;
  totalPrice: number;
  sentBranch: string;
  status: string;
  level: number;
  invoiceCreated?: boolean;
  invoiceData?: any;
  products?: any[];
  fullPayment?: number;
  lastPaymentMethod?: string;
  paymentHistory?: any[];
  artworkImage?: string;
  images?: string[];
  taskImages?: string[];
};

// Helper to map status to badge classes
const getBadgeClass = (status: string) => {
  switch (status) {
    case "Sent to Main Branch":
      return "bg-blue-100 text-blue-800 border border-blue-200";
    case "In Progress":
      return "bg-green-100 text-green-800 border border-green-200";
    case "Sent to Branch":
      return "bg-amber-100 text-amber-800 border border-amber-200";
    case "Completed":
      return "bg-green-100 text-green-800 border border-green-200";
    case "Temporary Completed":
      return "bg-orange-100 text-orange-800 border border-orange-200";
    default:
      return "bg-gray-100 text-gray-800 border border-gray-200";
  }
};

// Helper to get display status
const getDisplayStatus = (order: SentOrder) => {
  if (order.status === "Temporary Completed") {
    return "Temporary Completed (Awaiting Confirmation)";
  }
  return order.status;
};

export default function SentOrdersPage() {
  const [sentOrders, setSentOrders] = useState<SentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOrders, setFilteredOrders] = useState<SentOrder[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  } | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [ordersPerPage] = useState(15);

  // Invoice Creation Modal State
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [currentInvoiceOrder, setCurrentInvoiceOrder] = useState<SentOrder | null>(null);
  const [invoiceProducts, setInvoiceProducts] = useState<any[]>([]);
  const [invoiceTotalAmount, setInvoiceTotalAmount] = useState<string>("");
  const [showInvoiceOrderDetails, setShowInvoiceOrderDetails] = useState(false);

  // Payment Modal State
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [currentOrderToComplete, setCurrentOrderToComplete] = useState<SentOrder | null>(null);
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "cheque" | "credits" | "online">("cash");
  const [chequeNumber, setChequeNumber] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [chequeDate, setChequeDate] = useState<string>("");
  const [billNumber, setBillNumber] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View Details Modal State
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<SentOrder | null>(null);

  // Product names cache
  const [productNames, setProductNames] = useState<Map<string, string>>(new Map());

  // Branch information state
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

  // Reset to page 1 when search term changes (but not if already on page 1)
  useEffect(() => {
    if (searchTerm.trim() && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm]); // Only depend on searchTerm, not currentPage

  const fetchSentOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      // Include search term in API call
      const searchParam = searchTerm.trim() ? `&search=${encodeURIComponent(searchTerm.trim())}` : '';
      const res = await fetch(`/api/sent-orders?page=${currentPage}&limit=${ordersPerPage}${searchParam}`);
      const data = await res.json();
      if (res.ok) {
        setSentOrders(data.sentOrders);
        setFilteredOrders(data.sentOrders);
        
        // Set pagination info from API response
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotalOrders(data.pagination.totalOrders);
        }
        
        // Set branch information from API response
        if (data.branchInfo) {
          setBranchInfo(data.branchInfo);
        }
        
        // Extract all product IDs and fetch their names
        const productIds = new Set<string>();
        data.sentOrders.forEach((order: SentOrder) => {
          if (order.products) {
            order.products.forEach((product: any) => {
              // Check both productType and product fields
              const productId = product.productType || product.product;
              if (productId && productId.match(/^[a-f0-9]{24}$/)) {
                productIds.add(productId);
              }
            });
          }
        });
        
        if (productIds.size > 0) {
          await fetchProductNames(Array.from(productIds));
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch sent orders",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error fetching sent orders:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch sent orders",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm, ordersPerPage]);

  // Debounced search effect - triggers fetchSentOrders when search term or page changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchSentOrders();
    }, 300); // Wait 300ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [fetchSentOrders]);

  const fetchProductNames = async (productIds: string[]) => {
    try {
      const res = await fetch("/api/products/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productIds }),
      });
      
      const data = await res.json();
      if (res.ok && data.products) {
        const newProductNames = new Map<string, string>();
        Object.entries(data.products).forEach(([id, product]: [string, any]) => {
          newProductNames.set(id, product.name);
        });
        setProductNames(newProductNames);
      }
    } catch (error) {
      console.error("Error fetching product names:", error);
    }
  };

  const handleReceiveOrder = async (orderId: string) => {
    setProcessingOrderId(orderId);
    try {
      const res = await fetch("/api/sent-orders/receive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast({
          title: "Success",
          description: "Order has been received successfully",
        });
        
        // Update the local state to reflect the changes
        setSentOrders(prevOrders => 
          prevOrders.filter(order => order.orderId !== orderId)
        );
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to receive order",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error receiving order:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to receive order",
        variant: "destructive",
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Sort function
  const sortedOrders = () => {
    if (!sortConfig) return filteredOrders;
    
    return [...filteredOrders].sort((a, b) => {
      if (a[sortConfig.key as keyof SentOrder] < b[sortConfig.key as keyof SentOrder]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key as keyof SentOrder] > b[sortConfig.key as keyof SentOrder]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getLevelColor = (level: number) => {
    if (level <= 1) return "bg-red-500";
    if (level <= 3) return "bg-amber-500";
    return "bg-green-500";
  };

  const getProductName = (productType: string) => {
    // Check if it's a MongoDB ObjectId (24 hex characters)
    if (productType && productType.match(/^[a-f0-9]{24}$/)) {
      return productNames.get(productType) || productType;
    }
    return productType;
  };

  // Invoice Creation Functions
  const openInvoiceModal = (order: SentOrder) => {
    setCurrentInvoiceOrder(order);
    
    // Initialize invoice products
    if (order.products && order.products.length > 0) {
      setInvoiceProducts(order.products.map((product: any) => ({
        ...product,
        dimensions: product.dimensions || ""
      })));
    } else {
      setInvoiceProducts([{
        productType: "Printing Service",
        productPrice: 0,
        productQuantity: 1,
        totalWaste: 0,
        dimensions: "",
      }]);
    }

    // Set total amount
    setInvoiceTotalAmount(order.totalPrice.toString());
    
    setShowInvoiceModal(true);
  };

  const handleInvoiceProductChange = (index: number, field: string, value: string | number) => {
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
        totalWaste: 0,
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
      return total + (product.productPrice * product.productQuantity);
    }, 0);
  };

  const handleCreateInvoice = async () => {
    if (!currentInvoiceOrder) return;

    try {
      setIsSubmitting(true);
      
      const totalAmount = parseFloat(invoiceTotalAmount) || calculateInvoiceProductsTotal();
      
      const res = await fetch("/api/sent-orders/create-invoice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: currentInvoiceOrder.orderId,
          products: invoiceProducts,
          totalAmount: totalAmount
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create invoice");
      }

      // Update local state
      setSentOrders(prev =>
        prev.map(order =>
          order.orderId === currentInvoiceOrder.orderId
            ? { ...order, invoiceCreated: true, invoiceData: data.invoice, products: invoiceProducts, totalPrice: totalAmount }
            : order
        )
      );

      toast({
        title: "Invoice Created",
        description: "Invoice has been created successfully. You can now proceed to payment.",
        variant: "default",
      });

      setShowInvoiceModal(false);
      setCurrentInvoiceOrder(null);
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

  // Payment Functions
  const openCompleteModal = (order: SentOrder) => {
    setCurrentOrderToComplete(order);
    setPaidAmount("");
    setPaymentMethod("cash");
    setChequeNumber("");
    setBankName("");
    setChequeDate("");
    setBillNumber("");
    setShowCompleteModal(true);
  };

  const handleCompleteOrderWithPayment = async () => {
    if (!currentOrderToComplete) return;

    const paymentAmount = parseFloat(paidAmount || "0");
    if (paymentAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount.",
        variant: "destructive",
      });
      return;
    }

    const requestData: any = {
      orderId: currentOrderToComplete.orderId,
      paidAmount: paymentAmount,
      paymentMethod,
      totalPrice: (currentOrderToComplete.invoiceCreated && currentOrderToComplete.invoiceData?.totalAmount) 
        ? currentOrderToComplete.invoiceData.totalAmount 
        : currentOrderToComplete.totalPrice,
    };

    if (paymentMethod === "cheque") {
      if (!chequeNumber.trim()) {
        toast({
          title: "Missing Cheque Number",
          description: "Please enter the cheque number.",
          variant: "destructive",
        });
        return;
      }
      if (!bankName.trim()) {
        toast({
          title: "Missing Bank Name",
          description: "Please enter the bank name.",
          variant: "destructive",
        });
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
        return;
      }
      if (!bankName.trim()) {
        toast({
          title: "Missing Bank Name",
          description: "Please enter the bank name.",
          variant: "destructive",
        });
        return;
      }
      requestData.billNumber = billNumber.trim();
      requestData.bankName = bankName.trim();
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/sent-orders/complete", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete order");
      }

      // Update local state
      setSentOrders((prev) =>
        prev.map((order) =>
          order.orderId === currentOrderToComplete.orderId
            ? { 
                ...order, 
                status: data.status || data.task?.status || (paymentMethod === "cash" || paymentMethod === "card" || paymentMethod === "online" ? "Completed" : "Temporary Completed"), 
                fullPayment: paymentAmount, 
                lastPaymentMethod: paymentMethod 
              }
            : order
        )
      );

      // Show appropriate toast message based on payment method
      if (paymentMethod === "cheque") {
        toast({
          title: "Payment Recorded",
          description: "Payment has been recorded. Order is now in Temporary Completed status until payment is confirmed.",
          variant: "default",
        });
      } else {
        toast({
          title: "Payment Processed",
          description: data.message,
          variant: "default",
        });
      }

      setShowCompleteModal(false);
      setCurrentOrderToComplete(null);
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

  // Function to print invoice for temporary completed orders
  const handlePrintInvoice = (order: SentOrder) => {
    // This would open the invoice in a new window for printing
    // For now, we'll show a toast message
    toast({
      title: "Print Invoice",
      description: `Invoice for order ${order.orderId} would be printed.`,
      variant: "default",
    });
  };

  // View Details Functions
  const openDetailsModal = (order: SentOrder) => {
    setSelectedOrderDetails(order);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedOrderDetails(null);
  };

  const printOrderDetails = (order: SentOrder) => {
    // Generate printable HTML content
    const printContent = generateOrderDetailsHTML(order);
    
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

  const generateOrderDetailsHTML = (order: SentOrder) => {
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
    const orderDate = new Date(order.orderDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    // Calculate totals
    const totalCost = order.totalPrice || 0;
    const fullPayment = order.fullPayment || 0;
    const remainingAmount = totalCost - fullPayment;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Details - ${order.orderId}</title>
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
                <h4>${branchInfo?.name || "Current Branch"}</h4>
                <div>
                    ${(() => {
                      if (branchInfo) {
                        const branchLocation = branchInfo.location || "Branch Location";
                        const branchContact = branchInfo.contact?.filter(contact => !contact.includes('@')).join(", ") || "Contact Information";
                        const branchEmail = branchInfo.contact?.find(contact => contact.includes('@')) || "branch@solidgraphic.lk";
                        return `${branchLocation}<br>${branchContact}<br>${branchEmail}`;
                      }
                      return "Branch Location<br>Contact Information<br>branch@solidgraphic.lk";
                    })()}
                </div>
            </div>
            <div class="other-branches-section">
                <h4>Other Branches</h4>
                <div style="font-size: 8px; line-height: 1.1;">
                    ${(() => {
                      // Get other branches (excluding current signed-in branch and Sales)
                      const otherBranches = allBranches.filter(branch => 
                        branch.name !== branchInfo?.name && 
                        branch.name !== "Sales"
                      );
                      return otherBranches.map(branch => `${branch.name} - ${branch.location}`).join('<br>');
                    })()}
                </div>
            </div>
        </div>

        <!-- Customer and Invoice Information -->
        <div class="customer-invoice-info">
            <div class="customer-info">
                <div class="info-line">
                    <label>Cus. Name</label>
                    <span>-</span>
                    <div class="filled-info">${order.customerName}</div>
                </div>
                <div class="info-line">
                    <label>Order Date</label>
                    <span>-</span>
                    <div class="filled-info">${orderDate}</div>
                </div>
                <div class="info-line">
                    <label>Progress</label>
                    <span>-</span>
                    <div class="filled-info">${order.level}/5</div>
                </div>
            </div>
            <div class="invoice-info">
                <div class="info-line">
                    <label>Order ID</label>
                    <span>-</span>
                    <div class="filled-info">${order.orderId}</div>
                </div>
                <div class="info-line">
                    <label>Print Date</label>
                    <span>-</span>
                    <div class="filled-info">${formattedDate}</div>
                </div>
                <div class="info-line">
                    <label>Print Time</label>
                    <span>-</span>
                    <div class="filled-info">${formattedTime}</div>
                </div>
            </div>
        </div>

        <!-- Products Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th>PRODUCT NAME</th>
                    <th>QUANTITY</th>
                    <th>RATE (Rs)</th>
                    <th>TOTAL PRICE (Rs)</th>
                </tr>
            </thead>
            <tbody>
                ${order.products && order.products.length > 0 ? 
                  order.products.map((product: any, index: number) => `
                    <tr>
                      <td>${getProductName(product.productType || product.product)}</td>
                      <td>${product.productQuantity || 1}</td>
                      <td>Rs ${product.productPrice?.toFixed(2) || '0.00'}</td>
                      <td>Rs ${((product.productPrice || 0) * (product.productQuantity || 1)).toFixed(2)}</td>
                    </tr>
                  `).join('') : 
                  `<tr><td>Order Items</td><td>1</td><td>Rs ${totalCost.toFixed(2)}</td><td>Rs ${totalCost.toFixed(2)}</td></tr>`
                }
            </tbody>
        </table>

        <!-- Footer Section -->
        <div class="footer-section">
            <div class="total-section" style="margin-left: auto;">
                <div class="total-line">
                    <span>SUB TOTAL</span>
                    <span>: Rs ${totalCost.toFixed(2)}</span>
                </div>
                ${fullPayment > 0 ? `
                <div class="total-line">
                    <span>FULL PAYMENT</span>
                    <span>: Rs ${fullPayment.toFixed(2)}</span>
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
            <strong>Order Status: ${getDisplayStatus(order)}</strong>
        </div>

        <!-- Thank You Message -->
        <div class="thank-you">
            Thank You... Come Again...
        </div>
    </div>

    <button onclick="window.print()" class="no-print" style="margin-top: 15px; padding: 8px 16px; background-color: #4a90e2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
        Print Order Details
    </button>
</body>
</html>
    `;
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center">
          <Truck className="mr-3 h-6 w-6 text-blue-600" />
          Sent Orders
        </h1>
        
         <Button 
           onClick={() => {
             if (currentPage !== 1) {
               setCurrentPage(1);
             } else {
               fetchSentOrders();
             }
           }} 
           variant="outline"
           className="rounded-lg border-gray-200"
         >
           <RefreshCw className="h-4 w-4 mr-2" />
           Refresh
         </Button>
      </div>

      {/* Search bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by order ID, customer name, or branch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-lg border-gray-200"
          />
        </div>
      </div>

      <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
          <CardTitle className="text-lg flex items-center">
            <Building className="mr-2 h-5 w-5 text-blue-600" />
            Orders Sent to Main Branch
            <Badge className="ml-2 bg-blue-100 text-blue-800 border border-blue-200">
              {totalOrders} {totalOrders !== 1 ? 'orders' : 'order'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 flex justify-center items-center">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="text-gray-500">Loading orders...</span>
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No sent orders found</p>
              {searchTerm && (
                <p className="text-gray-400 text-sm mt-1">Try adjusting your search criteria</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 border-b border-gray-100">
                  <TableRow>
                    <TableHead className="font-medium text-gray-600 cursor-pointer" onClick={() => requestSort('orderId')}>
                      <div className="flex items-center">
                        Order ID
                        {sortConfig?.key === 'orderId' && (
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="font-medium text-gray-600 cursor-pointer" onClick={() => requestSort('customerName')}>
                      <div className="flex items-center">
                        Customer
                        {sortConfig?.key === 'customerName' && (
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="font-medium text-gray-600 cursor-pointer" onClick={() => requestSort('orderDate')}>
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-3.5 w-3.5 text-gray-500" />
                        Order Date
                        {sortConfig?.key === 'orderDate' && (
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="font-medium text-gray-600 cursor-pointer" onClick={() => requestSort('totalPrice')}>
                      <div className="flex items-center">
                        <DollarSign className="mr-1 h-3.5 w-3.5 text-gray-500" />
                        Price
                        {sortConfig?.key === 'totalPrice' && (
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="font-medium text-gray-600 cursor-pointer" onClick={() => requestSort('sentBranch')}>
                      <div className="flex items-center">
                        Branch
                        {sortConfig?.key === 'sentBranch' && (
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="font-medium text-gray-600 cursor-pointer" onClick={() => requestSort('status')}>
                      <div className="flex items-center">
                        Status
                        {sortConfig?.key === 'status' && (
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="font-medium text-gray-600">
                      Products
                    </TableHead>
                    <TableHead className="font-medium text-gray-600 cursor-pointer" onClick={() => requestSort('level')}>
                      <div className="flex items-center">
                        Progress
                        {sortConfig?.key === 'level' && (
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="font-medium text-gray-600">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                 <TableBody>
                   {sortedOrders().map((order) => (
                     <TableRow key={`${order.orderId}-${productNames.size}`} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium text-blue-600">{order.orderId}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">Rs{order.totalPrice.toFixed(2)}</TableCell>
                      <TableCell>{order.sentBranch}</TableCell>
                      <TableCell>
                        <Badge className={getBadgeClass(order.status)}>
                          {getDisplayStatus(order)}
                        </Badge>
                      </TableCell>
                       <TableCell>
                         {/* Display products information */}
                         {order.products && order.products.length > 0 ? (
                           <div className="space-y-1">
                             {order.products.map((product: any, index: number) => (
                               <div key={index} className="text-xs text-gray-600">
                                 <span className="font-medium">{getProductName(product.productType || product.product)}</span>
                                 {product.productQuantity && (
                                   <span className="text-gray-500"> × {product.productQuantity}</span>
                                 )}
                                 {product.productPrice && (
                                   <span className="text-gray-500"> @ Rs{product.productPrice}</span>
                                 )}
                               </div>
                             ))}
                           </div>
                         ) : (
                           <span className="text-xs text-gray-400">No products</span>
                         )}
                       </TableCell>
                      <TableCell>
                        {/* Progress indicator */}
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div
                                className={`${getLevelColor(order.level)} h-2 rounded-full transition-all duration-300`}
                                style={{ width: `${(order.level / 5) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium ml-2 min-w-[40px] text-gray-700">
                              {order.level}/5
                            </span>
                          </div>
                          
                          {/* Progress steps */}
                          <div className="flex justify-between">
                            {[1, 2, 3, 4, 5].map((step) => (
                              <div 
                                key={step} 
                                className={`h-1.5 w-1.5 rounded-full ${
                                  step <= order.level 
                                    ? getLevelColor(order.level)
                                    : 'bg-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {/* View Details Button - Always visible */}
                          <Button
                            onClick={() => openDetailsModal(order)}
                            size="sm"
                            variant="outline"
                            className="bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                          
                          {/* Other action buttons */}
                          {order.status === "Sent to Branch" && order.level === 5 && !order.invoiceCreated && (
                            <Button
                              onClick={() => openInvoiceModal(order)}
                              size="sm"
                              className="bg-cyan-600 hover:bg-cyan-700 text-white"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Create Invoice
                            </Button>
                          )}
                          {order.status === "Sent to Branch" && order.level === 5 && order.invoiceCreated && (
                            <Button
                              onClick={() => openCompleteModal(order)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Pay
                            </Button>
                          )}
                          {order.status === "Sent to Branch" && order.level < 5 && (
                            <Button
                              onClick={() => handleReceiveOrder(order.orderId)}
                              disabled={processingOrderId === order.orderId}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {processingOrderId === order.orderId ? (
                                <div className="flex items-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Processing
                                </div>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Complete
                                </>
                              )}
                            </Button>
                          )}
                          {order.status === "Temporary Completed" && (
                            <Button
                              onClick={() => handlePrintInvoice(order)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Printer className="h-4 w-4 mr-1" />
                              Print Invoice
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-4 border-t bg-white rounded-b-xl">
          <div className="text-sm text-gray-600">
            Showing page {currentPage} of {totalPages} ({totalOrders} total orders)
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) {
                      setCurrentPage(currentPage - 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {/* Page numbers */}
              {(() => {
                const pages = [];
                const maxVisiblePages = 5;
                let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                
                // Adjust start page if we're near the end
                if (endPage - startPage < maxVisiblePages - 1) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }
                
                // Show ellipsis at the beginning if needed
                if (startPage > 1) {
                  pages.push(
                    <PaginationItem key={1}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(1);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="cursor-pointer"
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>
                  );
                  if (startPage > 2) {
                    pages.push(
                      <PaginationItem key="ellipsis-start">
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                }
                
                // Show visible page numbers
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <PaginationItem key={i}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(i);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        isActive={i === currentPage}
                        className="cursor-pointer"
                      >
                        {i}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
                
                // Show ellipsis at the end if needed
                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(
                      <PaginationItem key="ellipsis-end">
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  pages.push(
                    <PaginationItem key={totalPages}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(totalPages);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="cursor-pointer"
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
                
                return pages;
              })()}
              
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages) {
                      setCurrentPage(currentPage + 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Invoice Creation Modal */}
      {showInvoiceModal && currentInvoiceOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">
                Create Invoice
              </h2>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors text-gray-500"
                title="Close modal"
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
                      <span className="ml-2 font-medium">{currentInvoiceOrder.orderId}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Customer:</span>
                      <span className="ml-2 font-medium">{currentInvoiceOrder.customerName}</span>
                    </div>
                  </div>
                </div>

                {/* Editable Products */}
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
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-700">Quantity</Label>
                            <Input
                              value={product.dimensions || ""}
                              onChange={(e) => handleInvoiceProductChange(index, 'dimensions', e.target.value)}
                              placeholder="e.g. 10x15x2"
                              className="mt-1 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-700">Len / Wid / Qty</Label>
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
                              {(product.productPrice * product.productQuantity).toFixed(2)}
                            </div>
                          </div>
                          <div>
                            {invoiceProducts.length > 1 && (
                              <Button
                                onClick={() => removeInvoiceProduct(index)}
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                title="Remove product"
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
                      <Label className="text-sm font-medium text-gray-700">Total Amount (Rs)</Label>
                      <Input
                        type="number"
                        value={invoiceTotalAmount}
                        onChange={(e) => setInvoiceTotalAmount(e.target.value)}
                        placeholder="Total amount"
                        min="0"
                        step="0.01"
                        className="mt-1 w-48"
                      />
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
                {isSubmitting ? "Creating..." : "Create Invoice"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showCompleteModal && currentOrderToComplete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b bg-white sticky top-0">
              <h2 className="text-lg font-semibold pr-4">
                Complete Order with Payment
              </h2>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors text-gray-500 flex-shrink-0"
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-medium break-all">
                    {currentOrderToComplete.orderId}
                  </span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium text-right break-words max-w-[60%]">
                    {currentOrderToComplete.customerName}
                  </span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium">
                    Rs {(currentOrderToComplete.invoiceCreated && currentOrderToComplete.invoiceData?.totalAmount) 
                      ? currentOrderToComplete.invoiceData.totalAmount.toFixed(2)
                      : currentOrderToComplete.totalPrice.toFixed(2)}
                  </span>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Payment Amount (Rs):
                  </Label>
                  <Input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="Enter payment amount"
                    min="0"
                    step="0.01"
                    className="w-full"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Payment Method:
                  </Label>
                  <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="online">Online Payment</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {paymentMethod === "cash" || paymentMethod === "card" || paymentMethod === "online"
                      ? "Order will be marked as Completed immediately."
                      : "Order will be marked as Temporary Completed until payment is confirmed."
                    }
                  </p>
                </div>

                {paymentMethod === "cheque" && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Cheque Number:
                      </Label>
                      <Input
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value)}
                        placeholder="Enter cheque number"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Bank Name:
                      </Label>
                      <Input
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Enter bank name"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Cheque Date (Optional):
                      </Label>
                      <Input
                        type="date"
                        value={chequeDate}
                        onChange={(e) => setChequeDate(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === "online" && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Bill Number:
                      </Label>
                      <Input
                        value={billNumber}
                        onChange={(e) => setBillNumber(e.target.value)}
                        placeholder="Enter bill number"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Bank Name:
                      </Label>
                      <Input
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Enter bank name"
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 p-6 border-t bg-white sticky bottom-0">
              <Button
                variant="outline"
                onClick={() => setShowCompleteModal(false)}
                className="rounded-lg text-sm h-10 order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCompleteOrderWithPayment}
                className="rounded-lg text-sm h-10 order-1 sm:order-2 bg-green-600 hover:bg-green-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    Processing...
                  </>
                ) : (
                  "Process Payment"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailsModal && selectedOrderDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center p-6 border-b">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Order Details
                </h2>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => printOrderDetails(selectedOrderDetails)}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print</span>
                </Button>
                <button
                  onClick={closeDetailsModal}
                  className="rounded-full p-1.5 hover:bg-gray-100 transition-colors text-gray-500"
                  title="Close modal"
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
                    {selectedOrderDetails.customerName}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                    <Building className="h-4 w-4 mr-2 text-green-500" />
                    Sent Branch
                  </h3>
                  <div className="text-gray-800 font-medium">
                    {selectedOrderDetails.sentBranch}
                  </div>
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
                      {selectedOrderDetails.orderId}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-200">
                    <p className="text-xs text-gray-500 mb-1 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Order Date
                    </p>
                    <p className="font-medium text-gray-900 text-sm">
                      {new Date(selectedOrderDetails.orderDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-200">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <Badge className={getBadgeClass(selectedOrderDetails.status)}>
                      {getDisplayStatus(selectedOrderDetails)}
                    </Badge>
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
                      Rs {selectedOrderDetails.totalPrice?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-green-200">
                    <p className="text-xs text-gray-500 mb-1">Full Payment</p>
                    <p className="font-semibold text-lg text-blue-600">
                      Rs {selectedOrderDetails.fullPayment?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-green-200">
                    <p className="text-xs text-gray-500 mb-1">Payment Method</p>
                    <p className="font-semibold text-lg text-purple-600">
                      {selectedOrderDetails.lastPaymentMethod || 'Not specified'}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-green-200">
                    <p className="text-xs text-gray-500 mb-1">Progress Level</p>
                    <p className="font-semibold text-lg text-orange-600">
                      {selectedOrderDetails.level}/5
                    </p>
                  </div>
                </div>
                
                {/* Payment History */}
                {selectedOrderDetails.paymentHistory && selectedOrderDetails.paymentHistory.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-700 mb-2">Payment History</h4>
                    <div className="space-y-2">
                      {selectedOrderDetails.paymentHistory.map((payment, index) => (
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
                  <Package className="h-4 w-4 mr-2 text-yellow-500" />
                  Products & Services
                </h3>
                <div className="space-y-3">
                  {selectedOrderDetails.products && selectedOrderDetails.products.length > 0 ? (
                    selectedOrderDetails.products.map((product, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border border-yellow-200">
                         <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                           <div>
                             <span className="text-gray-500">Product:</span>
                             <p className="font-medium text-gray-900">
                               {getProductName(product.productType || product.product)}
                             </p>
                           </div>
                          <div>
                            <span className="text-gray-500">Quantity:</span>
                            <p className="font-medium text-gray-900">{product.productQuantity || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Rate (Rs):</span>
                            <p className="font-medium text-gray-900">{product.productPrice?.toFixed(2) || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Total:</span>
                            <p className="font-medium text-gray-900">
                              Rs {((product.productPrice || 0) * (product.productQuantity || 1)).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-sm italic">
                      No products added to this order
                    </div>
                  )}
                </div>
              </div>

              {/* Artwork & Images Section */}
              {(selectedOrderDetails.artworkImage || (selectedOrderDetails.images && selectedOrderDetails.images.length > 0) || (selectedOrderDetails.taskImages && selectedOrderDetails.taskImages.length > 0)) && (
                <div className="p-4 bg-pink-50 rounded-lg border border-pink-100 mb-6">
                  <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-pink-500" />
                    Artwork & Images
                  </h3>
                  <div className="space-y-4">
                    {/* Artwork Image */}
                    {selectedOrderDetails.artworkImage && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Artwork</h4>
                        <div className="bg-white p-3 rounded-lg border border-pink-200">
                          <img 
                            src={selectedOrderDetails.artworkImage} 
                            alt="Artwork" 
                            className="max-w-full h-auto rounded-md cursor-pointer hover:opacity-75 transition-opacity"
                            onClick={() => window.open(selectedOrderDetails.artworkImage, '_blank')}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Order Images */}
                    {selectedOrderDetails.images && selectedOrderDetails.images.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Order Images</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {selectedOrderDetails.images.map((image, index) => (
                            <div key={index} className="bg-white p-2 rounded-lg border border-pink-200">
                              <img 
                                src={image} 
                                alt={`Order image ${index + 1}`}
                                className="w-full h-32 object-cover rounded-md cursor-pointer hover:opacity-75 transition-opacity"
                                onClick={() => window.open(image, '_blank')}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Task Images */}
                    {selectedOrderDetails.taskImages && selectedOrderDetails.taskImages.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Task Images</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {selectedOrderDetails.taskImages.map((image, index) => (
                            <div key={index} className="bg-white p-2 rounded-lg border border-pink-200">
                              <img 
                                src={image} 
                                alt={`Task image ${index + 1}`}
                                className="w-full h-32 object-cover rounded-md cursor-pointer hover:opacity-75 transition-opacity"
                                onClick={() => window.open(image, '_blank')}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Progress Section */}
              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-indigo-500" />
                  Progress Tracking
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className="bg-indigo-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${(selectedOrderDetails.level / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium ml-3 min-w-[40px] text-gray-700">
                      {selectedOrderDetails.level}/5
                    </span>
                  </div>
                  
                  {/* Progress steps */}
                  <div className="flex justify-between">
                    {[1, 2, 3, 4, 5].map((step) => (
                      <div 
                        key={step} 
                        className={`h-2 w-2 rounded-full ${
                          step <= selectedOrderDetails.level 
                            ? 'bg-indigo-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
