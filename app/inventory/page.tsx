"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadButton } from "@/utils/uploadthing";
import { 
  Search,
  Package, 
  Plus,
  XCircle,
  Image as ImageIcon,
  Filter,
  Save,
  RefreshCw,
  ArrowUpDown,
  Tag
} from "lucide-react";

type InventoryItem = {
  _id: string;
  name: string;
  branch: string;
  quantity: number;
  status: string;
  image: string;
  productCode: string;
  price: number;
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: "",
    image: "",
    productCode: "",
    price: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  } | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);

  useEffect(() => {
    fetchInventory();
    fetchBranches();
  }, []);

  const fetchInventory = () => {
    setIsLoading(true);
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data) => {
        setInventory(data.inventory);
        setIsLoading(false);
      })
      .catch(err => {
        toast.error("Failed to load inventory");
        setIsLoading(false);
      });
  };

  const fetchBranches = () => {
    fetch("/api/branches")
      .then((res) => res.json())
      .then((data) => setBranches(data.branches || []))
      .catch(err => {
        console.error("Failed to load branches:", err);
        setBranches([]);
      });
  };

  // First filter by branch
  const filteredByBranch =
    selectedBranch === "all"
      ? inventory
      : inventory.filter((item: any) => item.branch === selectedBranch);

  // Then filter by search term (searching by name or product code)
  const searchFilteredInventory = filteredByBranch.filter((item: any) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.productCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort function
  const sortedInventory = () => {
    if (!sortConfig) return searchFilteredInventory;
    
    return [...searchFilteredInventory].sort((a, b) => {
      if (a[sortConfig.key as keyof InventoryItem] < b[sortConfig.key as keyof InventoryItem]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key as keyof InventoryItem] > b[sortConfig.key as keyof InventoryItem]) {
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

  const handleAddItem = () => {
    if (!newItem.name || !newItem.quantity || !newItem.productCode || !newItem.price) {
      toast.error("Incomplete Information", {
        description: "Please fill in all required fields.",
      });
      return;
    }

    const itemData = {
      name: newItem.name,
      quantity: newItem.quantity,
      image: uploadedImage || newItem.image,
      productCode: newItem.productCode,
      price: parseFloat(newItem.price),
    };

    fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemData),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to add item");
        return res.json();
      })
      .then((created) => {
        const updatedInventory = inventory.find(
          (item) => item.productCode === created.productCode
        )
          ? inventory.map((item) =>
              item.productCode === created.productCode ? created : item
            )
          : [...inventory, created];
        setInventory(updatedInventory);
        setNewItem({ name: "", quantity: "", image: "", productCode: "", price: "" });
        setUploadedImage(null);
        setIsAddingItem(false);
        toast.success("Item Added", {
          description: `${created.name} has been successfully added to inventory.`,
        });
      })
      .catch((error: any) => {
        toast.error("Error Adding Item", {
          description: error.message || "Failed to add item to inventory.",
        });
      });
  };

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    setInventory(
      inventory.map((item) =>
        item._id === id
          ? { ...item, quantity: newQuantity, status: newQuantity > 0 ? "In Stock" : "Out of Stock" }
          : item
      )
    );
  };

  const saveQuantityChanges = (id: string, quantity: number) => {
    fetch(`/api/inventory/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update quantity");
        toast.success("Quantity Updated", {
          description: "Item quantity has been updated successfully.",
        });
      })
      .catch((error: any) => {
        toast.error("Update Failed", {
          description: error.message || "Failed to update quantity.",
        });
      });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center">
          <Package className="mr-3 h-6 w-6 text-blue-600" />
          Inventory Management
        </h1>
        
        <Button 
          onClick={() => setIsAddingItem(!isAddingItem)} 
          className={`rounded-lg shadow-sm ${isAddingItem ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isAddingItem ? (
            <>
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add New Item
            </>
          )}
        </Button>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name or product code"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-lg border-gray-200"
            />
          </div>
          <div className="flex space-x-2">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <label htmlFor="branch-filter" className="sr-only">Filter by branch</label>
              <select
                id="branch-filter"
                className="border border-gray-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                <option value="all">All Branches</option>
                {branches.map((branch: any) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="outline" onClick={fetchInventory} className="rounded-lg border-gray-200">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Add New Item Form */}
      {isAddingItem && (
        <Card className="border-0 shadow-sm rounded-xl mb-8 overflow-hidden">
          <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
            <CardTitle className="text-lg flex items-center">
              <Plus className="mr-2 h-5 w-5 text-blue-600" />
              Add New Item
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <Input
                  placeholder="Item Name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Code</label>
                <Input
                  placeholder="e.g. PRD-001"
                  value={newItem.productCode}
                  onChange={(e) => setNewItem({ ...newItem, productCode: e.target.value })}
                  className="rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <Input
                  type="number"
                  placeholder="Initial stock"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  className="rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (Rs)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  className="rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Product Image</label>
              {!uploadedImage ? (
                <div className="bg-gray-50 p-6 rounded-lg border border-dashed border-gray-200 flex flex-col items-center justify-center">
                  <ImageIcon className="h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 mb-4">Upload a product image</p>
                  <UploadButton
                    endpoint="imageUploader"
                    onClientUploadComplete={(res) => {
                      setUploadedImage(res[0].url);
                      toast.success("Upload Completed", {
                        description: `Image uploaded successfully: ${res[0].name}`,
                      });
                    }}
                    onUploadError={(error: Error) => {
                      toast.error("Upload Failed", {
                        description: `ERROR! ${error.message}`,
                      });
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <div className="relative w-24 h-24 rounded-md overflow-hidden border border-gray-200">
                    <Image
                      src={uploadedImage}
                      alt="Uploaded Image"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setUploadedImage(null)}
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 rounded-lg"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsAddingItem(false)}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddItem}
                className="bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Item
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Grid View */}
      <div className="mb-8">
        <h2 className="text-xl font-medium mb-4 flex items-center text-gray-800">
          <Tag className="mr-2 h-5 w-5 text-blue-600" />
          Inventory Items
        </h2>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="bg-gray-100 animate-pulse h-72 rounded-xl"></div>
            ))}
          </div>
        ) : searchFilteredInventory.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-12 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-gray-500 font-medium">No inventory items found</h3>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedInventory().map((item: any) => (
              <Card key={item._id} className="overflow-hidden border-0 shadow-sm rounded-xl hover:shadow-md transition-shadow">
                <div className="relative h-48 bg-gray-100">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <Package className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                  <Badge className={`absolute top-2 right-2 ${
                    item.quantity > 0 
                      ? "bg-green-100 text-green-800 border border-green-200" 
                      : "bg-red-100 text-red-800 border border-red-200"
                  }`}>
                    {item.quantity > 0 ? "In Stock" : "Out of Stock"}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium text-gray-900 mb-1 truncate">{item.name}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Code:</span>
                      <span className="font-mono text-gray-700">{item.productCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Quantity:</span>
                      <span className="font-medium text-gray-700">{item.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Price:</span>
                      <span className="font-medium text-gray-900">Rs{(item.price ?? 0).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Inventory Table */}
      
    </div>
  );
}