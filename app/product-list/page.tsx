"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Search, 
  Package, 
  RefreshCw, 
  Grid, 
  List,
  ArrowUpDown,
  Tag,
  ImageIcon,
  X,
  ZoomIn
} from "lucide-react";
import Image from "next/image";

// Updated type to include image and inventory status
type InventoryItem = {
  _id: string;
  inventoryItemId: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  selectedQuantity: number;
  unit: string;
  totalPrice: number;
  userId?: string;
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
  image?: string | null; // Added image field
  inventoryStatus?: string; // Added inventory status
};

const InventoryPage = () => {
  const [search, setSearch] = useState("");
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  } | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const fetchInventoryItems = async () => {
    setIsLoading(true);
    let url = "/api/inventory/all";
    
    try {
      if (search) {
        url += `?search=${encodeURIComponent(search)}`;
      }
      
      const res = await fetch(url);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
      }
      
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setInventoryItems(data);
      } else {
        console.error('Unexpected data format:', data);
        setInventoryItems([]);
      }
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      setInventoryItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryItems();
  }, []);

  // Sort function
  const sortedInventory = () => {
    if (!sortConfig) return inventoryItems;
    
    return [...inventoryItems].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof InventoryItem];
      const bValue = b[sortConfig.key as keyof InventoryItem];
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchInventoryItems();
    }
  };

  const getStatusBadge = (selectedQuantity: number) => {
    if (selectedQuantity <= 0) {
      return (
        <Badge className="bg-red-100 text-red-800 border border-red-200">
          Not Selected
        </Badge>
      );
    }
    
    if (selectedQuantity > 0) {
      return (
        <Badge className="bg-green-100 text-green-800 border border-green-200">
          Selected
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-amber-100 text-amber-800 border border-amber-200">
        Unknown
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toFixed(2)}`;
  };

  // Handle image click - opens modal with larger image
  const handleImageClick = (src: string, alt: string) => {
    setSelectedImage({ src, alt });
    setIsImageModalOpen(true);
  };

  // Close modal
  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setSelectedImage(null);
  };

  // Image Modal Component
  const ImageModal = () => {
    if (!selectedImage) return null;
    
    return (
      <Dialog open={isImageModalOpen} onOpenChange={closeImageModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {selectedImage.alt}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeImageModal}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="px-6 pb-6">
            <div className="relative w-full h-96 md:h-[500px] rounded-lg overflow-hidden bg-gray-100">
              <img
                src={selectedImage.src}
                alt={selectedImage.alt}
                className="w-full h-full object-contain"
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center">
          <Package className="mr-3 h-6 w-6 text-blue-600" />
          Selected Items Management
        </h1>
      </div>

      {/* Search and View Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, Product Code, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 rounded-lg border-gray-200 w-full"
            />
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={fetchInventoryItems} 
              className="bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
            <Button 
              variant="outline" 
              onClick={fetchInventoryItems} 
              className="rounded-lg border-gray-200"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? "default" : "ghost"}
                onClick={() => setViewMode('grid')}
                className={`rounded-lg ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'bg-transparent'}`}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'table' ? "default" : "ghost"}
                onClick={() => setViewMode('table')}
                className={`rounded-lg ${viewMode === 'table' ? 'bg-white shadow-sm' : 'bg-transparent'}`}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="mb-8">
          <h2 className="text-xl font-medium mb-4 flex items-center text-gray-800">
            <Tag className="mr-2 h-5 w-5 text-blue-600" />
            Selected Items
            <Badge className="ml-2 bg-blue-100 text-blue-800 border border-blue-200">
              {inventoryItems.length}
            </Badge>
          </h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                <div key={item} className="bg-gray-100 animate-pulse h-80 rounded-xl"></div>
              ))}
            </div>
          ) : inventoryItems.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-12 text-center">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-gray-500 font-medium">No selected items found</h3>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedInventory().map((item) => (
                <Card key={item._id} className="overflow-hidden border-0 shadow-sm rounded-xl hover:shadow-md transition-shadow group">
                  <div className="relative h-48 overflow-hidden">
                    {item.image ? (
                      <div className="relative w-full h-full cursor-pointer group" onClick={() => handleImageClick(item.image!, item.name)}>
                        <Image 
                          src={item.image} 
                          alt={item.name}
                          fill
                          className="rounded-t-xl object-contain transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                          <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                        <Package className="h-8 w-8 text-blue-300" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                      {getStatusBadge(item.selectedQuantity)}
                    </div>
                    {!item.image && (
                      <div className="absolute bottom-2 left-2">
                        <Badge className="bg-gray-100 text-gray-600 border border-gray-200 text-xs">
                          <ImageIcon className="h-3 w-3 mr-1" />
                          No Image
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-gray-900 mb-2 truncate" title={item.name}>
                      {item.name}
                    </h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Category:</span>
                        <span className="text-gray-700 truncate ml-2">{item.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Product Code:</span>
                        <span className="font-mono text-gray-700 text-xs truncate ml-2">{item.sku}</span>
                      </div>
                     
                      <div className="flex justify-between">
                        <span className="text-gray-500">Unit Price:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(item.price)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 mt-2">
                        <span className="text-gray-500 font-medium">Total:</span>
                        <span className="font-bold text-gray-900">{formatCurrency(item.totalPrice)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
            <CardTitle className="text-lg flex items-center">
              <List className="mr-2 h-5 w-5 text-blue-600" />
              Selected Items Table
              <Badge className="ml-2 bg-blue-100 text-blue-800 border border-blue-200">
                {inventoryItems.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 border-b border-gray-100">
                  <TableRow>
                    <TableHead className="font-medium text-gray-600">Image</TableHead>
                    <TableHead className="font-medium text-gray-600 cursor-pointer" onClick={() => requestSort('name')}>
                      <div className="flex items-center">
                        Name
                        {sortConfig?.key === 'name' && (
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="font-medium text-gray-600 cursor-pointer" onClick={() => requestSort('category')}>
                      <div className="flex items-center">
                        Category
                        {sortConfig?.key === 'category' && (
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="font-medium text-gray-600">Product Code</TableHead>
                    <TableHead className="font-medium text-gray-600 cursor-pointer" onClick={() => requestSort('selectedQuantity')}>
                      <div className="flex items-center">
                        Quantity
                        {sortConfig?.key === 'selectedQuantity' && (
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="font-medium text-gray-600">Unit</TableHead>
                    <TableHead className="font-medium text-gray-600 cursor-pointer" onClick={() => requestSort('price')}>
                      <div className="flex items-center">
                        Unit Price
                        {sortConfig?.key === 'price' && (
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="font-medium text-gray-600 cursor-pointer" onClick={() => requestSort('totalPrice')}>
                      <div className="flex items-center">
                        Total Price
                        {sortConfig?.key === 'totalPrice' && (
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="font-medium text-gray-600">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                          <span className="ml-2 text-gray-600">Loading selected items...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : inventoryItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">No selected items found.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedInventory().map((item) => (
                      <TableRow key={item._id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="w-20">
                          <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 relative group">
                            {item.image ? (
                              <div 
                                className="relative w-full h-full cursor-pointer"
                                onClick={() => handleImageClick(item.image!, item.name)}
                              >
                                <Image 
                                  src={item.image} 
                                  alt={item.name}
                                  fill
                                  className="object-contain transition-transform duration-200 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                                  <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                                <Package className="h-4 w-4 text-blue-300" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-gray-800">
                          <div className="max-w-xs truncate" title={item.name}>
                            {item.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={item.category}>
                            {item.category}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-600">
                          <div className="max-w-xs truncate" title={item.sku}>
                            {item.sku}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{item.selectedQuantity}</TableCell>
                        <TableCell className="text-gray-600">{item.unit}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="font-bold">{formatCurrency(item.totalPrice)}</TableCell>
                        <TableCell>
                          {getStatusBadge(item.selectedQuantity)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Modal */}
      <ImageModal />
    </div>
  );
};

export default InventoryPage;