"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"

type Task = {
  id: number
  orderNumber: string
  product: string
  quantity: number
  dueDate: string
}

type Employee = {
  id: number
  name: string
}

const initialTasks: Task[] = [
  { id: 1, orderNumber: "ORD-001", product: "T-Shirt", quantity: 50, dueDate: "2023-06-15" },
  { id: 2, orderNumber: "ORD-002", product: "Mug", quantity: 100, dueDate: "2023-06-18" },
  { id: 3, orderNumber: "ORD-003", product: "Poster", quantity: 200, dueDate: "2023-06-20" },
]

const employees: Employee[] = [
  { id: 1, name: "John Doe" },
  { id: 2, name: "Jane Smith" },
  { id: 3, name: "Bob Johnson" },
]

export function UnassignedTasks() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [selectedEmployees, setSelectedEmployees] = useState<Record<number, string>>({})

  const handleAssignTask = (taskId: number) => {
    const employeeName = selectedEmployees[taskId]
    if (employeeName) {
      // In a real application, you would make an API call to assign the task
      setTasks(tasks.filter((task) => task.id !== taskId))
      toast({
        title: "Task Assigned",
        description: `Task ${taskId} assigned to ${employeeName}`,
      })
      // Clear the selected employee for this task
      setSelectedEmployees((prev) => {
        const newSelectedEmployees = { ...prev }
        delete newSelectedEmployees[taskId]
        return newSelectedEmployees
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unassigned Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Number</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Assign To</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>{task.orderNumber}</TableCell>
                <TableCell>{task.product}</TableCell>
                <TableCell>{task.quantity}</TableCell>
                <TableCell>{task.dueDate}</TableCell>
                <TableCell>
                  <Select
                    value={selectedEmployees[task.id] || ""}
                    onValueChange={(value) => setSelectedEmployees((prev) => ({ ...prev, [task.id]: value }))}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.name}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button onClick={() => handleAssignTask(task.id)} disabled={!selectedEmployees[task.id]}>
                    Assign Task
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

