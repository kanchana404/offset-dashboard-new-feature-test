"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Printer, RefreshCw, Database, Bug } from "lucide-react";

export default function DebugPrintPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<string>("Not tested");

  const testBranchesAPI = async () => {
    setLoading(true);
    setApiStatus("Testing...");
    
    try {
      console.log("Testing branches API...");
      const res = await fetch("/api/branches");
      console.log("Response status:", res.status);
      console.log("Response headers:", Object.fromEntries(res.headers.entries()));
      
      const data = await res.json();
      console.log("Response data:", data);
      
      if (data.success && data.branches) {
        setBranches(data.branches);
        setApiStatus(`Success: ${data.branches.length} branches found`);
        toast({
          title: "API Test Success",
          description: `Found ${data.branches.length} branches`,
          variant: "default",
        });
      } else {
        setApiStatus(`Error: ${data.error || 'Unknown error'}`);
        toast({
          title: "API Test Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("API test error:", error);
      setApiStatus(`Error: ${error.message}`);
      toast({
        title: "API Test Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testPrint = () => {
    const testHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Print</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            @media print {
              body { background-color: white !important; }
            }
          </style>
        </head>
        <body>
          <h1>Test Print Page</h1>
          <p>This is a test print to verify printing functionality.</p>
          <p>Current time: ${new Date().toLocaleString()}</p>
          <p>Branches loaded: ${branches.length}</p>
          <ul>
            ${branches.map(branch => `<li>${branch.name} - ${branch.type}</li>`).join('')}
          </ul>
        </body>
      </html>
    `;

    console.log("Testing print functionality...");
    toast({
      title: "Testing Print",
      description: "Opening print dialog...",
      variant: "default",
    });

    let printWindow = window.open("", "_blank", "popup,width=800,height=600");
    
    if (!printWindow) {
      printWindow = window.open("", "_blank");
    }
    
    if (printWindow) {
      try {
        printWindow.document.open();
        printWindow.document.write(testHTML);
        printWindow.document.close();
        
        printWindow.onload = function() {
          setTimeout(() => {
            try {
              printWindow.focus();
              printWindow.print();
              toast({
                title: "Print Test Success",
                description: "Print dialog opened successfully",
                variant: "default",
              });
            } catch (error) {
              console.error("Print error:", error);
              toast({
                title: "Print Test Failed",
                description: "Failed to open print dialog",
                variant: "destructive",
              });
            }
          }, 500);
        };
        
        // Fallback
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
          title: "Print Test Error",
          description: "Failed to create print window",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Print Test Error",
        description: "Please allow popups for testing",
        variant: "destructive",
      });
    }
  };

  const testBranchesTestAPI = async () => {
    setLoading(true);
    try {
      console.log("Testing branches test API...");
      const res = await fetch("/api/branches/test");
      const data = await res.json();
      console.log("Test API response:", data);
      
      if (data.success) {
        toast({
          title: "Test API Success",
          description: data.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Test API Failed",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Test API error:", error);
      toast({
        title: "Test API Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Print & Branches Debug Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* API Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Branches API Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">Status: {apiStatus}</p>
            <Button 
              onClick={testBranchesAPI} 
              disabled={loading}
              className="w-full"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
              Test Branches API
            </Button>
            <Button 
              onClick={testBranchesTestAPI} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <Bug className="h-4 w-4 mr-2" />
              Test Branches Test API
            </Button>
          </CardContent>
        </Card>

        {/* Print Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Print Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Test basic printing functionality with current branches data.
            </p>
            <Button 
              onClick={testPrint} 
              className="w-full"
            >
              <Printer className="h-4 w-4 mr-2" />
              Test Print
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Branches Data */}
      <Card>
        <CardHeader>
          <CardTitle>Branches Data</CardTitle>
        </CardHeader>
        <CardContent>
          {branches.length > 0 ? (
            <div className="space-y-2">
              {branches.map((branch, index) => (
                <div key={index} className="p-3 border rounded">
                  <p><strong>Name:</strong> {branch.name}</p>
                  <p><strong>Type:</strong> {branch.type}</p>
                  <p><strong>Location:</strong> {branch.location}</p>
                  <p><strong>Active:</strong> {branch.isActive ? 'Yes' : 'No'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No branches loaded. Test the API first.</p>
          )}
        </CardContent>
      </Card>

      {/* Console Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-2">
            Open your browser's Developer Tools (F12) and check the Console tab for detailed logs.
          </p>
          <p className="text-sm text-gray-600">
            This will help identify where the printing or API calls are failing.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
