"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserCheck, UserMinus, UserX, Users, Fingerprint } from "lucide-react"
import { toast } from "@/hooks/use-toast"

type AttendanceRecord = {
  id: number
  employeeName: string
  date: string
  timeIn: string
  timeOut: string | null
  status: "Present" | "Absent" | "Late"
}

const initialAttendance: AttendanceRecord[] = [
  { id: 1, employeeName: "John Doe", date: "2023-06-01", timeIn: "09:00", timeOut: "17:00", status: "Present" },
  { id: 2, employeeName: "Jane Smith", date: "2023-06-01", timeIn: "09:15", timeOut: "17:00", status: "Late" },
  { id: 3, employeeName: "Bob Johnson", date: "2023-06-01", timeIn: "09:00", timeOut: null, status: "Present" },
]

const employees = ["John Doe", "Jane Smith", "Bob Johnson", "Alice Brown"]

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(initialAttendance)
  const [selectedEmployee, setSelectedEmployee] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0])

  const handleMarkAttendance = (type: "in" | "out") => {
    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive",
      })
      return
    }

    const now = new Date()
    const time = now.toTimeString().split(" ")[0].substr(0, 5)

    const existingRecord = attendance.find(
      (record) => record.employeeName === selectedEmployee && record.date === selectedDate,
    )

    if (existingRecord) {
      if (type === "in" && existingRecord.timeIn) {
        toast({
          title: "Error",
          description: "Employee has already clocked in for today",
          variant: "destructive",
        })
        return
      }

      const updatedAttendance = attendance.map((record) => {
        if (record.id === existingRecord.id) {
          return {
            ...record,
            timeOut: type === "out" ? time : record.timeOut,
            status: type === "in" && now.getHours() >= 9 ? "Late" : "Present",
          }
        }
        return record
      })
      setAttendance(updatedAttendance)
    } else {
      const newRecord: AttendanceRecord = {
        id: attendance.length + 1,
        employeeName: selectedEmployee,
        date: selectedDate,
        timeIn: type === "in" ? time : "",
        timeOut: type === "out" ? time : null,
        status: now.getHours() >= 9 ? "Late" : "Present",
      }
      setAttendance([...attendance, newRecord])
    }

    toast({
      title: "Success",
      description: `${selectedEmployee} has clocked ${type} at ${time}`,
    })
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Attendance Management</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="mr-2" />
            Mark Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <Label htmlFor="employee">Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee} value={employee}>
                      {employee}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
          </div>
          <div className="flex space-x-4">
            <Button onClick={() => handleMarkAttendance("in")}>Clock In</Button>
            <Button onClick={() => handleMarkAttendance("out")}>Clock Out</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Fingerprint className="mr-2" />
            Fingerprint Scanning (Coming Soon)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Fingerprint scanning for attendance marking will be available soon. This feature will allow for quick and
            secure attendance tracking.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2" />
            Attendance Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time In</TableHead>
                <TableHead>Time Out</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.employeeName}</TableCell>
                  <TableCell>{record.date}</TableCell>
                  <TableCell>{record.timeIn}</TableCell>
                  <TableCell>{record.timeOut || "Not clocked out"}</TableCell>
                  <TableCell>
                    {record.status === "Present" && <UserCheck className="text-green-500" />}
                    {record.status === "Late" && <UserMinus className="text-yellow-500" />}
                    {record.status === "Absent" && <UserX className="text-red-500" />}
                    <span className="ml-2">{record.status}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

