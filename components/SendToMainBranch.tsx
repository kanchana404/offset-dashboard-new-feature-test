"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function SendToMainBranch() {
  const [orderDetails, setOrderDetails] = useState("")

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real application, this would send the order to the main branch
    alert(`Order sent to main branch: ${orderDetails}`)
    setOrderDetails("")
  }

  return (
    <div className="border p-4 rounded-lg mt-4">
      <h2 className="text-xl font-semibold mb-4">Send T-Shirt Order to Main Branch</h2>
      <form onSubmit={handleSend}>
        <Label htmlFor="orderDetails">Order Details</Label>
        <Input
          id="orderDetails"
          value={orderDetails}
          onChange={(e) => setOrderDetails(e.target.value)}
          placeholder="Enter order details"
          className="mt-2 mb-4"
        />
        <Button type="submit">Send to Main Branch</Button>
      </form>
    </div>
  )
}

