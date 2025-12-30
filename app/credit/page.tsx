"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  DollarSign,
  Users,
  CreditCard,
  TrendingUp,
  Mail,
  Phone,
  Wallet,
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CustomerWithCredit {
  whatsappNumber: string;
  customerName: string;
  customerEmail?: string;
  balance: number | undefined;
  usedAmount: number | undefined;
}

const CUSTOMERS_PER_PAGE = 20;
const FETCH_TIMEOUT = 30000; // 30 seconds timeout

export default function CreditsClient() {
  const [customers, setCustomers] = useState<CustomerWithCredit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [adjustAmount, setAdjustAmount] = useState<string>("");
  const [selectedWhatsapp, setSelectedWhatsapp] = useState<string>("");
  const [isSelectOpen, setIsSelectOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState<string>("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [applyingCredit, setApplyingCredit] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const fetchCustomersWithTimeout = async (timeoutMs: number = FETCH_TIMEOUT) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch("/api/credits", {
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      if (!Array.isArray(data.customers)) {
        throw new Error("Invalid response format");
      }

      return data.customers as CustomerWithCredit[];
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("Request timed out. Please try again.");
      }
      throw error;
    }
  };

  const fetchCustomers = async (isRetry: boolean = false) => {
    if (!isRetry) {
      setLoading(true);
      setError(null);
    }

    try {
      console.log(`Fetching customers... ${isRetry ? `(Retry ${retryCount + 1})` : ""}`);
      const customers = await fetchCustomersWithTimeout();

      setCustomers(customers);
      setError(null);
      setRetryCount(0);

      if (isRetry) {
        toast({
          title: "Success",
          description: "Customer data loaded successfully",
          variant: "success",
        });
      }
    } catch (e: any) {
      console.error("Error fetching /api/credits:", e);
      const errorMessage = e.message || "Failed to load customer data";
      setError(errorMessage);
      setCustomers([]);

      if (!isRetry) {
        toast({
          title: "Connection Issue",
          description: "Having trouble loading data. This is common on first load due to server startup time.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    setError(null);

    // Progressive timeout increase for retries
    const timeout = Math.min(FETCH_TIMEOUT + newRetryCount * 5000, 60000);

    try {
      setLoading(true);
      const customers = await fetchCustomersWithTimeout(timeout);
      setCustomers(customers);
      setError(null);
      setRetryCount(0);

      toast({
        title: "Success",
        description: "Customer data loaded successfully",
        variant: "success",
      });
    } catch (e: any) {
      console.error("Retry failed:", e);
      setError(e.message || "Failed to load customer data");

      toast({
        title: "Retry Failed",
        description: newRetryCount < 3 ? "Please try again" : "Please check your connection and try later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter customers based on search term
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;

    return customers.filter(
      (customer) =>
        customer.whatsappNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  // Filter customers for dropdown based on dropdown search term
  const filteredDropdownCustomers = useMemo(() => {
    if (!dropdownSearchTerm.trim()) return customers;

    return customers.filter(
      (customer) =>
        customer.whatsappNumber.toLowerCase().includes(dropdownSearchTerm.toLowerCase()) ||
        customer.customerName.toLowerCase().includes(dropdownSearchTerm.toLowerCase())
    );
  }, [customers, dropdownSearchTerm]);

  // Paginated customers
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * CUSTOMERS_PER_PAGE;
    const endIndex = startIndex + CUSTOMERS_PER_PAGE;
    return filteredCustomers.slice(startIndex, endIndex);
  }, [filteredCustomers, currentPage]);

  // Pagination info
  const totalPages = Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE);
  const startResult = (currentPage - 1) * CUSTOMERS_PER_PAGE + 1;
  const endResult = Math.min(currentPage * CUSTOMERS_PER_PAGE, filteredCustomers.length);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSelectOpen(false);
        setDropdownSearchTerm("");
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isSelectOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredDropdownCustomers.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredDropdownCustomers.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredDropdownCustomers[highlightedIndex]) {
          const selectedCustomer = filteredDropdownCustomers[highlightedIndex];
          setSelectedWhatsapp(selectedCustomer.whatsappNumber);
          setIsSelectOpen(false);
          setDropdownSearchTerm("");
          setHighlightedIndex(-1);
        }
        break;
      case "Escape":
        setIsSelectOpen(false);
        setDropdownSearchTerm("");
        setHighlightedIndex(-1);
        break;
    }
  };

  // Reset highlighted index when search changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [dropdownSearchTerm]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleApplyCredit = async () => {
    if (!selectedWhatsapp || parseFloat(adjustAmount) === 0) {
      return;
    }

    setApplyingCredit(true);

    try {
      const cust = customers.find((c) => c.whatsappNumber === selectedWhatsapp);
      if (!cust) return;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

      const res = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          whatsappNumber: selectedWhatsapp,
          customerName: cust.customerName,
          customerEmail: cust.customerEmail || "",
          amount: parseFloat(adjustAmount),
        }),
      });

      clearTimeout(timeoutId);

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to apply credit");
      }

      // Refresh the customer list
      await fetchCustomers(true);

      toast({
        title: "Credit Applied",
        description: `₹${parseFloat(adjustAmount).toFixed(2)} added to ${cust.customerName}`,
        variant: "success",
      });
    } catch (e: any) {
      console.error("Error applying credit:", e);
      toast({
        title: "Error",
        description:
          e.name === "AbortError" ? "Request timed out. Please try again." : e.message || "Unable to apply credit",
        variant: "destructive",
      });
    } finally {
      setApplyingCredit(false);
      setAdjustAmount("");
      setSelectedWhatsapp("");
      setIsSelectOpen(false);
    }
  };

  // Totals (coalesce undefined → 0)
  const totalBalance = customers.reduce((sum, c) => sum + (c.balance ?? 0), 0);
  const totalUsed = customers.reduce((sum, c) => sum + (c.usedAmount ?? 0), 0);
  const selectedCustomer = customers.find((c) => c.whatsappNumber === selectedWhatsapp);

  // Skeleton loader component
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-slate-200"></div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 rounded w-32"></div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="space-y-2">
          <div className="h-3 bg-slate-200 rounded w-24"></div>
          <div className="h-3 bg-slate-200 rounded w-20"></div>
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="h-6 bg-slate-200 rounded-full w-20 ml-auto"></div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="h-6 bg-slate-200 rounded-full w-20 ml-auto"></div>
      </td>
    </tr>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 pt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">
            <CreditCard className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
            Credits Management
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Monitor and manage customer credit balances with ease
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Customers</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {loading ? <div className="h-8 bg-slate-200 rounded animate-pulse w-16"></div> : customers.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Balance</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {loading ? (
                      <div className="h-8 bg-slate-200 rounded animate-pulse w-24"></div>
                    ) : (
                      `Rs ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Used</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {loading ? (
                      <div className="h-8 bg-slate-200 rounded animate-pulse w-24"></div>
                    ) : (
                      `Rs ${totalUsed.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Customer Table */}
          <div className="xl:col-span-2 bg-white/90 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Customer Credits</h2>
                    <p className="text-sm text-slate-600">View and track customer credit balances</p>
                  </div>
                </div>

                {/* Search Input and Retry Button */}
                <div className="flex items-center space-x-3">
                  {error && (
                    <button
                      onClick={handleRetry}
                      disabled={loading}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                      <span>Retry</span>
                    </button>
                  )}
                  <div className="relative w-80">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by phone number or name..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      disabled={loading || !!error}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              {error ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-12 w-12 text-red-500" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Unable to Load Data</h3>
                  <p className="text-slate-600 mb-4 max-w-md mx-auto">{error}</p>
                  <div className="space-y-2">
                    <p className="text-sm text-slate-500">
                      This can happen on first load due to server startup time.
                    </p>
                    <button
                      onClick={handleRetry}
                      disabled={loading}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                      <span>{loading ? "Retrying..." : `Retry ${retryCount > 0 ? `(${retryCount + 1})` : ""}`}</span>
                    </button>
                  </div>
                </div>
              ) : loading ? (
                <>
                  <div className="mb-4 space-y-3">
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-64"></div>
                    <div className="h-3 bg-slate-200 rounded animate-pulse w-48"></div>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Customer</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Contact</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Balance</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Used</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Array.from({ length: 5 }, (_, i) => (
                            <SkeletonRow key={i} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Results Info */}
                  {filteredCustomers.length > 0 && (
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm text-slate-600">
                        Showing {startResult} to {endResult} of {filteredCustomers.length} customers
                        {searchTerm && (
                          <span className="ml-2 text-blue-600 font-medium">(filtered by "{searchTerm}")</span>
                        )}
                      </p>
                    </div>
                  )}

                  {filteredCustomers.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                        <Search className="h-12 w-12 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No customers found</h3>
                      <p className="text-slate-600">
                        {searchTerm
                          ? `No customers match "${searchTerm}". Try a different search term.`
                          : "No customers available at the moment."}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-hidden rounded-xl border border-slate-200">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Customer</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Contact</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Balance</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Used</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {paginatedCustomers.map((cust) => {
                                const safeBalance = (cust.balance ?? 0).toFixed(2);
                                const safeUsed = (cust.usedAmount ?? 0).toFixed(2);

                                return (
                                  <tr
                                    key={cust.whatsappNumber}
                                    className="hover:bg-slate-50/50 transition-colors duration-200"
                                  >
                                    <td className="px-6 py-4">
                                      <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-medium">
                                          {cust.customerName.charAt(0)}
                                        </div>
                                        <div>
                                          <p className="font-medium text-slate-900">{cust.customerName}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="space-y-2">
                                        {cust.customerEmail && (
                                          <div className="flex items-center space-x-2 text-sm text-slate-600">
                                            <Mail className="h-4 w-4" />
                                            <span>{cust.customerEmail}</span>
                                          </div>
                                        )}
                                        <div className="flex items-center space-x-2 text-sm text-slate-600">
                                          <Phone className="h-4 w-4" />
                                          <span>{cust.whatsappNumber}</span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        Rs {parseFloat(safeBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                                        Rs {parseFloat(safeUsed).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="mt-6 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                              className="px-3 py-2 border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors flex items-center space-x-1"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              <span>Previous</span>
                            </button>

                            <div className="flex items-center space-x-1">
                              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                let pageNumber;
                                if (totalPages <= 7) {
                                  pageNumber = i + 1;
                                } else if (currentPage <= 4) {
                                  pageNumber = i + 1;
                                } else if (currentPage >= totalPages - 3) {
                                  pageNumber = totalPages - 6 + i;
                                } else {
                                  pageNumber = currentPage - 3 + i;
                                }

                                return (
                                  <button
                                    key={pageNumber}
                                    onClick={() => handlePageChange(pageNumber)}
                                    className={`px-3 py-2 border rounded-lg transition-colors ${
                                      currentPage === pageNumber
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "border-slate-200 hover:bg-slate-50"
                                    }`}
                                  >
                                    {pageNumber}
                                  </button>
                                );
                              })}
                            </div>

                            <button
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === totalPages}
                              className="px-3 py-2 border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors flex items-center space-x-1"
                            >
                              <span>Next</span>
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="text-sm text-slate-600">
                            Page {currentPage} of {totalPages}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Credit Adjustment Panel */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Adjust Credits</h2>
                  <p className="text-sm text-slate-600">Add or modify customer balance</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Select Customer</label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => {
                      if (customers.length === 0) return;
                      setIsSelectOpen((prev) => !prev);
                      if (!isSelectOpen) {
                        setDropdownSearchTerm("");
                        setHighlightedIndex(-1);
                      }
                    }}
                    disabled={loading || customers.length === 0}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <span className={selectedWhatsapp ? "text-slate-900" : "text-slate-500"}>
                      {selectedWhatsapp
                        ? `${customers.find((c) => c.whatsappNumber === selectedWhatsapp)?.customerName} (${selectedWhatsapp})`
                        : loading
                        ? "Loading customers..."
                        : customers.length === 0
                        ? "No customers available"
                        : "Choose a customer"}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isSelectOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isSelectOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
                      {/* Search input within dropdown */}
                      <div className="p-3 border-b border-slate-200">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400" />
                          </div>
                          <input
                            type="text"
                            placeholder="Search customers..."
                            value={dropdownSearchTerm}
                            onChange={(e) => setDropdownSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* Customer list */}
                      <div className="max-h-60 overflow-y-auto">
                        {filteredDropdownCustomers.length === 0 ? (
                          <div className="px-4 py-6 text-center text-slate-500">
                            <Search className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                            <p className="text-sm">
                              {dropdownSearchTerm
                                ? `No customers found for "${dropdownSearchTerm}"`
                                : "No customers available"}
                            </p>
                          </div>
                        ) : (
                          filteredDropdownCustomers.map((c, index) => (
                            <button
                              key={c.whatsappNumber}
                              onClick={() => {
                                setSelectedWhatsapp(c.whatsappNumber);
                                setIsSelectOpen(false);
                                setDropdownSearchTerm("");
                                setHighlightedIndex(-1);
                              }}
                              onMouseEnter={() => setHighlightedIndex(index)}
                              className={`w-full px-4 py-3 text-left transition-colors first:rounded-t-lg last:rounded-b-lg ${
                                highlightedIndex === index ? "bg-blue-50 border-l-4 border-blue-500" : "hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                                  {c.customerName.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">{c.customerName}</p>
                                  <p className="text-sm text-slate-500">{c.whatsappNumber}</p>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Credit Amount (Rs)</label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="Enter amount (e.g., 1500)"
                  disabled={applyingCredit}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-slate-100"
                />
              </div>

              <div className="h-px bg-slate-200"></div>

              <button
                onClick={handleApplyCredit}
                disabled={
                  !selectedWhatsapp ||
                  !adjustAmount ||
                  parseFloat(adjustAmount) === 0 ||
                  applyingCredit ||
                  loading
                }
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {applyingCredit ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Applying...</span>
                  </>
                ) : (
                  <span>Apply Credit Adjustment</span>
                )}
              </button>

              {selectedCustomer && !loading && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                  <p className="text-sm font-medium text-blue-900 mb-2">Selected Customer:</p>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-medium">
                      {selectedCustomer.customerName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900">{selectedCustomer.customerName}</p>
                      <p className="text-sm text-blue-700">{selectedCustomer.whatsappNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-blue-700">Current Balance:</span>
                    <span className="font-semibold text-blue-900">
                      Rs {(selectedCustomer.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700">Total Used:</span>
                    <span className="font-semibold text-blue-900">
                      Rs {(selectedCustomer.usedAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

