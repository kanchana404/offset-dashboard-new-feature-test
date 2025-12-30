"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Employee = {
  _id: string;
  name: string;
  position: string;
  contactNumber: string;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({});
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    fetch("/api/employees/branch")
      .then((res) => res.json())
      .then((data) => {
        if (data.employees) {
          setEmployees(data.employees);
        }
      })
      .catch((error) => console.error("Error fetching employees:", error));
  }, []);

  const handleAddEmployee = () => {
    if (newEmployee.name && newEmployee.position && newEmployee.contactNumber) {
      fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmployee),
      })
        .then((res) => res.json())
        .then((created) => {
          setEmployees([...employees, created]);
          setNewEmployee({});
        })
        .catch((error) => console.error("Error adding employee:", error));
    }
  };

  const handleUpdateEmployee = () => {
    if (editingEmployee) {
      fetch(`/api/employees/${editingEmployee._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingEmployee),
      })
        .then((res) => res.json())
        .then((updated) => {
          setEmployees(employees.map((emp) => (emp._id === updated._id ? updated : emp)));
          setEditingEmployee(null);
        })
        .catch((error) => console.error("Error updating employee:", error));
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Employees</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Contact Number</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee._id}>
              <TableCell>{employee.name}</TableCell>
              <TableCell>{employee.position}</TableCell>
              <TableCell>{employee.contactNumber}</TableCell>
              <TableCell>
                <Button onClick={() => setEditingEmployee(employee)}>Edit</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2 className="text-2xl font-bold mt-8 mb-4">Add New Employee</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={newEmployee.name || ""}
            onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
            placeholder="Enter name"
          />
        </div>
        <div>
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            value={newEmployee.position || ""}
            onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
            placeholder="Enter position"
          />
        </div>
        <div>
          <Label htmlFor="contactNumber">Contact Number</Label>
          <Input
            id="contactNumber"
            value={newEmployee.contactNumber || ""}
            onChange={(e) => setNewEmployee({ ...newEmployee, contactNumber: e.target.value })}
            placeholder="Enter contact number"
          />
        </div>
        <div className="flex items-end">
          <Button onClick={handleAddEmployee}>Add Employee</Button>
        </div>
      </div>

      {editingEmployee && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Edit Employee</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="editName">Name</Label>
              <Input
                id="editName"
                value={editingEmployee.name}
                onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="editPosition">Position</Label>
              <Input
                id="editPosition"
                value={editingEmployee.position}
                onChange={(e) => setEditingEmployee({ ...editingEmployee, position: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="editContactNumber">Contact Number</Label>
              <Input
                id="editContactNumber"
                value={editingEmployee.contactNumber}
                onChange={(e) => setEditingEmployee({ ...editingEmployee, contactNumber: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleUpdateEmployee}>Update Employee</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
