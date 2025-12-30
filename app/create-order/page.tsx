"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Printer, Image as ImageIcon, X, Calendar, CreditCard, RefreshCw } from "lucide-react";
import { UploadButton } from "@/utils/uploadthing";

function generateInvoiceHTML(order: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice - Order ${order.orderId}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          .invoice-header {
            text-align: center;
            margin-bottom: 30px;
          }
          @media print {
            body { 
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <h1>Invoice</h1>
          <p>Date: ${new Date().toLocaleDateString()}</p>
        </div>
        <div>
          <p><strong>Order ID:</strong> ${order.orderId}</p>
          <p><strong>Customer Name:</strong> ${order.customerName}</p>
          ${order.customerEmail ? `<p><strong>Customer Email:</strong> ${order.customerEmail}</p>` : ""}
          <p><strong>WhatsApp Number:</strong> ${order.whatsappNumber}</p>
          <p><strong>Category:</strong> ${order.category}</p>
          <p><strong>Description:</strong> ${order.description}</p>
          <p><strong>Expected Completion:</strong> ${new Date(order.expectedEndDate).toLocaleDateString()}</p>
          ${order.images && order.images.length > 0 ? `<p><strong>Images:</strong> ${order.images.length} image(s) attached</p>` : ""}
          ${order.advancePayment ? `<p><strong>Advance Payment:</strong> Rs${order.advancePayment}</p>` : ""}
          ${order.fullPayment ? `<p><strong>Total Payment:</strong> Rs${order.fullPayment}</p>` : ""}
        </div>
      </body>
    </html>
  `;
}

function printInvoice(order: any) {
  const invoiceHTML = generateInvoiceHTML(order);
  const printWindow = window.open(
    "",
    "_blank",
    "popup,width=800,height=600,toolbar=0,scrollbars=0,status=0"
  );

  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();

    printWindow.onload = function () {
      try {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();

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
        }, 250);
      } catch (error) {
        console.error("Print error:", error);
        printWindow.close();
      }
    };
  } else {
    alert("Please allow popups for printing invoices.");
  }
}

export default function CreateOrderPage() {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [category, setCategory] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [filteredCategories, setFilteredCategories] = useState<any[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [description, setDescription] = useState("");
  const [uploadedImages, setUploadedImages] = useState<Array<{ url: string; name: string }>>([]);
  const [sendToMainBranch, setSendToMainBranch] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [nextOrderId, setNextOrderId] = useState<string>("");
  const [orderIdLoading, setOrderIdLoading] = useState(true);
  const [branchInfo, setBranchInfo] = useState<any>(null);
  const [allBranches, setAllBranches] = useState<Array<{
    name: string;
    location: string;
    contact: string[];
    type: string;
  }>>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchesFetched, setBranchesFetched] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [showPrintButton, setShowPrintButton] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchedCategories, setFetchedCategories] = useState<any[]>([]);
  const [advancePayment, setAdvancePayment] = useState<string>("");
  const [totalPrice, setTotalPrice] = useState<string>(""); // Total Payment

  const categoryInputRef = useRef<HTMLInputElement | null>(null);
  const suggestionsRef = useRef<HTMLUListElement | null>(null);

  // Fetch next order ID on component mount
  const fetchNextOrderId = async () => {
    setOrderIdLoading(true);
    try {
      const response = await fetch("/api/orders/next-id");
      const data = await response.json();
      
      if (response.ok && data.success) {
        setNextOrderId(data.nextOrderId);
        setBranchInfo({
          branchName: data.branchName,
          branchPrefix: data.branchPrefix,
          nextOrderNumber: data.nextOrderNumber,
          lastOrderId: data.lastOrderId
        });
      } else {
        throw new Error(data.error || "Failed to fetch next order ID");
      }
    } catch (error: any) {
      console.error("Error fetching next order ID:", error);
      toast({
        title: "Warning",
        description: "Unable to fetch next order ID. A new ID will be generated when you submit.",
        variant: "destructive",
      });
      setNextOrderId("Will be generated...");
    } finally {
      setOrderIdLoading(false);
    }
  };

  useEffect(() => {
    // Set default end date
    const defaultEndDate = new Date();
    defaultEndDate.setDate(defaultEndDate.getDate() + 3);
    setEndDate(defaultEndDate.toISOString().split("T")[0]);

    // Fetch next order ID first
    fetchNextOrderId();
  }, []);

  // Fetch branches after branchInfo is available - only once
  useEffect(() => {
    if (branchInfo?.branchName && !branchesFetched) {
      console.log("branchInfo.branchName available, fetching branches...");
      // Add a small delay to ensure state is properly set
      setTimeout(() => {
        fetchBranches();
      }, 200);
    }
  }, [branchInfo?.branchName, branchesFetched]);

  // Monitor branchInfo changes for debugging
  useEffect(() => {
    console.log("🔄 branchInfo state changed:", branchInfo);
    if (branchInfo?.location && branchInfo?.contact) {
      console.log("✅ branchInfo now has location and contact:", {
        location: branchInfo.location,
        contact: branchInfo.contact
      });
    }
  }, [branchInfo]);



  const fetchBranches = async () => {
    // Prevent multiple calls
    if (branchesFetched) {
      console.log("🚫 Branches already fetched, skipping...");
      return;
    }
    
    console.log("=== FETCH BRANCHES START ===");
    console.log("Current branchInfo:", branchInfo);
    setBranchesLoading(true);
    
    try {
      const res = await fetch("/api/branches");
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log("Branches API response:", data);
      
      if (data.branches && Array.isArray(data.branches)) {
        const currentBranchName = branchInfo?.branchName;
        console.log("Looking for branch:", currentBranchName);
        console.log("Available branches:", data.branches.map((b: any) => b.name));
        
        // Find current branch first - make comparison case-insensitive
        const currentBranch = data.branches.find((branch: any) => {
          const match = branch.name.toLowerCase() === currentBranchName?.toLowerCase();
          console.log(`Comparing: "${branch.name.toLowerCase()}" === "${currentBranchName?.toLowerCase()}" = ${match}`);
          return match;
        });
        
        if (currentBranch) {
          console.log("✅ Found current branch:", currentBranch.name);
          console.log("📍 Branch details:", {
            location: currentBranch.location,
            contact: currentBranch.contact
          });
          
          // Update branchInfo with complete current branch details
          setBranchInfo((prev: any) => {
            const updated = {
              ...prev,
              location: currentBranch.location || '',
              contact: currentBranch.contact || []
            };
            console.log("🔄 Updated branchInfo:", updated);
            return updated;
          });
        } else {
          console.warn("❌ Current branch not found in branches list");
          console.log("🔍 Available branch names:", data.branches.map((b: any) => b.name));
        }
        
        // Filter out the current branch for other branches list
        const filteredBranches = data.branches.filter((branch: any) => 
          branch.name !== currentBranchName
        );
        setAllBranches(filteredBranches);
        
        // Mark as fetched to prevent future calls
        setBranchesFetched(true);
      } else {
        console.warn("⚠️ Branches data is not in expected format:", data);
        setAllBranches([]);
        setBranchesFetched(true);
      }
    } catch (error: any) {
      console.error("❌ Error fetching branches:", error);
      setAllBranches([]);
      setBranchesFetched(true);
    } finally {
      setBranchesLoading(false);
      console.log("=== FETCH BRANCHES END ===");
    }
  };
  


  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) {
          setFetchedCategories(data.categories);
          setFilteredCategories(data.categories);
          if (!category && data.categories.length > 0) {
            setCategoryInput("");
          }
        }
      })
      .catch((err) => console.error("Failed to fetch categories", err));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        !categoryInputRef.current?.contains(event.target as Node)
      ) {
        setShowCategorySuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleCategoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCategoryInput(value);
    setCategory(value);

    if (value.trim() === "") {
      setFilteredCategories(fetchedCategories);
    } else {
      const filtered = fetchedCategories.filter(cat => 
        cat.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCategories(filtered);
    }
    
    setShowCategorySuggestions(true);
  };

  const handleCategorySuggestionClick = (categoryName: string) => {
    setCategoryInput(categoryName);
    setCategory(categoryName);
    setShowCategorySuggestions(false);
  };

  const resetForm = () => {
    setCustomerName("");
    setCustomerEmail("");
    setWhatsappNumber("");
    setCategoryInput("");
    setCategory("");
    setDescription("");
    setUploadedImages([]);
    setSendToMainBranch(false);
    setAdvancePayment("");
    setTotalPrice("");
    
    const defaultEndDate = new Date();
    defaultEndDate.setDate(defaultEndDate.getDate() + 3);
    setEndDate(defaultEndDate.toISOString().split("T")[0]);
    
    // Reset branches flag to allow fresh fetch
    setBranchesFetched(false);
    
    // Fetch the new next order ID after form reset
    fetchNextOrderId();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!category || !description || !customerName || !whatsappNumber || !endDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate that endDate is not in the past
    const selectedDate = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      toast({
        title: "Error",
        description: "Expected completion date cannot be in the past",
        variant: "destructive",
      });
      return;
    }

    // Prepare order data (orderId will be generated on backend)
    const orderData = {
      customerName,
      customerEmail,
      whatsappNumber,
      category,
      description,
      images: uploadedImages.map(img => img.url),
      sendToMainBranch,
      orderDate: new Date().toISOString(),
      expectedEndDate: new Date(endDate).toISOString(),
      orderItems: [],
      totalPrice: totalPrice ? parseFloat(totalPrice) : 0,
      fullPayment: totalPrice ? parseFloat(totalPrice) : 0,
      advancePayment: advancePayment ? Math.round(parseFloat(advancePayment) * 100) / 100 : 0,
      assignTask: false,
      sentToMainBranch: false,
    };

    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create order");
      }

      const result = await res.json();
      
      // Use the generated order ID from the backend
      const finalOrderData = {
        ...orderData,
        orderId: result.generatedOrderId || result.order.orderId
      };

      toast({
        title: "Order Created",
        description: `Order ${finalOrderData.orderId} has been created successfully.`,
        variant: "default",
      });
      
      setCreatedOrder(finalOrderData);
      setShowPrintButton(true);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

    const handlePrint = () => {
    if (!createdOrder) {
      console.error("No order data available for printing");
      toast({
        title: "Error",
        description: "No order data available for printing",
        variant: "destructive",
      });
      return;
    }
    
    // Check if we have branch location and contact info
    if (!branchInfo?.location || !branchInfo?.contact) {
      console.log("⚠️ Missing branch location/contact info for invoice");
      toast({
        title: "Warning",
        description: "Branch details not available. Invoice will show placeholder text.",
        variant: "destructive",
      });
      // Continue with printing anyway - don't fetch branches again
    }
    
    if (branchesLoading) {
      toast({
        title: "Please Wait",
        description: "Branches are still loading. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if branches are loaded, but don't block printing
    if (!allBranches || allBranches.length === 0) {
      console.warn("No branches loaded, proceeding with empty branches list");
      // Don't return - allow printing to continue
    }
    
    console.log("🖨️ Printing order:", createdOrder);
    console.log("🏢 Branches loaded:", allBranches);
    console.log("📍 Branch info for printing:", branchInfo);
    const invoiceHTML = generateOrderInvoiceHTML(createdOrder);
    
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
    };
  
  // Test print function for debugging
  const testPrint = () => {
    const testHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Print</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            @media print { body { background: white !important; } }
          </style>
        </head>
        <body>
          <h1>Test Print Page</h1>
          <p>This is a test to verify the print functionality is working.</p>
          <p>Current time: ${new Date().toLocaleString()}</p>
          <p>Browser: ${navigator.userAgent}</p>
          <button onclick="window.print()">Print Test</button>
        </body>
      </html>
    `;
    
    // Try different approaches for opening the window
    let testWindow = window.open("", "_blank", "width=600,height=400");
    
    if (!testWindow) {
      // Fallback 1: Try without features
      testWindow = window.open("", "_blank");
    }
    
    if (!testWindow) {
      // Fallback 2: Try with different approach
      testWindow = window.open("about:blank", "_blank");
    }
    
    if (testWindow) {
      try {
        testWindow.document.write(testHTML);
        testWindow.document.close();
        testWindow.focus();
        
        toast({
          title: "Test Window Opened",
          description: "Test window opened successfully. Try printing from there.",
          variant: "default",
        });
      } catch (error) {
        console.error("Test window error:", error);
        testWindow.close();
        toast({
          title: "Test Error",
          description: "Failed to write content to test window.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Test Failed",
        description: "Could not open test window. Popup blocker may be active.",
        variant: "destructive",
      });
    }
  };
  
           function generateOrderInvoiceHTML(order: any) {
      try {
        console.log("=== GENERATING INVOICE HTML ===");
        console.log("📋 Order data:", order);
        console.log("🏢 Current allBranches state:", allBranches);
        console.log("🏢 Current branchInfo state:", branchInfo);
        
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
        const customerName = order.customerName || "Customer";
        const customerWhatsapp = order.whatsappNumber || "";
        const customerEmail = order.customerEmail || "";

        // Get branch details - use branchInfo from the component state
        const currentBranchName = branchInfo?.branchName || "Branch";
        
        // Ensure allBranches is always an array
        const safeBranches = Array.isArray(allBranches) ? allBranches : [];
        
        console.log("📊 Invoice data summary:", {
          customerName,
          customerWhatsapp,
          customerEmail,
          currentBranchName,
          branchLocation: branchInfo?.location,
          branchContact: branchInfo?.contact,
          totalPrice: order.totalPrice,
          advancePayment: order.advancePayment
        });
        
        console.log("🔍 Branch details check:", {
          hasLocation: !!branchInfo?.location,
          hasContact: !!branchInfo?.contact,
          locationValue: branchInfo?.location,
          contactValue: branchInfo?.contact
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
             font-size: 15px;
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
            font-size: 24px;
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
            font-size: 13px;
            line-height: 1.2;
            position: relative;
        }
        .centered-contact-info {
            text-align: center;
            margin-top: 10px;
            font-size: 9px;
            line-height: 1.2;
            width: 100%;
            display: block;
            font-weight: bold;
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
            font-size: 14px;
        }
        .current-branch-section h4 {
            margin: 0 0 3px 0;
            font-size: 14px;
            text-decoration: underline;
            font-weight: bold;
        }
        .other-branches-section h4 {
            margin: 0 0 3px 0;
            font-size: 14px;
        }
        .other-branches-list {
            font-size: 12px;
            line-height: 1.1;
        }
        .other-branch-item {
            margin-bottom: 2px;
        }
        .branch-details {
            font-size: 8px;
            line-height: 1.1;
            margin-top: 3px;
        }
        .customer-invoice-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 15px;
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
            font-size: 14px;
        }
        .dotted-line {
            border-bottom: 1px dotted #333;
            flex: 1;
            height: 14px;
        }
        .filled-info {
            flex: 1;
            border-bottom: 1px solid #333;
            padding: 1px 3px;
            min-height: 14px;
            font-size: 14px;
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
            font-size: 14px;
        }
        .items-table td {
            border: none;
            padding: 5px;
            vertical-align: middle;
            text-align: center;
        }
        .data-row {
            height: 30px;
        }
        .column-space {
            width: 20%;
            position: relative;
            padding: 3px;
            color: #666;
            letter-spacing: 0.5px;
            font-size: 13px;
        }
        .column-space:nth-child(1) { 
            width: 25%; 
            text-align: left;
        }
        .column-space:nth-child(2) { width: 20%; }
        .column-space:nth-child(3) { width: 15%; }
        .column-space:nth-child(4) { width: 20%; }
        .column-space:nth-child(5) { width: 20%; }
        .footer-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
        }
        .remark-section {
            flex: 1;
            padding-right: 15px;
            font-size: 14px;
        }
        .total-section {
            width: 200px;
            text-align: right;
            font-size: 14px;
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
            font-size: 16px;
            font-weight: bold;
            margin: 15px 0;
        }
        .services-list {
            border: 1px solid #333;
            padding: 8px;
            font-size: 12px;
            line-height: 1.2;
            text-align: center;
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
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4>Head Office & Work shop</h4>
                        No. 89, Ranna East, Ranna.<br>
                        Tel. 070 2222 00 2/3/4/9
                    </div>
                    
                </div>
            </div>
            
                         <div class="current-branch-section">
                 <h4>${currentBranchName}</h4>
                 <div class="branch-details">
                     ${branchInfo?.location || 'Branch Location'}<br>
                     ${branchInfo?.contact && Array.isArray(branchInfo.contact) ? branchInfo.contact.join(', ') : 'Contact Information'}
                 </div>
             </div>
            
            <div class="other-branches-section">
                <h4>Other Branches</h4>
                <div class="other-branches-list">
                    ${safeBranches
                      .filter(branch => branch.name !== currentBranchName && branch.name.toLowerCase() !== 'sales')
                      .map(branch => `
                        <div class="other-branch-item">
                          <strong>${branch.name}</strong>
                        </div>
                      `).join('')}
                    ${safeBranches.filter(branch => branch.name !== currentBranchName && branch.name.toLowerCase() !== 'sales').length === 0 ? 
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
                    <div class="filled-info"></div>
                </div>
                <div class="info-line">
                    <label>Cus. Number</label>
                    <span>-</span>
                    <div class="filled-info">${customerWhatsapp || ''}</div>
                </div>
            </div>
            <div class="invoice-info">
                <div class="info-line">
                    <label>Invoice No</label>
                    <span>-</span>
                    <div class="filled-info">${order.orderId}</div>
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
            </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th>ITEM NAME</th>
                    <th>Len / Wid</th>
                    <th>AMOUNT</th>
                </tr>
            </thead>
            <tbody>
                                 <tr class="data-row">
                     <td class="column-space">${order.category}</td>
                     <td class="column-space">.......................</td>
                     <td class="column-space">${order.totalPrice ? `Rs ${parseFloat(order.totalPrice).toFixed(2)}` : '.....................'}</td>
                 </tr>
                <tr class="data-row">
                    <td class="column-space">.............................</td>
                    <td class="column-space">.......................</td>
                    <td class="column-space">.......................</td>
                </tr>
                <tr class="data-row">
                    <td class="column-space">.............................</td>
                    <td class="column-space">.......................</td>
                    <td class="column-space">.......................</td>
                </tr>
            </tbody>
        </table>

                 <!-- Footer Section -->
         <div class="footer-section">
             <div class="total-section" style="margin-left: auto;">
                                  <div class="total-line">
                      <span>SUB TOTAL</span>
                      <span>: <span style="border-bottom: 1px dotted #333; width: 100px; display: inline-block; height: 16px;">${order.totalPrice ? `Rs ${parseFloat(order.totalPrice).toFixed(2)}` : 'Rs 0.00'}</span></span>
                  </div>
                 ${order.advancePayment > 0 ? `
                 <div class="total-line">
                     <span>ADVANCED PAY</span>
                     <span>: <span style="border-bottom: 1px dotted #333; width: 100px; display: inline-block; height: 16px;">Rs ${parseFloat(order.advancePayment).toFixed(2)}</span></span>
                 </div>
                 ` : ''}
                                  <div class="total-line">
                      <span>Settlement</span>
                      <span>: <span style="border-bottom: 1px dotted #333; width: 100px; display: inline-block; height: 16px;">${order.totalPrice ? `Rs ${(parseFloat(order.totalPrice) - parseFloat(order.advancePayment || 0)).toFixed(2)}` : 'Rs 0.00'}</span></span>
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
       console.error("Error generating invoice HTML:", error);
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
  
  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-8 px-4">
      <div className="flex items-center mb-2">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create Order</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8" suppressHydrationWarning>
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
            <CardTitle className="flex items-center justify-between text-xl">
              <div className="flex items-center">
                <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-lg mr-3">Next Order ID</span>
                {orderIdLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                    <span className="text-gray-500">Loading...</span>
                  </div>
                ) : (
                  <span className="font-mono text-xl text-blue-600">{nextOrderId}</span>
                )}
              </div>
              
                             <div className="flex space-x-2">
                 <Button
                   type="button"
                   variant="outline"
                   size="sm"
                   onClick={fetchNextOrderId}
                   disabled={orderIdLoading}
                   className="text-xs"
                 >
                   <RefreshCw className={`h-3 w-3 mr-1 ${orderIdLoading ? 'animate-spin' : ''}`} />
                   Refresh
                 </Button>
                 <Button
                   type="button"
                   variant="outline"
                   size="sm"
                   onClick={() => {
                     console.log("Manual fetch branches triggered");
                     setBranchesFetched(false);
                     fetchBranches();
                   }}
                   disabled={branchesLoading}
                   className="text-xs"
                 >
                   <RefreshCw className={`h-3 w-3 mr-1 ${branchesLoading ? 'animate-spin' : ''}`} />
                   Fetch Branches
                 </Button>
               </div>
            </CardTitle>
            
           
          </CardHeader>
        </Card>
        
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
            <CardTitle className="text-xl">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="customerName" className="text-gray-700">Customer Name</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  className="mt-2 rounded-lg"
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <Label htmlFor="customerEmail" className="text-gray-700">Customer Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="mt-2 rounded-lg"
                  placeholder="Enter customer email (optional)"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="whatsappNumber" className="text-gray-700">WhatsApp Number</Label>
              <Input
                id="whatsappNumber"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                required
                className="mt-2 rounded-lg"
                placeholder="Enter WhatsApp number"
              />
            </div>
            
            <div className="relative">
              <Label htmlFor="category" className="text-gray-700">Category</Label>
              <Input
                ref={categoryInputRef}
                id="category"
                value={categoryInput}
                onChange={handleCategoryInputChange}
                onFocus={() => setShowCategorySuggestions(true)}
                required
                className="mt-2 rounded-lg"
                placeholder="Type to search categories..."
              />
              
              {showCategorySuggestions && filteredCategories.length > 0 && (
                <ul 
                  ref={suggestionsRef}
                  className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg"
                >
                  {filteredCategories.map((cat) => (
                    <li 
                      key={cat._id}
                      onClick={() => handleCategorySuggestionClick(cat.name)}
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-gray-700"
                    >
                      {cat.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div>
              <Label htmlFor="description" className="text-gray-700">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                className="w-full mt-2 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Enter order details..."
              />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
            <CardTitle className="text-xl flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="totalPrice" className="text-gray-700">Total Payment (Rs)</Label>
                <Input
                  id="totalPrice"
                  type="number"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(e.target.value)}
                  className="mt-2 rounded-lg"
                  placeholder="Enter total amount"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">Total amount for this order (optional)</p>
              </div>
              
              <div>
                <Label htmlFor="advancePayment" className="text-gray-700">Advance Payment (Rs)</Label>
                <Input
                  id="advancePayment"
                  type="number"
                  value={advancePayment}
                  onChange={(e) => setAdvancePayment(e.target.value)}
                  className="mt-2 rounded-lg"
                  placeholder="Enter advance amount"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">Amount paid in advance (optional)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
            <CardTitle className="text-xl flex items-center">
              <ImageIcon className="h-5 w-5 mr-2 text-blue-600" />
              Images
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-6">
              <UploadButton
                endpoint="imageUploader"
                onClientUploadComplete={(res) => {
                  if (res && res.length > 0) {
                    const newImages = res.map(file => ({
                      url: file.url,
                      name: file.name
                    }));
                    setUploadedImages(prev => [...prev, ...newImages]);
                    toast({
                      title: "Upload Complete",
                      description: `${res.length} image(s) uploaded successfully.`,
                      variant: "default",
                    });
                  }
                }}
                onUploadError={(error: Error) => {
                  toast({
                    title: "Upload Error",
                    description: error.message || "Failed to upload image",
                    variant: "destructive",
                  });
                }}
              />
            </div>
            
            {uploadedImages.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Uploaded Images</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative group rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
                      <img 
                        src={image.url} 
                        alt={`Uploaded ${index + 1}`} 
                        className="w-full h-32 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="p-2 bg-white">
                        <p className="text-xs truncate">{image.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
            <CardTitle className="text-xl flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-600" />
              Schedule & Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div>
              <Label htmlFor="endDate" className="text-gray-700">Expected Completion Date <span className="text-red-500">*</span></Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="mt-2 max-w-xs rounded-lg"
                min={new Date().toISOString().split('T')[0]} // Prevent past dates
              />
              <p className="text-xs text-gray-500 mt-1">When is this order expected to be completed? (Required)</p>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <Switch
                id="sendToMainBranch"
                checked={sendToMainBranch}
                onCheckedChange={setSendToMainBranch}
              />
              <div>
                <Label htmlFor="sendToMainBranch" className="text-gray-700 font-medium">Send to Workshop</Label>
                <p className="text-xs text-gray-500">Enable this option if the order needs to be processed in the main workshop</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={loading || orderIdLoading}
            className="px-8 py-6 h-auto rounded-lg shadow-sm"
          >
            {loading ? "Creating Order..." : "Create Order"}
          </Button>
        </div>
      </form>

             {/* Print Button Section at Bottom */}
       {showPrintButton && createdOrder && (
         <div className="bg-green-50 border border-green-100 rounded-xl p-6 shadow-sm">
           <div className="flex items-center justify-between">
             <div>
               <h3 className="text-lg font-semibold text-green-800">
                 Order #{createdOrder.orderId} Created Successfully
               </h3>
                               <p className="text-green-600">
                  You can now print the invoice with the updated format
                  {branchesLoading && " (Branches are loading...)"}
                </p>
             </div>
             <div className="flex space-x-3">
               <Button
                 onClick={handlePrint}
                 disabled={branchesLoading}
                 className="bg-green-600 hover:bg-green-700 rounded-lg shadow-sm"
               >
                 <Printer className="mr-2 h-4 w-4" />
                 {branchesLoading ? "Loading..." : "Print Invoice"}
               </Button>
               
               
               
              
             </div>
           </div>
         </div>
       )}
    </div>
  );
}

//ss