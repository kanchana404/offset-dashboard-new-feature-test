"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Download, FileText, Calendar, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Invoice {
  invoiceNo: string;
  invoiceDate: string;
  cashierName: string;
  customerName: string;
  invoiceAmount: number;
  type: string;
  branch: string;
  paymentMethod?: string;
}

interface UserInfo {
  role?: string;
  branch?: string;
}

export default function InvoiceReportPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("current");
  const [selectedPaymentOption, setSelectedPaymentOption] = useState("all");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo>({});
  const [branches, setBranches] = useState<any[]>([]);

  // Set default dates (last 6 months until today)
  useEffect(() => {
    const now = new Date();
    // Set start date to 6 months ago (start of that month)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    // Set end date to today
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    setStartDate(sixMonthsAgo.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  // Fetch user info and branches on mount
  useEffect(() => {
    fetchUserInfo();
    fetchBranches();
  }, []);
  
  // Remove auto-fetch to avoid circular dependency

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/verify');
      if (response.ok) {
        const data = await response.json();
        setUserInfo(data.user || {});
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches');
      if (response.ok) {
        const data = await response.json();
        setBranches(data.branches || []);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedBranch !== 'current') params.append('branch', selectedBranch);
      if (selectedPaymentOption !== 'all') params.append('paymentOption', selectedPaymentOption);
      
      const response = await fetch(`/api/reports/invoices?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch invoices');
      }
      
      setInvoices(data.invoices || []);
      
      if (data.invoices.length === 0) {
        toast({
          title: "No Data",
          description: "No invoices found for the selected period.",
          variant: "default",
        });
      } else {
        toast({
          title: "Success",
          description: `Found ${data.invoices.length} invoices.`,
          variant: "default",
        });
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

  const generatePDF = async () => {
    try {
      setGenerating(true);
      
      // First, generate the HTML
      const response = await fetch('/api/reports/invoices/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoices,
          startDate,
          endDate,
          paymentOption: selectedPaymentOption,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate PDF');
      }
      
      // Open print window with the generated HTML
      const printWindow = window.open(
        "",
        "_blank",
        "width=800,height=600,toolbar=0,scrollbars=1,status=0"
      );
      
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(data.html);
        printWindow.document.close();
        
        printWindow.onload = function () {
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
          }, 250);
        };
      } else {
        throw new Error("Please allow popups for generating PDFs.");
      }
      
      toast({
        title: "Success",
        description: "PDF generated successfully. You can now print or save it.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const calculateTotal = () => {
    return invoices.reduce((sum, inv) => sum + (inv.invoiceAmount || 0), 0);
  };

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Invoice Report</h1>
        <Button
          onClick={generatePDF}
          disabled={invoices.length === 0 || generating}
          className="flex items-center gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download PDF
            </>
          )}
        </Button>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
            
            {userInfo.role === 'admin' && (
              <div>
                <Label htmlFor="branch">Branch</Label>
                <Select
                  value={selectedBranch}
                  onValueChange={setSelectedBranch}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current Branch Only</SelectItem>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch._id} value={branch.name}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {userInfo.role !== 'admin' && (
              <div>
                <Label>Branch</Label>
                <div className="mt-1 px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-sm">
                  Current Branch Only
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="paymentOption">Payment Option</Label>
              <Select
                value={selectedPaymentOption}
                onValueChange={setSelectedPaymentOption}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select payment option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end gap-2">
              <Button
                onClick={fetchInvoices}
                disabled={loading}
                className="flex-1 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
              
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Report Preview
            </div>
            {invoices.length > 0 && (
              <div className="text-sm font-normal text-gray-600">
                Total Invoices: {invoices.length}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length > 0 ? (
            <div className="space-y-4">
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-2 text-left font-medium">#</th>
                      <th className="border border-gray-200 px-4 py-2 text-left font-medium">Order ID</th>
                      <th className="border border-gray-200 px-4 py-2 text-left font-medium">Payment Date & Time</th>
                      <th className="border border-gray-200 px-4 py-2 text-left font-medium">Order Created Date</th>
                      <th className="border border-gray-200 px-4 py-2 text-left font-medium">Cashier Name</th>
                      <th className="border border-gray-200 px-4 py-2 text-left font-medium">Customer</th>
                      <th className="border border-gray-200 px-4 py-2 text-center font-medium">Payment Method</th>
                      <th className="border border-gray-200 px-4 py-2 text-right font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice, index) => {
                      // Extract order ID from invoice number 
                      // Formats: ORD001-1, ORD001-advance, ORD001-final, or ORD001
                      let orderId = invoice.invoiceNo;
                      if (invoice.invoiceNo.includes('-')) {
                        const parts = invoice.invoiceNo.split('-');
                        // If second part is 'advance' or 'final', only use first part
                        if (parts[1] === 'advance' || parts[1] === 'final') {
                          orderId = parts[0];
                        } else {
                          // For numbered invoices like ORD001-1, ORD001-2
                          orderId = parts[0];
                        }
                      }
                      
                      return (
                        <tr key={`${invoice.invoiceNo}-${index}`} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-2">{index + 1}</td>
                          <td className="border border-gray-200 px-4 py-2 font-medium">{orderId}</td>
                          <td className="border border-gray-200 px-4 py-2">
                            {new Date(invoice.invoiceDate).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                        <td className="border border-gray-200 px-4 py-2">
                          {invoice.orderCreatedDate ? new Date(invoice.orderCreatedDate).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'N/A'}
                        </td>
                        <td className="border border-gray-200 px-4 py-2">{invoice.cashierName}</td>
                        <td className="border border-gray-200 px-4 py-2">{invoice.customerName}</td>
                        <td className="border border-gray-200 px-4 py-2 text-center">
                          {invoice.paymentMethod ? invoice.paymentMethod.charAt(0).toUpperCase() + invoice.paymentMethod.slice(1) : 'Cash'}
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {formatCurrency(invoice.invoiceAmount)}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-semibold">
                      <td colSpan={7} className="border border-gray-200 px-4 py-3 text-right">
                        Total Revenue:
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-right">
                        {formatCurrency(calculateTotal())}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No invoice data to display.</p>
              <p className="text-sm mt-2">Please select a date range and click "Generate Report" to view invoices.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
