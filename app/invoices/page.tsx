"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  DollarSign, 
  FileText, 
  User, 
  Calendar,
  Printer,
  CreditCard,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Users
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Invoice = {
  _id: string;
  orderId: string;
  name: string;
  status: string;
  branch: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  startTime: string;
  description: string;
  priority: string;
  employeeId?: string;
};

type Payment = {
  _id: string;
  amount: number;
  paymentType: string;
  paymentDate: string;
  notes?: string;
  receivedBy?: string;
};

export default function InvoicesPage() {
  const { toast } = useToast();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  
  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentType, setPaymentType] = useState("CASH");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  
  // Assign worker state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [assigningWorker, setAssigningWorker] = useState(false);

  useEffect(() => {
    fetchInvoices();
    fetchEmployees();
  }, [statusFilter, currentPage, searchTerm]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      });

      if (statusFilter !== "ALL") {
        params.append("status", statusFilter);
      }

      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await fetch(`/api/invoices?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setInvoices(data.invoices);
        setTotalPages(data.pagination.totalPages);
      } else {
        throw new Error(data.error || "Failed to fetch invoices");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees/branch");
      const data = await response.json();
      if (data.employees) {
        setEmployees(data.employees);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchPayments = async (orderId: string) => {
    try {
      const response = await fetch(`/api/payments?orderId=${orderId}`);
      const data = await response.json();
      if (data.success) {
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  };

  const handleAddPayment = async () => {
    if (!selectedInvoice) return;

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(paymentAmount) > selectedInvoice.balanceDue) {
      toast({
        title: "Amount Too Large",
        description: `Payment amount cannot exceed balance due (Rs ${selectedInvoice.balanceDue.toFixed(2)})`,
        variant: "destructive",
      });
      return;
    }

    setSubmittingPayment(true);
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedInvoice.orderId,
          amount: parseFloat(paymentAmount),
          paymentType,
          paymentDate: new Date().toISOString(),
          notes: paymentNotes,
          receivedBy,
          branch: selectedInvoice.branch,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Payment Added",
          description: `Payment of Rs ${paymentAmount} recorded successfully`,
        });

        // Reset form
        setPaymentAmount("");
        setPaymentNotes("");
        setReceivedBy("");
        
        // Refresh data
        fetchInvoices();
        fetchPayments(selectedInvoice.orderId);
        
        // Update selected invoice
        if (data.task) {
          setSelectedInvoice(prev => prev ? {
            ...prev,
            paidAmount: data.task.paidAmount,
            balanceDue: data.task.balanceDue,
            status: data.task.status,
          } : null);
        }

        // Close dialog if fully paid
        if (data.task.status === "PAID") {
          setTimeout(() => {
            setShowPaymentDialog(false);
          }, 1500);
        }
      } else {
        throw new Error(data.error || "Failed to add payment");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add payment",
        variant: "destructive",
      });
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleAssignWorker = async () => {
    if (!selectedInvoice || !selectedEmployeeId) {
      toast({
        title: "Missing Information",
        description: "Please select a worker",
        variant: "destructive",
      });
      return;
    }

    setAssigningWorker(true);
    try {
      const employee = employees.find(e => e._id === selectedEmployeeId);
      
      const response = await fetch("/api/invoices/assign-worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedInvoice.orderId,
          employeeId: selectedEmployeeId,
          employeeName: employee?.name || "Unknown",
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Worker Assigned",
          description: `Task assigned to ${employee?.name || "worker"} successfully`,
        });

        setShowAssignDialog(false);
        setSelectedEmployeeId("");
        fetchInvoices();
      } else {
        throw new Error(data.error || "Failed to assign worker");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign worker",
        variant: "destructive",
      });
    } finally {
      setAssigningWorker(false);
    }
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${invoice.orderId}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .info { margin: 10px 0; }
            .label { font-weight: bold; }
            @media print { body { print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Invoice</h1>
            <h2>Solid Graphic (Pvt) Ltd</h2>
          </div>
          <div class="info"><span class="label">Invoice #:</span> ${invoice.orderId}</div>
          <div class="info"><span class="label">Customer:</span> ${invoice.name}</div>
          <div class="info"><span class="label">Branch:</span> ${invoice.branch}</div>
          <div class="info"><span class="label">Date:</span> ${new Date(invoice.startTime).toLocaleDateString()}</div>
          <div class="info"><span class="label">Description:</span> ${invoice.description}</div>
          <hr>
          <div class="info"><span class="label">Total Amount:</span> Rs ${invoice.totalAmount.toFixed(2)}</div>
          <div class="info"><span class="label">Paid Amount:</span> Rs ${invoice.paidAmount.toFixed(2)}</div>
          <div class="info"><span class="label">Balance Due:</span> Rs ${invoice.balanceDue.toFixed(2)}</div>
          <hr>
          <div style="margin-top: 20px; text-align: center;">
            <p>Thank You for Your Business!</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: any = {
      INVOICED: { color: "bg-blue-100 text-blue-800", label: "Invoiced" },
      IN_PROGRESS: { color: "bg-yellow-100 text-yellow-800", label: "In Progress" },
      COMPLETED: { color: "bg-green-100 text-green-800", label: "Completed" },
      PAID: { color: "bg-emerald-100 text-emerald-800", label: "Paid" },
    };
    
    const config = statusMap[status] || { color: "bg-gray-100 text-gray-800", label: status };
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by Order ID or Customer Name..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="status-filter">Filter by Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Invoices</SelectItem>
                  <SelectItem value="INVOICED">Invoiced</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No invoices found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice._id}>
                        <TableCell className="font-mono font-semibold">
                          {invoice.orderId}
                        </TableCell>
                        <TableCell>{invoice.name}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>Rs {invoice.totalAmount?.toFixed(2) || "0.00"}</TableCell>
                        <TableCell>Rs {invoice.paidAmount?.toFixed(2) || "0.00"}</TableCell>
                        <TableCell className="font-semibold">
                          Rs {invoice.balanceDue?.toFixed(2) || "0.00"}
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.startTime).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                fetchPayments(invoice.orderId);
                                setShowPaymentDialog(true);
                              }}
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Pay
                            </Button>
                            
                            {invoice.status === "INVOICED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setShowAssignDialog(true);
                                }}
                              >
                                <Users className="h-4 w-4 mr-1" />
                                Assign
                              </Button>
                            )}
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePrintInvoice(invoice)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment for Invoice #{selectedInvoice?.orderId}</DialogTitle>
            <DialogDescription>
              Customer: {selectedInvoice?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Payment Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-lg font-bold">
                  Rs {selectedInvoice?.totalAmount?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Paid</p>
                <p className="text-lg font-bold text-green-600">
                  Rs {selectedInvoice?.paidAmount?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Balance Due</p>
                <p className="text-lg font-bold text-red-600">
                  Rs {selectedInvoice?.balanceDue?.toFixed(2) || "0.00"}
                </p>
              </div>
            </div>

            {/* Payment History */}
            {payments.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Payment History</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {payments.map((payment) => (
                    <div
                      key={payment._id}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded"
                    >
                      <div>
                        <p className="font-medium">Rs {payment.amount.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">
                          {payment.paymentType} - {new Date(payment.paymentDate).toLocaleDateString()}
                        </p>
                      </div>
                      {payment.notes && (
                        <p className="text-sm text-gray-600">{payment.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Payment */}
            {selectedInvoice?.balanceDue && selectedInvoice.balanceDue > 0 ? (
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Add New Payment</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="payment-amount">Payment Amount (Rs)</Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="payment-type">Payment Type</Label>
                    <Select value={paymentType} onValueChange={setPaymentType}>
                      <SelectTrigger id="payment-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="CARD">Card</SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                        <SelectItem value="ONLINE">Online Transfer</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="received-by">Received By</Label>
                  <Input
                    id="received-by"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder="Employee name"
                  />
                </div>

                <div>
                  <Label htmlFor="payment-notes">Notes (Optional)</Label>
                  <Input
                    id="payment-notes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Additional notes..."
                  />
                </div>

                <Button
                  onClick={handleAddPayment}
                  disabled={submittingPayment}
                  className="w-full"
                >
                  {submittingPayment ? "Processing..." : "Add Payment"}
                </Button>
              </div>
            ) : (
              <div className="text-center py-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-semibold">Fully Paid!</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Worker Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Worker to Invoice #{selectedInvoice?.orderId}</DialogTitle>
            <DialogDescription>
              Select a worker to assign this task to
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="employee-select">Select Worker</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger id="employee-select">
                  <SelectValue placeholder="Choose a worker..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee._id} value={employee._id}>
                      {employee.name} - {employee.role || "Worker"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignWorker} disabled={assigningWorker || !selectedEmployeeId}>
              {assigningWorker ? "Assigning..." : "Assign Worker"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

