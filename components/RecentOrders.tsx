"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ScannedProduct = {
  code: string
  type: string
}

interface ProductScannerProps {
  onProductScanned: (product: ScannedProduct) => void
}

export function ProductScanner({ onProductScanned }: ProductScannerProps) {
  const [productCode, setProductCode] = useState("")

  const handleScan = () => {
    // In a real application, this would trigger the QR/barcode scanner
    alert("Scanning...")
    // Simulating a scanned product
    const scannedProduct: ScannedProduct = {
      code: "PROD-001",
      type: "T-Shirt",
    }
    onProductScanned(scannedProduct)
  }

  const handleManualInput = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real application, this would validate the input and fetch product details
    const scannedProduct: ScannedProduct = {
      code: productCode,
      type: productCode === "TSHIRT" ? "T-Shirt" : "Mug",
    }
    onProductScanned(scannedProduct)
    setProductCode("")
  }

  return (
    <div className="border p-4 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Product Scanner</h2>
      <Button onClick={handleScan} className="mb-4">
        Scan QR/Barcode
      </Button>
      <form onSubmit={handleManualInput}>
        <Label htmlFor="productCode">Manual Input</Label>
        <div className="flex mt-2">
          <Input
            id="productCode"
            value={productCode}
            onChange={(e) => setProductCode(e.target.value)}
            placeholder="Enter product code"
            className="mr-2"
          />
          <Button type="submit">Submit</Button>
        </div>
      </form>
    </div>
  )
}

