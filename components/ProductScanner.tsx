// components/ProductScanner.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type ScannedProduct = {
  _id: string;
  productCode: string;
  name: string;
  quantity: number;
  image: string;
  branch: string;
  status: string;
  price?: number;
  size?: string;
  color?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
};

interface ProductScannerProps {
  onProductScanned: (product: ScannedProduct) => void;
}

interface ProductInput {
  code: string;
  name: string;
  id: string;
}

export function ProductScanner({ onProductScanned }: ProductScannerProps) {
  const { toast } = useToast();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  
  const [productInput, setProductInput] = useState<ProductInput>({
    code: "",
    name: "",
    id: ""
  });
  const [suggestions, setSuggestions] = useState<ScannedProduct[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      setCameraOpen(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraOpen(false);
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    if (!stream || !cameraOpen) return;

    const video = document.querySelector('video');
    if (!video) return;

    video.srcObject = stream;
    video.play();

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    const scanQRCode = async () => {
      if (!context || !video) return;
      
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
          if ('BarcodeDetector' in window) {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ['qr_code']
            });
            const codes = await barcodeDetector.detect(canvas);
            
            if (codes.length > 0) {
              const scannedCode = codes[0].rawValue;
              handleScannedCode(scannedCode);
              stopCamera();
              return;
            }
          }
        } catch (error) {
          console.error('QR Code detection error:', error);
        }
      }
      requestAnimationFrame(scanQRCode);
    };

    scanQRCode();
  }, [stream, cameraOpen]);

  const handleScannedCode = (scannedCode: string) => {
    setProductInput(prev => ({
      ...prev,
      code: scannedCode,
      name: "",
      id: ""
    }));
    
    toast({
      title: "Code Scanned",
      description: `Scanned code: ${scannedCode}`,
      variant: "success"
    });
  };

  const handleInputChange = (value: string) => {
    setProductInput(prev => ({
      ...prev,
      code: value,
      name: "",
      id: ""
    }));
  };

  const handleProductSelect = (selectedCode: string) => {
    const selectedProduct = suggestions.find(s => s.productCode === selectedCode);
    if (selectedProduct) {
      updateProductInput(selectedProduct);
      onProductScanned(selectedProduct);
    }
  };

  const updateProductInput = (product: ScannedProduct) => {
    setProductInput({
      code: product.productCode,
      name: product.name,
      id: product._id
    });
  };

  const handleManualSubmit = () => {
    if (suggestions.length > 0) {
      const selected = suggestions[0];
      updateProductInput(selected);
      onProductScanned(selected);
    } else {
      toast({
        title: "No product found",
        description: "No product found for the entered code",
        variant: "destructive"
      });
    }
  };

  const fetchSuggestions = async (query: string) => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/inventory/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      
      if (res.ok && data.results) {
        const transformedResults = data.results.map((item: ScannedProduct) => ({
          ...item,
          code: item.productCode
        }));
        setSuggestions(transformedResults);
      } else {
        toast({
          title: "Error",
          description: "Error fetching suggestions",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching suggestions", error);
      toast({
        title: "Error",
        description: "Error fetching suggestions",
        variant: "destructive"
      });
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    if (productInput.code) {
      fetchSuggestions(productInput.code);
    } else {
      setSuggestions([]);
    }
  }, [productInput.code]);

  return (
    <div className="border p-4 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Product Scanner</h2>
      
      <Dialog open={cameraOpen} onOpenChange={(open) => {
        if (!open) stopCamera();
        setCameraOpen(open);
      }}>
        <DialogTrigger asChild>
          <Button onClick={startCamera} className="mb-4">
            <Camera className="mr-2 h-4 w-4" />
            Scan QR/Barcode
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Position the QR code within the camera view
            </DialogDescription>
          </DialogHeader>
          <div className="relative aspect-video w-full overflow-hidden rounded-lg">
            <video
              className="h-full w-full object-cover"
              playsInline
              muted
            />
          </div>
        </DialogContent>
      </Dialog>

      <div>
        <Label htmlFor="productCode">Product Code</Label>
        <div className="flex mt-2 space-x-2">
          <Input
            id="productCode"
            value={productInput.code}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Enter product code"
          />
          <Button 
            type="button" 
            onClick={handleManualSubmit} 
            disabled={loadingSuggestions}
          >
            {loadingSuggestions ? "Loading..." : "Submit"}
          </Button>
        </div>

        {productInput.name && (
          <div className="mt-2">
            <Label>Selected Product</Label>
            <Input
              value={productInput.name}
              readOnly
              className="mt-1 bg-gray-50"
            />
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="mt-2">
            <Label>Suggestions:</Label>
            <Select
              value={productInput.code}
              onValueChange={handleProductSelect}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {suggestions.map((suggestion) => (
                  <SelectItem key={suggestion._id} value={suggestion.productCode}>
                    <div className="flex items-center space-x-2">
                      <Image
                        src={suggestion.image || "/placeholder.svg"}
                        alt={suggestion.name}
                        width={30}
                        height={30}
                        className="rounded-sm"
                      />
                      <span>
                        {suggestion.name} - {suggestion.productCode}
                        <span className="text-sm text-gray-500 ml-2">
                          ({suggestion.quantity} in stock | {suggestion.branch})
                        </span>
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
