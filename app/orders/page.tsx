"use client";

import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  Calendar,
  User,
  Phone,
  Mail,
  Tag,
  Building,
  Clock,
  Search,
  RefreshCw,
  ArrowUpDown,
  X,
  DollarSign,
} from "lucide-react";

type CompletedOrder = {
  _id: string;
  orderId: string;
  productType: string;
  priority: string;
  status: string;
  branch: string;
  description?: string;
  startTime: string;
  endTime?: string;
  // New computed fields from Task
  totalCost: number;
  advancePayment?: number;
  fullPayment?: number;
  balanceDue: number;
  // Order details from Order table
  customerName?: string;
  customerEmail?: string;
  whatsappNumber?: string;
  category?: string;
  orderDescription?: string;
  orderDate?: string;
  images?: string[]; // Combined images for backward compatibility
  orderImages?: string[]; // Original order images
  taskImages?: string[]; // Task-specific images
  artworkImage?: string; // Artwork image from task
};

export default function CompletedOrdersPage() {
  const [completedOrders, setCompletedOrders] = useState<CompletedOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<CompletedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<CompletedOrder | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  }>({
    key: "endTime",
    direction: "descending"
  }); // Default sort by endTime (latest first)
  const { toast } = useToast();

  useEffect(() => {
    fetchCompletedOrders();
  }, []);

  useEffect(() => {
    const filtered = completedOrders.filter((order) =>
      (order.orderId?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customerName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.productType?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredOrders(filtered);
  }, [searchTerm, completedOrders]);

  const fetchCompletedOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/completed-orders");
      const data = await res.json();
      
      if (res.ok) {
        setCompletedOrders(data.completedOrders);
        setFilteredOrders(data.completedOrders);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch completed orders",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error fetching completed orders:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch completed orders",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return "-";
    return `Rs ${amount.toLocaleString()}`;
  };

  const viewOrderDetails = (order: CompletedOrder) => {
    setSelectedOrder(order);
    setIsDialogOpen(true);
  };

  // Sorting functions
  const sortedOrders = () => {
    return [...filteredOrders].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof CompletedOrder];
      const bValue = b[sortConfig.key as keyof CompletedOrder];
      
      // Handle date sorting specifically
      if (sortConfig.key === "endTime" || sortConfig.key === "startTime" || sortConfig.key === "orderDate") {
        const aDate = aValue ? new Date(aValue as string).getTime() : 0;
        const bDate = bValue ? new Date(bValue as string).getTime() : 0;
        return sortConfig.direction === "ascending" ? aDate - bDate : bDate - aDate;
      }
      
      // Handle other value types
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      
      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
      return 0;
    });
  };

  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800 border border-red-200";
      case "Medium":
        return "bg-amber-100 text-amber-800 border border-amber-200";
      case "Low":
        return "bg-green-100 text-green-800 border border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center">
          <CheckCircle className="mr-3 h-6 w-6 text-green-600" />
          Completed Orders
        </h1>
        <Button 
          onClick={fetchCompletedOrders} 
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
            placeholder="Search by order ID, customer name, or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-lg border-gray-200"
          />
        </div>
      </div>

      <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CardTitle className="text-lg flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                Completed Orders for Your Branch
                <Badge className="ml-2 bg-green-100 text-green-800 border border-green-200">
                  {filteredOrders.length}
                </Badge>
              </CardTitle>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="mr-1 h-4 w-4" />
              Sorted by: Latest First
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 flex justify-center items-center">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                <span className="text-gray-500">Loading completed orders...</span>
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No completed orders found</p>
              {searchTerm && (
                <p className="text-gray-400 text-sm mt-1">Try adjusting your search criteria</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 border-b border-gray-100">
                  <TableRow>
                    <TableHead className="font-medium text-gray-600 cursor-pointer" onClick={() => requestSort("orderId")}>
                      <div className="flex items-center">
                        Order ID
                        <ArrowUpDown className={`ml-1 h-3 w-3 ${sortConfig?.key === "orderId" ? "text-blue-600" : "text-gray-400"}`} />
                      </div>
                    </TableHead>
                    <TableHead className="font-medium text-gray-600 cursor-pointer" onClick={() => requestSort("customerName")}>
                      <div className="flex items-center">
                        Customer
                        <ArrowUpDown className={`ml-1 h-3 w-3 ${sortConfig?.key === "customerName" ? "text-blue-600" : "text-gray-400"}`} />
                      </div>
                    </TableHead>
                    <TableHead className="font-medium text-gray-600 cursor-pointer" onClick={() => requestSort("productType")}>
                      <div className="flex items-center">
                        Product
                        <ArrowUpDown className={`ml-1 h-3 w-3 ${sortConfig?.key === "productType" ? "text-blue-600" : "text-gray-400"}`} />
                      </div>
                    </TableHead>
                    <TableHead className="font-medium text-gray-600 cursor-pointer" onClick={() => requestSort("priority")}>
                      <div className="flex items-center">
                        Priority
                        <ArrowUpDown className={`ml-1 h-3 w-3 ${sortConfig?.key === "priority" ? "text-blue-600" : "text-gray-400"}`} />
                      </div>
                    </TableHead>
                    <TableHead className="font-medium text-gray-600">Status</TableHead>
                    <TableHead className="font-medium text-gray-600 cursor-pointer" onClick={() => requestSort("endTime")}>
                      <div className="flex items-center">
                        Completed On
                        <ArrowUpDown className={`ml-1 h-3 w-3 ${sortConfig?.key === "endTime" ? "text-blue-600" : ""}`} />
                        {sortConfig?.key === "endTime" && sortConfig.direction === "descending" && (
                          <span className="ml-1 text-xs text-blue-600">↓</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="font-medium text-gray-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrders().map((order) => (
                    <TableRow key={order._id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium text-blue-600">{order.orderId}</TableCell>
                      <TableCell>{order.customerName || "N/A"}</TableCell>
                      <TableCell>{order.productType}</TableCell>
                      <TableCell>
                        <Badge className={getPriorityBadge(order.priority)}>
                          {order.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800 border border-green-200">
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600">{formatDate(order.endTime)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => viewOrderDetails(order)}
                          className="rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl w-[95vw] rounded-xl overflow-hidden p-0 max-h-[90vh] overflow-y-auto">
          <div className="bg-gray-50 p-4 sm:p-6 border-b sticky top-0 z-10">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold flex flex-wrap items-center gap-2">
                <span className="text-blue-600 font-mono">#{selectedOrder?.orderId}</span>
                <span>Order Details</span>
              </DialogTitle>
              <DialogDescription>
                <div className="flex items-center text-gray-500 text-sm sm:text-base">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                  Completed on {formatDate(selectedOrder?.endTime)}
                </div>
              </DialogDescription>
            </DialogHeader>
          </div>
          {selectedOrder && (
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-6">
                {/* Customer Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center border-b pb-2">
                      <User className="h-5 w-5 mr-2 text-blue-600" />
                      <h3 className="font-semibold text-base sm:text-lg text-gray-800">Customer Information</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-start space-x-3">
                        <User className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-gray-500">Customer Name</p>
                          <p className="font-medium truncate">{selectedOrder.customerName || "N/A"}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Phone className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-gray-500">WhatsApp Number</p>
                          <p className="font-medium truncate">{selectedOrder.whatsappNumber || "N/A"}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Mail className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-gray-500">Email</p>
                          <p className="font-medium truncate">{selectedOrder.customerEmail || "N/A"}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Calendar className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-gray-500">Order Date</p>
                          <p className="font-medium">{formatDate(selectedOrder.orderDate)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Order Information */}
                  <div className="space-y-4">
                    <div className="flex items-center border-b pb-2">
                      <Tag className="h-5 w-5 mr-2 text-blue-600" />
                      <h3 className="font-semibold text-base sm:text-lg text-gray-800">Order Information</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-start space-x-3">
                        <Tag className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-gray-500">Category</p>
                          <p className="font-medium truncate">{selectedOrder.category || selectedOrder.productType}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <ArrowUpDown className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-gray-500">Priority</p>
                          <div className="flex items-center mt-1">
                            <span className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${
                              selectedOrder.priority === "High" ? "bg-red-500" : 
                              selectedOrder.priority === "Medium" ? "bg-amber-500" : "bg-green-500"
                            }`}></span>
                            <span className="font-medium">{selectedOrder.priority}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Building className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-gray-500">Branch</p>
                          <p className="font-medium truncate">{selectedOrder.branch}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Payment Details */}
                <div>
                  <div className="bg-gray-50 rounded-xl p-4 sm:p-5 space-y-4">
                    <div className="flex items-center border-b border-gray-200 pb-2">
                      <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
                      <h3 className="font-semibold text-base sm:text-lg text-gray-800">Payment Details</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
                        <p className="text-xs sm:text-sm text-gray-500">Total Cost</p>
                        <p className="font-semibold text-base sm:text-lg">
                          {formatCurrency(selectedOrder.totalCost)}
                        </p>
                      </div>
                      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
                        <p className="text-xs sm:text-sm text-gray-500">Advance Payment</p>
                        <p className="font-semibold text-base sm:text-lg">
                          {formatCurrency(selectedOrder.advancePayment)}
                        </p>
                      </div>
                      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
                        <p className="text-xs sm:text-sm text-gray-500">Full Payment</p>
                        <p className="font-semibold text-base sm:text-lg">
                          {formatCurrency(selectedOrder.fullPayment)}
                        </p>
                      </div>
                    </div>
                    {selectedOrder.totalCost && selectedOrder.advancePayment !== undefined && (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                        <span className="text-sm sm:text-base text-gray-700">Balance due:</span>
                        <span className="font-semibold text-sm sm:text-base text-gray-900">
                          {formatCurrency(selectedOrder.balanceDue)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Description */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center border-b pb-2">
                    <Tag className="h-5 w-5 mr-2 text-blue-600" />
                    <h3 className="font-semibold text-base sm:text-lg text-gray-800">Description</h3>
                  </div>
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-100">
                    <p className="whitespace-pre-wrap text-sm sm:text-base text-gray-700 break-words">
                      {selectedOrder.orderDescription || selectedOrder.description || "No description available"}
                    </p>
                  </div>
                </div>
                {/* Images Section */}
                <div className="space-y-6">
                  <div className="flex items-center border-b pb-2">
                    <Tag className="h-5 w-5 mr-2 text-blue-600" />
                    <h3 className="font-semibold text-base sm:text-lg text-gray-800">Images</h3>
                  </div>
                  
                  {/* Order Images */}
                  {selectedOrder.orderImages && selectedOrder.orderImages.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-600 mb-3 flex items-center">
                        <Tag className="h-4 w-4 mr-2 text-gray-500" />
                        Order Images
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {selectedOrder.orderImages.map((imageUrl, idx) => (
                          <div key={`order-${idx}`} className="w-full h-32 bg-gray-200 rounded-lg overflow-hidden border border-gray-300 relative group">
                            <img 
                              src={imageUrl} 
                              alt={`Order image ${idx + 1}`} 
                              className="object-cover w-full h-full cursor-pointer hover:scale-105 transition-transform"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `
                                    <div class="w-full h-full flex items-center justify-center bg-gray-100">
                                      <div class="text-center text-gray-500">
                                        <svg class="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                                          <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                                        </svg>
                                        <p class="text-xs">Image not found</p>
                                      </div>
                                    </div>
                                  `;
                                }
                              }}
                              onClick={() => window.open(imageUrl, '_blank')}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Artwork Image */}
                  {selectedOrder.artworkImage && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-600 mb-3 flex items-center">
                        <svg className="h-4 w-4 mr-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
                        </svg>
                        Artwork
                      </h4>
                      <div className="w-full max-w-md">
                        <div className="w-full h-48 bg-gray-200 rounded-lg overflow-hidden border border-gray-300 relative group">
                          <img 
                            src={selectedOrder.artworkImage} 
                            alt="Artwork" 
                            className="object-cover w-full h-full cursor-pointer hover:scale-105 transition-transform"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="w-full h-full flex items-center justify-center bg-gray-100">
                                    <div class="text-center text-gray-500">
                                      <svg class="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                                      </svg>
                                      <p class="text-xs">Artwork not found</p>
                                    </div>
                                  </div>
                                `;
                              }
                            }}
                            onClick={() => window.open(selectedOrder.artworkImage!, '_blank')}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Task Images */}
                  {selectedOrder.taskImages && selectedOrder.taskImages.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-600 mb-3 flex items-center">
                        <svg className="h-4 w-4 mr-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                        Task Images
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {selectedOrder.taskImages.map((imageUrl, idx) => (
                          <div key={`task-${idx}`} className="w-full h-32 bg-gray-200 rounded-lg overflow-hidden border border-gray-300 relative group">
                            <img 
                              src={imageUrl} 
                              alt={`Task image ${idx + 1}`} 
                              className="object-cover w-full h-full cursor-pointer hover:scale-105 transition-transform"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `
                                    <div class="w-full h-full flex items-center justify-center bg-gray-100">
                                      <div class="text-center text-gray-500">
                                        <svg class="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                                          <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                                        </svg>
                                        <p class="text-xs">Image not found</p>
                                      </div>
                                    </div>
                                  `;
                                }
                              }}
                              onClick={() => window.open(imageUrl, '_blank')}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Images Message */}
                  {(!selectedOrder.orderImages || selectedOrder.orderImages.length === 0) &&
                   !selectedOrder.artworkImage &&
                   (!selectedOrder.taskImages || selectedOrder.taskImages.length === 0) && (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-sm">No images available for this order</p>
                    </div>
                  )}
                </div>
                {/* Timeline */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center border-b pb-2">
                    <Clock className="h-5 w-5 mr-2 text-blue-600" />
                    <h3 className="font-semibold text-base sm:text-lg text-gray-800">Task Timeline</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500">Started</p>
                      </div>
                      <p className="font-medium text-sm sm:text-base ml-8 sm:ml-11">{formatDate(selectedOrder.startTime)}</p>
                    </div>
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-green-100 flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500">Completed</p>
                      </div>
                      <p className="font-medium text-sm sm:text-base ml-8 sm:ml-11">{formatDate(selectedOrder.endTime)}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end sticky bottom-0 bg-white pt-2 pb-2 border-t sm:border-0">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-lg w-full sm:w-auto">
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
