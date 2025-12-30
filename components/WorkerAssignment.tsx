"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const initialWorkers = ["John Doe", "Jane Smith", "Bob Johnson"]

export function WorkerAssignment() {
  const [workers, setWorkers] = useState(initialWorkers)
  const [selectedWorker, setSelectedWorker] = useState("")
  const [assignedWorker, setAssignedWorker] = useState("")

  const handleAssign = () => {
    if (selectedWorker) {
      setAssignedWorker(selectedWorker)
      setWorkers(workers.filter((worker) => worker !== selectedWorker))
      setSelectedWorker("")
    }
  }

  return (
    <div className="border p-4 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Worker Assignment</h2>
      <Select value={selectedWorker} onValueChange={setSelectedWorker}>
        <SelectTrigger className="mb-4">
          <SelectValue placeholder="Select a worker" />
        </SelectTrigger>
        <SelectContent>
          {workers.map((worker) => (
            <SelectItem key={worker} value={worker}>
              {worker}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleAssign} disabled={!selectedWorker}>
        Assign Worker
      </Button>
      {assignedWorker && <p className="mt-4">Assigned Worker: {assignedWorker}</p>}
    </div>
  )
}

