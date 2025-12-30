# Offset Dashboard - Complete Migration Documentation

## Overview
This document provides comprehensive documentation for the Offset Dashboard system, covering all features, database schema (converted to Supabase/PostgreSQL), API endpoints, and reusable code components for migration to the new modern dashboard.

---

## 1. Database Schema (Supabase/PostgreSQL)

### 1.1 Core Tables

#### Branches Table
```sql
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('main', 'sub')),
    location TEXT NOT NULL,
    contact TEXT[] DEFAULT '{}',
    allowed_products TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure only one main branch exists
CREATE UNIQUE INDEX unique_main_branch ON branches (type) WHERE type = 'main';

-- RLS Policy
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Branches are viewable by authenticated users" ON branches FOR SELECT USING (auth.role() = 'authenticated');
```

#### Orders Table
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(255) NOT NULL UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    whatsapp_number VARCHAR(20) NOT NULL,
    category VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    order_items JSONB DEFAULT '[]',
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    advance_payment DECIMAL(10,2) NOT NULL DEFAULT 0,
    send_to_main_branch BOOLEAN NOT NULL DEFAULT false,
    assign_task BOOLEAN NOT NULL DEFAULT true,
    sent_to_main_branch BOOLEAN NOT NULL DEFAULT false,
    order_date TIMESTAMP WITH TIME ZONE NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    branch_id UUID REFERENCES branches(id),
    branch_name VARCHAR(255), -- Denormalized for performance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_orders_branch_id ON orders(branch_id);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);

-- RLS Policy
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Orders are viewable by branch users" ON orders FOR SELECT USING (
    branch_id IN (SELECT id FROM branches WHERE name = auth.jwt() ->> 'branch_name')
);
```

#### Tasks Table
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    order_id VARCHAR(255) NOT NULL UNIQUE,
    products JSONB DEFAULT '[]',
    priority VARCHAR(20) NOT NULL,
    branch_id UUID REFERENCES branches(id),
    branch_name VARCHAR(255), -- Denormalized
    employee_id UUID REFERENCES employees(id),
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Sent to Main Branch', 'Temporary Completed', 'Returned')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    start_price DECIMAL(10,2),
    end_price DECIMAL(10,2),
    needs_transfer BOOLEAN DEFAULT false,
    description TEXT,
    artwork_image TEXT,
    advance_payment DECIMAL(10,2),
    full_payment DECIMAL(10,2),
    ready_for_payment BOOLEAN DEFAULT false,
    invoice_created BOOLEAN DEFAULT false,
    invoice_data JSONB,
    last_payment_method VARCHAR(50),
    cheque_status VARCHAR(20) CHECK (cheque_status IN ('pending', 'cleared', 'returned')),
    cheque_notes TEXT,
    online_payment_status VARCHAR(20) CHECK (online_payment_status IN ('pending', 'confirmed', 'failed')),
    online_payment_notes TEXT,
    payment_history JSONB DEFAULT '[]',
    -- Legacy fields for backward compatibility
    product_type VARCHAR(255),
    product_price DECIMAL(10,2),
    product_quantity INTEGER,
    total_waste DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tasks_branch_id ON tasks(branch_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_start_time ON tasks(start_time);
CREATE INDEX idx_tasks_employee_id ON tasks(employee_id);

-- RLS Policy
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tasks are viewable by branch users" ON tasks FOR SELECT USING (
    branch_id IN (SELECT id FROM branches WHERE name = auth.jwt() ->> 'branch_name')
);
```

#### Employees Table
```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    branch VARCHAR(255) NOT NULL, -- Denormalized
    salary DECIMAL(10,2) NOT NULL,
    skills TEXT[] DEFAULT '{}',
    is_available BOOLEAN DEFAULT true,
    join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_employees_branch_id ON employees(branch_id);
CREATE INDEX idx_employees_is_available ON employees(is_available);

-- RLS Policy
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees are viewable by branch users" ON employees FOR SELECT USING (
    branch_id IN (SELECT id FROM branches WHERE name = auth.jwt() ->> 'branch_name')
);
```

#### Notices Table
```sql
CREATE TABLE notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('best_team', 'best_employee', 'other')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    team_name VARCHAR(255),
    team_members TEXT[] DEFAULT '{}',
    branch_id UUID REFERENCES branches(id),
    employee_id UUID REFERENCES employees(id),
    employee_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(255) NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notices_type ON notices(type);
CREATE INDEX idx_notices_is_active ON notices(is_active);
CREATE INDEX idx_notices_branch_id ON notices(branch_id);

-- RLS Policy
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notices are viewable by all authenticated users" ON notices FOR SELECT USING (auth.role() = 'authenticated');
```

### 1.2 Supporting Tables

#### Inventory Items Table
```sql
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    branch_id UUID REFERENCES branches(id) NOT NULL,
    branch_name VARCHAR(255) NOT NULL, -- Denormalized
    quantity INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'In Stock',
    image TEXT,
    product_id VARCHAR(255) NOT NULL,
    product_code VARCHAR(20),
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(branch_id, product_id),
    UNIQUE(branch_id, product_code)
);

-- Indexes
CREATE INDEX idx_inventory_branch_id ON inventory_items(branch_id);
CREATE INDEX idx_inventory_product_id ON inventory_items(product_id);
```

#### Categories Table
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Credits Table
```sql
CREATE TABLE credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_number VARCHAR(20) NOT NULL UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    used_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Sent Orders Table
```sql
CREATE TABLE sent_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(255) NOT NULL UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    order_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    sent_branch VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Sent to Main Branch',
    level INTEGER DEFAULT 1,
    images TEXT[] DEFAULT '{}',
    invoice_created BOOLEAN DEFAULT false,
    invoice_data JSONB,
    products JSONB DEFAULT '[]',
    full_payment DECIMAL(10,2) DEFAULT 0,
    last_payment_method VARCHAR(50),
    payment_history JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 1.3 Additional Tables

#### Order Counters Table
```sql
CREATE TABLE order_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_name VARCHAR(255) NOT NULL UNIQUE,
    last_order_number INTEGER NOT NULL DEFAULT 0,
    branch_prefix VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Task Assignments Table
```sql
CREATE TABLE task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) NOT NULL,
    employee_id UUID REFERENCES employees(id) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Online Payments Table
```sql
CREATE TABLE online_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id),
    order_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 2. Dashboard Features

### 2.1 Dashboard Home Page

#### Metrics Cards
The dashboard displays 7 key metric cards:

1. **All Revenue Card**
   - **Value**: Total revenue from all orders (advance payments only)
   - **Source**: Orders table (advance_payment field)
   - **Logic**: If advance_payment exists and > 0, count advance_payment; otherwise count total_price
   - **Time Range**: Last 30 days
   - **Icon**: DollarSign
   - **Color**: Green
   - **Example**: Order with Rs 25,000 total and Rs 5,000 advance = Rs 5,000 revenue

2. **Completed Orders Revenue Card**
   - **Value**: Revenue from completed tasks (remaining amount after advance payment)
   - **Source**: Tasks table where status = 'Completed'
   - **Calculation**: total_price - advance_payment (from linked order)
   - **Time Range**: Last 30 days
   - **Icon**: TrendingUp
   - **Color**: Emerald
   - **Example**: Order with Rs 25,000 total and Rs 5,000 advance = Rs 20,000 completed revenue

3. **Total Orders Card**
   - **Value**: Count of all orders created
   - **Source**: Orders table
   - **Time Range**: Last 30 days
   - **Icon**: Package
   - **Color**: Blue

4. **New Customers Card**
   - **Value**: Count of unique customer emails
   - **Source**: Orders table (distinct customer_email)
   - **Time Range**: Last 30 days
   - **Icon**: Users
   - **Color**: Purple

5. **Growth Rate Card**
   - **Value**: Percentage change in orders vs previous 30 days
   - **Calculation**: ((current_30_days - previous_30_days) / previous_30_days) * 100
   - **Icon**: TrendingUp with arrow indicators
   - **Color**: Indigo

6. **Total Waste Card**
   - **Value**: Sum of waste from completed tasks
   - **Source**: Tasks table (total_waste field)
   - **Time Range**: Last 30 days
   - **Icon**: AlertTriangle
   - **Color**: Amber

7. **Best Teams Card**
   - **Value**: Display of best team notices
   - **Source**: Notices table where type = 'best_team'
   - **Icon**: Trophy
   - **Color**: Orange

8. **Best Employees Card**
   - **Value**: Display of best employee notices
   - **Source**: Notices table where type = 'best_employee'
   - **Icon**: Star
   - **Color**: Yellow

#### Revenue Comparison Chart
- **Type**: Bar Chart (dual bars)
- **Data**: Last 7 days revenue comparison
- **Bars**: 
  - All Revenue (from orders)
  - Completed Orders Revenue (from completed tasks)
- **Chart Library**: Recharts
- **Responsive**: Yes

#### Notice Board
- **Type**: Card with scrollable list
- **Data**: Notices where type = 'other' and is_active = true
- **Features**:
  - Priority indicators (high/medium/low with colors)
  - Created by and date information
  - Scrollable with max height

### 2.2 Branch Information Display
- **Current Branch**: Shows signed-in user's branch name and type
- **Branch Details**: Location and contact information
- **Data Source**: Branches table
- **Authentication**: JWT token contains branch information

---

## 3. Additional Routes & Features

### 3.1 Inventory Management (`/inventory`)
**Features:**
- **Add New Items**: Create inventory items with name, product code, quantity, price, and image
- **Image Upload**: Upload product images using UploadThing integration
- **Branch Filtering**: Filter inventory by branch (all branches or specific branch)
- **Search Functionality**: Search by item name or product code with real-time filtering
- **Quantity Management**: Update item quantities with real-time status updates
- **Grid View**: Card-based layout showing item images, details, and stock status
- **Sorting**: Sort by name, quantity, price, or product code
- **Stock Status**: Visual indicators for "In Stock" vs "Out of Stock"
- **Duplicate Handling**: Automatically updates existing items with same product code
- **Form Validation**: Required field validation with user feedback
- **Loading States**: Skeleton loading and error handling

**Data Structure:**
```typescript
type InventoryItem = {
  _id: string;
  name: string;
  branch: string;
  quantity: number;
  status: string;
  image: string;
  productCode: string;
  price: number;
  productId: string;
}
```

**API Endpoints:**
- `GET /api/inventory` - Fetch all inventory items for authenticated user's branch
- `POST /api/inventory` - Add new inventory item or update existing one
- `GET /api/inventory/search` - Search inventory items by name or product code
- `GET /api/inventory/all` - Fetch selected items (used by Product List)

**Missing Endpoint:**
- `PATCH /api/inventory/[id]` - **MISSING IMPLEMENTATION** (frontend expects this for quantity updates)

### 3.2 Product List (`/product-list`)
**Features:**
- **Selected Items Management**: View and manage items selected for orders
- **Dual View Modes**: Grid view and table view with toggle
- **Image Modal**: Click to view larger product images with zoom functionality
- **Advanced Search**: Search by name, product code, or category with real-time filtering
- **Status Tracking**: Visual badges for selected vs not selected items
- **Product Details**: Display category, SKU, unit price, total price, and quantity
- **Sorting**: Sort by name, category, quantity, unit price, or total price
- **Image Integration**: Product images from inventory with fallback for missing images
- **Responsive Design**: Mobile-friendly interface with adaptive layouts
- **Loading States**: Skeleton loading and error handling

**Data Structure:**
```typescript
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
  image?: string | null;
  inventoryStatus?: string;
}
```

**API Endpoints:**
- `GET /api/inventory/all` - Fetch all selected items with search support
  - Query Parameters: `?search={term}&userId={id}&sessionId={id}`
  - Returns: Array of selected items with populated inventory data
  - Includes product images from inventory system

### 3.3 Attendance Management (`/attendance`)
**Features:**
- **Clock In/Out**: Manual attendance marking for employees
- **Employee Selection**: Dropdown to select employee
- **Date Selection**: Choose specific date for attendance
- **Status Tracking**: Present, Late, or Absent status
- **Attendance Records**: Table view of all attendance records
- **Fingerprint Integration**: Placeholder for future fingerprint scanning
- **Time Tracking**: Record exact time in and time out

**Data Structure:**
```typescript
type AttendanceRecord = {
  id: number;
  employeeName: string;
  date: string;
  timeIn: string;
  timeOut: string | null;
  status: "Present" | "Absent" | "Late";
}
```

### 3.4 View Orders (`/orders`)
**Features:**
- **Completed Orders View**: Display all completed orders with detailed information
- **Advanced Search**: Search by order ID, customer name, or product type with real-time filtering
- **Multi-column Sorting**: Sort by order ID, customer, product, priority, or completion date
- **Comprehensive Order Details Modal**: Full order information including:
  - **Customer Information**: Name, email, WhatsApp number, order date
  - **Order Details**: Category, priority, branch, description
  - **Payment Breakdown**: Total cost, advance payment, full payment, balance due
  - **Image Gallery**: Order images, artwork, task images with click-to-view
  - **Task Timeline**: Start and completion times with visual timeline
- **Status & Priority Badges**: Color-coded visual indicators
- **Branch-specific Data**: Only shows orders for authenticated user's branch
- **Responsive Design**: Mobile-optimized with adaptive layouts
- **Error Handling**: Graceful handling of missing images and data

**Data Structure:**
```typescript
type CompletedOrder = {
  _id: string;
  orderId: string;
  productType: string;
  priority: string;
  status: string;
  branch: string;
  description?: string;
  startTime: string;
  endTime?: string;
  totalCost: number;
  advancePayment?: number;
  fullPayment?: number;
  balanceDue: number;
  customerName?: string;
  customerEmail?: string;
  whatsappNumber?: string;
  category?: string;
  orderDescription?: string;
  orderDate?: string;
  images?: string[];
  orderImages?: string[];
  taskImages?: string[];
  artworkImage?: string;
}
```

**API Endpoints:**
- `GET /api/completed-orders` - Fetch completed orders with full details
  - **Authentication**: Requires JWT token with branch information
  - **Branch Filtering**: Automatically filters by user's branch
  - **Data Aggregation**: Combines Task and Order data for complete information
  - **Image Handling**: Includes order images, task images, and artwork
  - **Performance**: Limited to 50 most recent orders, sorted by completion date
  - **Error Handling**: Comprehensive error responses with timestamps

### 3.5 Sent Orders (`/sent-orders`)
**Features:**
- **Order Tracking**: Track orders sent between branches
- **Progress Levels**: 5-level progress tracking system (1-5)
- **Invoice Creation**: Create invoices for completed orders
- **Payment Processing**: Handle multiple payment methods (cash, card, cheque, online)
- **Order Details**: Comprehensive order information display
- **Print Functionality**: Generate printable order details
- **Status Management**: Handle different order statuses (Sent to Branch, In Progress, Completed, Temporary Completed)
- **Product Information**: Display product details with names and quantities

**Payment Methods:**
- **Cash/Card/Online**: Immediate completion
- **Cheque**: Temporary completion until confirmation
- **Credits**: Customer credit system integration

**API Endpoints:**
- `GET /api/sent-orders` - Fetch sent orders
- `POST /api/sent-orders/receive` - Receive order at destination branch
- `PUT /api/sent-orders/create-invoice` - Create invoice for order
- `PUT /api/sent-orders/complete` - Complete order with payment

### 3.6 Credits Management (`/credit`)
**Features:**
- **Customer Credit Tracking**: Monitor customer credit balances and usage
- **Credit Adjustment**: Add or modify customer credit amounts
- **Advanced Search**: Search customers by phone number or name
- **Pagination**: Handle large customer lists with pagination (20 per page)
- **Real-time Updates**: Live credit balance updates
- **Network Status**: Online/offline status monitoring
- **Error Handling**: Robust error handling with retry mechanisms
- **Customer Selection**: Dropdown with search functionality for customer selection

**Statistics:**
- Total customers count
- Total balance across all customers
- Total used credits

**API Endpoints:**
- `GET /api/credits` - Fetch all customers with credit information
- `POST /api/credits` - Add credit to customer (create new or update existing)

**Credit Management Logic:**
- **New Customer**: Creates new credit record with specified amount
- **Existing Customer**: Adds amount to existing balance
- **Validation**: Requires whatsappNumber, customerName, and positive amount
- **Response**: Returns updated customer information with new balance

**Request Format (POST):**
```json
{
  "whatsappNumber": "string (required)",
  "customerName": "string (required)", 
  "customerEmail": "string (optional)",
  "amount": "number (required, positive)"
}
```

**Response Format:**
```json
{
  "success": true,
  "message": "Credit of ₹5000.00 added successfully",
  "customer": {
    "whatsappNumber": "string",
    "customerName": "string",
    "customerEmail": "string",
    "balance": "number",
    "usedAmount": "number"
  }
}
```

### 3.7 Notices Management (`/notices`)
**Features:**
- **Notice Types**: Best team, best employee, and general notices
- **Priority System**: High, medium, low priority levels
- **Active/Inactive Status**: Control notice visibility
- **Date Range**: Set start and end dates for notices
- **Team Information**: Track team names and members
- **Employee Recognition**: Highlight best employees
- **Branch-specific**: Notices can be branch-specific
- **CRUD Operations**: Create, read, update, delete notices (main branch only)

**Notice Types:**
- **Best Team**: Recognize top-performing teams with member lists
- **Best Employee**: Highlight individual employee achievements
- **General**: Other company announcements and notices

**API Endpoints:**
- `GET /api/notices` - Fetch all notices with filtering (type, priority, isActive)
- `POST /api/notices` - Create new notice (main branch only) - **MISSING IMPLEMENTATION**
- `GET /api/notices/[id]` - Fetch specific notice by ID
- `PUT /api/notices/[id]` - Update notice (main branch only)
- `DELETE /api/notices/[id]` - Delete notice (main branch only)

**Authorization:**
- Only main branch users can create, update, or delete notices
- All users can view notices
- JWT token validation required for write operations

**Filtering Options:**
- `?type=best_team|best_employee|other` - Filter by notice type
- `?priority=low|medium|high` - Filter by priority level
- `?isActive=true|false` - Filter by active status

### 3.8 Invoice Report (`/invoice-report`)
**Features:**
- **Date Range Filtering**: Select start and end dates (defaults to last 6 months)
- **Branch Filtering**: Filter by specific branch or all branches (admin only)
- **Payment Method Filtering**: Filter by payment type (cash, credit, online, cheque)
- **Report Generation**: Generate comprehensive invoice reports
- **PDF Export**: Export reports as PDF for printing
- **Data Preview**: Table view of invoice data before export
- **Total Calculations**: Automatic total amount calculations
- **Detailed Information**: Invoice number, date, cashier, customer, payment method, amount

**Report Data:**
- Invoice number and date
- Order creation date
- Cashier name
- Customer information
- Payment method used
- Invoice amount
- Branch information

**API Endpoints:**
- `GET /api/reports/invoices` - Fetch invoice data with filters
- `POST /api/reports/invoices/pdf` - Generate PDF report

---

## 4. Create Order Feature

### 4.1 Order Creation Flow

#### Step 1: Branch Detection & Order ID Generation
```typescript
// API Endpoint: GET /api/orders/next-id
// Returns next order ID with branch prefix

interface NextOrderResponse {
  success: boolean;
  branchName: string;
  nextOrderId: string;
  branchPrefix: string;
  nextOrderNumber: number;
  lastOrderId: string;
}

// Order ID Format: {BRANCH_PREFIX}-{YYYY}-{NUMBER}
// Example: "COL-2024-001", "KAN-2024-015"
```

#### Step 2: Customer Information
- **Required Fields**:
  - Customer Name (string)
  - WhatsApp Number (string)
  - Category (dropdown with search)
  - Description (textarea)
  - Expected Completion Date (date picker)
- **Optional Fields**:
  - Customer Email (string)

#### Step 3: Payment Details
- **Total Payment** (decimal, optional)
- **Advance Payment** (decimal, optional)
- **Validation**: Advance payment cannot exceed total payment

#### Step 4: Image Upload
- **Integration**: UploadThing
- **Endpoint**: "imageUploader"
- **Multiple files**: Yes
- **Preview**: Grid layout with remove option

#### Step 5: Options
- **Send to Workshop**: Toggle for main branch processing
- **Auto-assign Task**: Default true

### 4.2 Print Invoice Code

#### Invoice Revenue Display Logic
The invoice generation correctly displays the financial breakdown:

**Invoice Sections:**
1. **SUB TOTAL**: Shows the full order amount (e.g., Rs 25,000)
2. **ADVANCED PAY**: Shows advance payment if > 0 (e.g., Rs 5,000)
3. **Settlement**: Shows remaining balance (e.g., Rs 20,000)

**Revenue Impact:**
- When order is created with advance payment → **All Revenue** increases by advance amount
- When task is completed → **Completed Revenue** increases by remaining amount
- Invoice shows complete financial picture for customer

#### Complete HTML Template
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Solid Graphic Invoice</title>
    <style>
        /* Print and display styles */
        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            font-size: 15px;
            line-height: 1.2;
        }
        
        @media print {
            body { 
                background-color: white !important;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            .no-print {
                display: none !important;
            }
        }
        
        .header {
            text-align: center;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .logo {
            display: flex;
            align-items: center;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .logo-img {
            width: 35px;
            height: 35px;
            margin-right: 10px;
            object-fit: contain;
        }
        
        .contact-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 13px;
            line-height: 1.2;
        }
        
        .current-branch-section {
            flex: 1;
            padding: 0 5px;
            text-align: center;
        }
        
        .current-branch-section h4 {
            margin: 0 0 3px 0;
            font-size: 14px;
            text-decoration: underline;
            font-weight: bold;
        }
        
        .customer-invoice-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 15px;
        }
        
        .info-line {
            margin: 3px 0;
            display: flex;
            align-items: center;
        }
        
        .info-line label {
            font-weight: bold;
            margin-right: 8px;
            min-width: 80px;
            font-size: 14px;
        }
        
        .filled-info {
            flex: 1;
            border-bottom: 1px solid #333;
            padding: 1px 3px;
            min-height: 14px;
            font-size: 14px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        
        .items-table th {
            background-color: #f0f0f0;
            border: 1px solid #333;
            padding: 5px;
            text-align: center;
            font-weight: bold;
            font-size: 14px;
        }
        
        .items-table td {
            border: none;
            padding: 5px;
            vertical-align: middle;
            text-align: center;
        }
        
        .data-row {
            height: 30px;
        }
        
        .column-space {
            width: 20%;
            position: relative;
            padding: 3px;
            color: #666;
            letter-spacing: 0.5px;
            font-size: 13px;
        }
        
        .column-space:nth-child(1) { 
            width: 25%; 
            text-align: left;
        }
        .column-space:nth-child(2) { width: 20%; }
        .column-space:nth-child(3) { width: 15%; }
        .column-space:nth-child(4) { width: 20%; }
        .column-space:nth-child(5) { width: 20%; }
        
        .footer-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
        }
        
        .total-section {
            width: 200px;
            text-align: right;
            font-size: 14px;
        }
        
        .total-line {
            margin: 3px 0;
            display: flex;
            justify-content: space-between;
            font-weight: bold;
        }
        
        .total-line:last-child {
            border-top: 2px solid #333;
            border-bottom: 2px solid #333;
        }
        
        .thank-you {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin: 15px 0;
        }
        
        .services-list {
            border: 1px solid #333;
            padding: 8px;
            font-size: 12px;
            line-height: 1.2;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <div class="header">
            <div class="logo">
                <img src="/logo.jpg" alt="Solid Graphic Logo" class="logo-img" onerror="this.style.display='none'" />
                Solid Graphic (Pvt) Ltd
            </div>
        </div>

        <!-- Contact Information -->
        <div class="contact-info">
            <div class="contact-section">
                <div>
                    <h4>Head Office & Work shop</h4>
                    No. 89, Ranna East, Ranna.<br>
                    Tel. 070 2222 00 2/3/4/9
                </div>
            </div>
            
            <div class="current-branch-section">
                <h4>{{CURRENT_BRANCH_NAME}}</h4>
                <div class="branch-details">
                    {{BRANCH_LOCATION}}<br>
                    {{BRANCH_CONTACT}}
                </div>
            </div>
            
            <div class="other-branches-section">
                <h4>Other Branches</h4>
                <div class="other-branches-list">
                    {{OTHER_BRANCHES_LIST}}
                </div>
            </div>
        </div>

        <!-- Customer and Invoice Information -->
        <div class="customer-invoice-info">
            <div class="customer-info">
                <div class="info-line">
                    <label>Cus. Name</label>
                    <span>-</span>
                    <div class="filled-info">{{CUSTOMER_NAME}}</div>
                </div>
                <div class="info-line">
                    <label>Staff</label>
                    <span>-</span>
                    <div class="filled-info"></div>
                </div>
                <div class="info-line">
                    <label>Cus. Number</label>
                    <span>-</span>
                    <div class="filled-info">{{CUSTOMER_WHATSAPP}}</div>
                </div>
            </div>
            <div class="invoice-info">
                <div class="info-line">
                    <label>Invoice No</label>
                    <span>-</span>
                    <div class="filled-info">{{ORDER_ID}}</div>
                </div>
                <div class="info-line">
                    <label>Invoice Date</label>
                    <span>-</span>
                    <div class="filled-info">{{INVOICE_DATE}}</div>
                </div>
                <div class="info-line">
                    <label>Invoice Time</label>
                    <span>-</span>
                    <div class="filled-info">{{INVOICE_TIME}}</div>
                </div>
            </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th>ITEM NAME</th>
                    <th>Len / Wid</th>
                    <th>AMOUNT</th>
                </tr>
            </thead>
            <tbody>
                <tr class="data-row">
                    <td class="column-space">{{CATEGORY}}</td>
                    <td class="column-space">.......................</td>
                    <td class="column-space">{{TOTAL_PRICE}}</td>
                </tr>
                <tr class="data-row">
                    <td class="column-space">.............................</td>
                    <td class="column-space">.......................</td>
                    <td class="column-space">.......................</td>
                </tr>
                <tr class="data-row">
                    <td class="column-space">.............................</td>
                    <td class="column-space">.......................</td>
                    <td class="column-space">.......................</td>
                </tr>
            </tbody>
        </table>

        <!-- Footer Section -->
        <div class="footer-section">
            <div class="total-section" style="margin-left: auto;">
                <div class="total-line">
                    <span>SUB TOTAL</span>
                    <span>: <span style="border-bottom: 1px dotted #333; width: 100px; display: inline-block; height: 16px;">{{TOTAL_PRICE}}</span></span>
                </div>
                {{#if ADVANCE_PAYMENT}}
                <div class="total-line">
                    <span>ADVANCED PAY</span>
                    <span>: <span style="border-bottom: 1px dotted #333; width: 100px; display: inline-block; height: 16px;">{{ADVANCE_PAYMENT}}</span></span>
                </div>
                {{/if}}
                <div class="total-line">
                    <span>Settlement</span>
                    <span>: <span style="border-bottom: 1px dotted #333; width: 100px; display: inline-block; height: 16px;">{{BALANCE_DUE}}</span></span>
                </div>
            </div>
        </div>

        <!-- Thank You Message -->
        <div class="thank-you">
            Thank You... Come Again...
        </div>

        <!-- Services List -->
        <div class="services-list">
            Digital Printing, Screen Printing, Ceramic (Mug/ Plate)/ Stone/ Tile Printing, Flash Stamping, Polythene Printing, Laser Engraving, Outdoor and Indoor Advertising, Structural Designs & Drawings, Architectural Tasks, Civil Tasks, Construction Estimation / BOQ, Plumbing & Electrical Layouts, Road Design, Planning & Construction Approvals, Land Design, Fire System Designs, Commercial Building & Apartment Planning, Building Permits, Site Supervision, Quantity Surveying, Interior Designing, Mechanical Services, Landscaping, Road Designs, Plumbing Designs, Coordination Services with Client
        </div>
    </div>

    <button onclick="window.print()" class="no-print" style="margin-top: 15px; padding: 8px 16px; background-color: #4a90e2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
        Print Invoice
    </button>
</body>
</html>
```

#### Print Function Implementation
```typescript
function printInvoice(order: any, branchInfo: any, allBranches: any[]) {
  const invoiceHTML = generateOrderInvoiceHTML(order, branchInfo, allBranches);
  const printWindow = window.open(
    "",
    "_blank",
    "popup,width=800,height=600,toolbar=0,scrollbars=0,status=0"
  );

  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();

    printWindow.onload = function () {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        
        // Monitor window status
        const checkClosedTimer = setInterval(() => {
          if (printWindow.closed) {
            clearInterval(checkClosedTimer);
          } else {
            try {
              const test = printWindow.document;
            } catch (e) {
              printWindow.close();
              clearInterval(checkClosedTimer);
            }
          }
        }, 1000);
      }, 500);
    };
  } else {
    alert("Please allow popups for printing invoices.");
  }
}

function generateOrderInvoiceHTML(order: any, branchInfo: any, allBranches: any[]) {
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const formattedTime = currentDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Template variables
  const templateVars = {
    CURRENT_BRANCH_NAME: branchInfo?.branchName || "Branch",
    BRANCH_LOCATION: branchInfo?.location || "Branch Location",
    BRANCH_CONTACT: branchInfo?.contact?.join(', ') || "Contact Information",
    OTHER_BRANCHES_LIST: allBranches
      .filter(branch => branch.name !== branchInfo?.branchName && branch.name.toLowerCase() !== 'sales')
      .map(branch => `<div class="other-branch-item"><strong>${branch.name}</strong></div>`)
      .join(''),
    CUSTOMER_NAME: order.customerName || "Customer",
    CUSTOMER_WHATSAPP: order.whatsappNumber || "",
    ORDER_ID: order.orderId,
    INVOICE_DATE: formattedDate,
    INVOICE_TIME: formattedTime,
    CATEGORY: order.category,
    TOTAL_PRICE: order.totalPrice ? `Rs ${parseFloat(order.totalPrice).toFixed(2)}` : 'Rs 0.00',
    ADVANCE_PAYMENT: order.advancePayment > 0 ? `Rs ${parseFloat(order.advancePayment).toFixed(2)}` : '',
    BALANCE_DUE: order.totalPrice ? `Rs ${(parseFloat(order.totalPrice) - parseFloat(order.advancePayment || 0)).toFixed(2)}` : 'Rs 0.00'
  };

  // Replace template variables in HTML
  let html = invoiceTemplate;
  Object.entries(templateVars).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, value);
  });

  return html;
}
```

---

## 5. View Tasks (Task Management)

### 5.1 Task Status Workflow

#### Pending Tasks
- **Status**: "Pending"
- **Description**: Initial state after order creation
- **Actions Available**:
  - Assign to employee
  - Move to "In Progress"
  - View order details
  - Edit task description

#### In Progress Tasks
- **Status**: "In Progress"
- **Description**: Task is being worked on by assigned employee
- **Actions Available**:
  - Add products (using product scanner)
  - Upload artwork
  - Update description
  - Move to payment stage
  - Send to main branch
  - Complete task

#### Completed Tasks
- **Status**: "Completed"
- **Description**: Task finished, ready for payment
- **Actions Available**:
  - Process payment
  - Create invoice
  - Move to "Temporary Completed" (if cheque payment)

#### Temporary Completed Tasks
- **Status**: "Temporary Completed"
- **Description**: Cheque payment pending clearance
- **Actions Available**:
  - Update cheque status (cleared/returned)
  - Add cheque notes
  - Move back to "Completed" or "Returned"

#### Returned Tasks
- **Status**: "Returned"
- **Description**: Cheque bounced or payment failed
- **Actions Available**:
  - Retry payment
  - Update payment method
  - Add return notes

### 5.2 Task Management Features

#### Product Management
- **Product Scanner**: Barcode/QR code scanning for inventory
- **Manual Product Addition**: Add products manually with quantity and price
- **Product Types**: Mug, Plate, T-shirt, Banner, etc.
- **Waste Tracking**: Track material waste per product

#### Payment Processing
- **Payment Methods**:
  - Cash
  - Cheque (with status tracking)
  - Online Payment (with transaction ID)
  - Credit (using customer credit balance)
- **Payment History**: Track all payment attempts and methods
- **Invoice Generation**: Create printable invoices

#### Employee Assignment
- **Employee Selection**: Dropdown of available employees
- **Skill Matching**: Match employees based on required skills
- **Workload Balancing**: Distribute tasks evenly

---

## 6. API Endpoints

### 6.1 Authentication APIs

#### Login
```typescript
// POST /api/auth/login
interface LoginRequest {
  username: string;
  password: string;
  branch: string;
}

interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    username: string;
    branch: string;
    branchName: string;
    branchType: string;
    branchLocation: string;
  };
}
```

#### Logout
```typescript
// POST /api/auth/logout
// Clears authentication token
```

#### Verify Token
```typescript
// GET /api/auth/verify
interface VerifyResponse {
  success: boolean;
  user: {
    id: string;
    username: string;
    branch: string;
    branchName: string;
    branchType: string;
    branchLocation: string;
  };
}
```

### 6.2 Order APIs

#### Create Order
```typescript
// POST /api/orders
interface CreateOrderRequest {
  customerName: string;
  customerEmail?: string;
  whatsappNumber: string;
  category: string;
  description: string;
  images: string[];
  sendToMainBranch: boolean;
  orderDate: string;
  expectedEndDate: string;
  orderItems: any[];
  totalPrice: number;
  fullPayment: number;
  advancePayment: number;
  assignTask: boolean;
  sentToMainBranch: boolean;
}

interface CreateOrderResponse {
  success: boolean;
  order: Order;
  generatedOrderId: string;
}
```

#### Get Next Order ID
```typescript
// GET /api/orders/next-id
interface NextOrderIdResponse {
  success: boolean;
  branchName: string;
  nextOrderId: string;
  branchPrefix: string;
  nextOrderNumber: number;
  lastOrderId: string;
}
```

### 6.3 Task APIs

#### Get Tasks
```typescript
// GET /api/tasks
interface GetTasksResponse {
  success: boolean;
  tasks: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

#### Assign Task
```typescript
// POST /api/tasks/assign
interface AssignTaskRequest {
  taskId: string;
  employeeId: string;
}

interface AssignTaskResponse {
  success: boolean;
  task: Task;
}
```

#### Complete Task
```typescript
// POST /api/tasks/complete
interface CompleteTaskRequest {
  taskId: string;
  endTime: string;
  products: ProductItem[];
  totalPrice: number;
  paymentMethod: string;
  notes?: string;
}

interface CompleteTaskResponse {
  success: boolean;
  task: Task;
}
```

#### Update Task Status
```typescript
// PUT /api/tasks/status
interface UpdateStatusRequest {
  taskId: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Temporary Completed' | 'Returned';
  notes?: string;
}

interface UpdateStatusResponse {
  success: boolean;
  task: Task;
}
```

### 6.4 Metrics APIs

#### Get Dashboard Metrics
```typescript
// GET /api/metrics
interface MetricsResponse {
  allRevenue: number;
  completedOrdersRevenue: number;
  totalOrders: number;
  newCustomers: number;
  growthRate: string;
  totalWaste: number;
  userBranch: string;
  branchName: string;
  branchType: string;
  branchLocation: string;
  debugInfo: any;
}
```

#### Get Sales Data
```typescript
// GET /api/sales
interface SalesResponse {
  salesData: Array<{
    day: string;
    allRevenue: number;
    completedRevenue: number;
  }>;
  branchName: string;
  userBranch: string;
  debugInfo: {
    ordersSalesData: number;
    tasksSalesData: number;
    totalDays: number;
  };
}
```

### 6.5 Branch APIs

#### Get Branches
```typescript
// GET /api/branches
interface BranchesResponse {
  success: boolean;
  branches: Array<{
    id: string;
    name: string;
    type: 'main' | 'sub';
    location: string;
    contact: string[];
    allowedProducts: string[];
    isActive: boolean;
  }>;
}
```

### 6.6 Employee APIs

#### Get Employees
```typescript
// GET /api/employees/main
interface EmployeesResponse {
  success: boolean;
  employees: Array<{
    id: string;
    name: string;
    position: string;
    branch: string;
    salary: number;
    skills: string[];
    isAvailable: boolean;
    joinDate: string;
  }>;
}
```

### 6.7 Inventory APIs

#### Get Inventory
```typescript
// GET /api/inventory
interface InventoryResponse {
  inventory: Array<{
    _id: string;
    name: string;
    branch: string;
    quantity: number;
    status: string;
    image: string;
    productCode: string;
    price: number;
    productId: string;
  }>;
}
```

#### Add/Update Inventory Item
```typescript
// POST /api/inventory
interface AddInventoryRequest {
  name: string;
  quantity: string;
  image?: string;
  productCode: string;
  price: string;
}

interface AddInventoryResponse {
  _id: string;
  name: string;
  branch: string;
  quantity: number;
  status: string;
  image: string;
  productCode: string;
  price: number;
  productId: string;
}
```

#### Search Inventory
```typescript
// GET /api/inventory/search?query={searchTerm}
interface SearchInventoryResponse {
  results: Array<{
    _id: string;
    name: string;
    branch: string;
    quantity: number;
    status: string;
    image: string;
    productCode: string;
    price: number;
    productId: string;
  }>;
}
```

#### Update Inventory Quantity (MISSING IMPLEMENTATION)
```typescript
// PATCH /api/inventory/[id] - MISSING ENDPOINT
interface UpdateQuantityRequest {
  quantity: number;
}

interface UpdateQuantityResponse {
  success: boolean;
  message?: string;
  error?: string;
}
```

**Features:**
- **Authentication Required**: JWT token with branch information
- **Branch Filtering**: Automatically filters by user's branch
- **Duplicate Handling**: Updates existing items with same product code
- **Search Functionality**: Search by name or product code
- **Image Integration**: UploadThing integration for product images
- **Status Management**: Automatic status updates based on quantity

### 6.8 Product List APIs

#### Get Selected Items
```typescript
// GET /api/inventory/all?search={term}&userId={id}&sessionId={id}
interface SelectedItemsResponse {
  success: boolean;
  items: Array<{
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
    image?: string | null;
    inventoryStatus?: string;
  }>;
}
```

**Features:**
- **Search Functionality**: Search by name, SKU, or category
- **User/Session Filtering**: Filter by specific user or session
- **Image Integration**: Includes product images from inventory
- **Status Tracking**: Shows inventory status and selection status
- **Performance**: Optimized with population of inventory data

### 6.9 Completed Orders APIs

#### Get Completed Orders
```typescript
// GET /api/completed-orders
interface CompletedOrdersResponse {
  success: boolean;
  completedOrders: Array<{
    _id: string;
    orderId: string;
    productType: string;
    priority: string;
    status: string;
    branch: string;
    description?: string;
    startTime: string;
    endTime?: string;
    totalCost: number;
    advancePayment?: number;
    fullPayment?: number;
    balanceDue: number;
    customerName?: string;
    customerEmail?: string;
    whatsappNumber?: string;
    category?: string;
    orderDescription?: string;
    orderDate?: string;
    images?: string[];
    orderImages?: string[];
    taskImages?: string[];
    artworkImage?: string;
  }>;
  timestamp: string;
  totalCount: number;
}
```

**Features:**
- **Authentication Required**: JWT token with branch information
- **Branch Filtering**: Automatically filters by user's branch
- **Data Aggregation**: Combines Task and Order data
- **Image Management**: Handles multiple image types (order, task, artwork)
- **Performance**: Limited to 50 most recent orders
- **Error Handling**: Comprehensive error responses

### 6.11 Notice APIs

#### Get Notices
```typescript
// GET /api/notices?type={type}&priority={priority}&isActive={boolean}
interface NoticesResponse {
  success: boolean;
  notices: Array<{
    id: string;
    type: 'best_team' | 'best_employee' | 'other';
    title: string;
    description: string;
    teamName?: string;
    teamMembers?: string[];
    employeeName?: string;
    isActive: boolean;
    priority: 'low' | 'medium' | 'high';
    startDate: string;
    endDate?: string;
    createdBy: string;
  }>;
  count: number;
}
```

#### Create Notice (MISSING IMPLEMENTATION)
```typescript
// POST /api/notices - Main branch only
interface CreateNoticeRequest {
  type: 'best_team' | 'best_employee' | 'other';
  title: string;
  description: string;
  teamName?: string;
  teamMembers?: string[];
  employeeName?: string;
  priority: 'low' | 'medium' | 'high';
  startDate: string; // ISO date string
  endDate?: string; // ISO date string
  createdBy: string;
}

interface CreateNoticeResponse {
  success: boolean;
  notice?: Notice;
  error?: string;
}
```

#### Update Notice
```typescript
// PUT /api/notices/[id] - Main branch only
interface UpdateNoticeRequest extends CreateNoticeRequest {
  isActive?: boolean;
}

interface UpdateNoticeResponse {
  success: boolean;
  notice?: Notice;
  message?: string;
  error?: string;
}
```

#### Delete Notice
```typescript
// DELETE /api/notices/[id] - Main branch only
interface DeleteNoticeResponse {
  success: boolean;
  message?: string;
  error?: string;
}
```

#### Get Single Notice
```typescript
// GET /api/notices/[id]
interface SingleNoticeResponse {
  success: boolean;
  notice?: Notice;
  error?: string;
}
```

### 6.12 Credits APIs

#### Get Customer Credits
```typescript
// GET /api/credits
interface CreditsResponse {
  success: boolean;
  customers: Array<{
    whatsappNumber: string;
    customerName: string;
    customerEmail: string;
    balance: number;
    usedAmount: number;
  }>;
}
```

#### Add Customer Credit
```typescript
// POST /api/credits
interface AddCreditRequest {
  whatsappNumber: string; // Required
  customerName: string; // Required
  customerEmail?: string; // Optional
  amount: number; // Required, must be positive
}

interface AddCreditResponse {
  success: boolean;
  message?: string; // e.g., "Credit of ₹5000.00 added successfully"
  customer?: {
    whatsappNumber: string;
    customerName: string;
    customerEmail: string;
    balance: number;
    usedAmount: number;
  };
  error?: string;
}
```

**Credit Management Logic:**
- If customer exists: Adds amount to existing balance
- If customer doesn't exist: Creates new customer with specified credit
- Validation: Requires positive amount, whatsappNumber, and customerName
- Response includes updated customer information

### 6.13 Report APIs

#### Generate Invoice Report
```typescript
// GET /api/reports/invoices
interface InvoiceReportResponse {
  success: boolean;
  invoices: Array<{
    orderId: string;
    customerName: string;
    totalAmount: number;
    paidAmount: number;
    balanceDue: number;
    status: string;
    createdAt: string;
  }>;
}
```

---

## 7. Reusable Components & Code

### 7.1 Order ID Generator

```typescript
// utils/orderIdGenerator.ts
interface BranchOrderStatus {
  nextOrderId: string;
  branchPrefix: string;
  nextOrderNumber: number;
  lastOrderId: string;
  lastOrderNumber: number;
}

export async function getBranchOrderStatus(branchName: string): Promise<BranchOrderStatus> {
  // Get or create order counter for branch
  let counter = await OrderCounterModel.findOne({ branchName });
  
  if (!counter) {
    // Create new counter with branch prefix
    const branchPrefix = getBranchPrefix(branchName);
    counter = new OrderCounterModel({
      branchName,
      lastOrderNumber: 0,
      branchPrefix
    });
    await counter.save();
  }

  // Generate next order number
  const nextOrderNumber = counter.lastOrderNumber + 1;
  const currentYear = new Date().getFullYear();
  const nextOrderId = `${counter.branchPrefix}-${currentYear}-${nextOrderNumber.toString().padStart(3, '0')}`;

  // Update counter
  counter.lastOrderNumber = nextOrderNumber;
  counter.lastOrderId = nextOrderId;
  await counter.save();

  return {
    nextOrderId,
    branchPrefix: counter.branchPrefix,
    nextOrderNumber,
    lastOrderId: counter.lastOrderId,
    lastOrderNumber: counter.lastOrderNumber
  };
}

function getBranchPrefix(branchName: string): string {
  const prefixMap: { [key: string]: string } = {
    'Colombo': 'COL',
    'Kandy': 'KAN',
    'Galle': 'GAL',
    'Jaffna': 'JAF',
    'Anuradhapura': 'ANU',
    'Ratnapura': 'RAT',
    'Kurunegala': 'KUR',
    'Negombo': 'NEG',
    'Batticaloa': 'BAT',
    'Trincomalee': 'TRI'
  };
  
  return prefixMap[branchName] || 'BRN'; // Default to BRN if not found
}
```

### 7.2 Authentication Context

```typescript
// contexts/AuthContext.tsx
interface User {
  id: string;
  username: string;
  branch: string;
  branchName: string;
  branchType: string;
  branchLocation: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, branch: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (username: string, password: string, branch: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, branch })
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    fetch('/api/auth/logout', { method: 'POST' });
  };

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await fetch('/api/auth/verify');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Token verification failed:', error);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 7.3 Image Upload Integration

```typescript
// utils/uploadthing.ts
import { generateComponents } from "@uploadthing/react";
import type { OurFileRouter } from "./file-router";

export const { UploadButton, UploadDropzone, Uploader } =
  generateComponents<OurFileRouter>();

// file-router.ts
import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 10 } })
    .middleware(async ({ req }) => {
      // Authentication check
      return { userId: "user-id" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
```

---

## 8. Business Logic & Calculations

### 8.1 Revenue Calculations

#### All Revenue
```sql
-- Calculate total revenue from orders (advance payments only)
-- This represents money received upfront when orders are created
SELECT 
  COALESCE(SUM(
    CASE 
      WHEN advance_payment IS NOT NULL AND advance_payment > 0 
      THEN advance_payment 
      ELSE total_price 
    END
  ), 0) as all_revenue
FROM orders 
WHERE order_date >= NOW() - INTERVAL '30 days'
  AND branch_id = $1;
```

#### Completed Orders Revenue
```sql
-- Calculate revenue from completed tasks (remaining amount after advance payment)
-- This represents money earned when tasks are completed
SELECT 
  COALESCE(SUM(
    CASE 
      WHEN t.total_price IS NOT NULL 
      THEN t.total_price - COALESCE(o.advance_payment, 0)
      ELSE (t.product_price * t.product_quantity) - COALESCE(o.advance_payment, 0)
    END
  ), 0) as completed_revenue
FROM tasks t
LEFT JOIN orders o ON t.order_id = o.order_id
WHERE t.start_time >= NOW() - INTERVAL '30 days'
  AND t.status = 'Completed'
  AND t.branch_id = $1;
```

#### Revenue Calculation Examples

**Example 1: Order with Advance Payment**
- Order Total: Rs 25,000
- Advance Payment: Rs 5,000
- **All Revenue**: Rs 5,000 (advance payment received today)
- **Completed Revenue**: Rs 20,000 (remaining amount when task completes)

**Example 2: Order without Advance Payment**
- Order Total: Rs 15,000
- Advance Payment: Rs 0
- **All Revenue**: Rs 15,000 (full amount counted as revenue today)
- **Completed Revenue**: Rs 15,000 (full amount when task completes)

**Example 3: Multiple Orders Today**
- Order A: Rs 30,000 total, Rs 10,000 advance
- Order B: Rs 20,000 total, Rs 0 advance
- Order C: Rs 15,000 total, Rs 5,000 advance
- **All Revenue**: Rs 45,000 (10,000 + 20,000 + 5,000)
- **Completed Revenue**: Depends on which tasks are completed

#### Detailed Invoice Generator Example

**Scenario**: Customer brings Rs 25,000 product today with Rs 5,000 advance payment

**Invoice Display:**
```
SUB TOTAL: Rs 25,000.00
ADVANCED PAY: Rs 5,000.00
Settlement: Rs 20,000.00
```

**Revenue Impact:**
- **All Revenue Card**: +Rs 5,000 (advance payment received today)
- **Completed Revenue Card**: +Rs 20,000 (when task is completed)
- **Total Orders Card**: +1 (new order created)

**Dashboard Updates:**
- All Revenue increases by Rs 5,000 immediately
- Completed Revenue increases by Rs 20,000 when task status changes to "Completed"
- Total Orders count increases by 1
- New Customers count increases by 1 (if new customer)

### 8.2 Growth Rate Calculation

```sql
-- Calculate growth rate (current 30 days vs previous 30 days)
WITH current_period AS (
  SELECT COUNT(*) as current_orders
  FROM orders 
  WHERE order_date >= NOW() - INTERVAL '30 days'
    AND branch_id = $1
),
previous_period AS (
  SELECT COUNT(*) as previous_orders
  FROM orders 
  WHERE order_date >= NOW() - INTERVAL '60 days' 
    AND order_date < NOW() - INTERVAL '30 days'
    AND branch_id = $1
)
SELECT 
  CASE 
    WHEN p.previous_orders > 0 
    THEN ROUND(((c.current_orders - p.previous_orders)::DECIMAL / p.previous_orders * 100)::NUMERIC, 1)
    ELSE NULL
  END as growth_rate
FROM current_period c, previous_period p;
```

### 8.3 Waste Tracking

```sql
-- Calculate total waste from completed tasks
SELECT COALESCE(SUM(total_waste), 0) as total_waste
FROM tasks 
WHERE start_time >= NOW() - INTERVAL '30 days'
  AND status = 'Completed'
  AND branch_id = $1;
```

### 8.4 Complete Data Features Verification

#### Revenue Tracking System
✅ **All Revenue Card**
- Tracks money received when orders are created
- Includes advance payments and full payments
- Updates immediately when order is placed
- Example: Rs 25,000 order with Rs 5,000 advance = Rs 5,000 revenue

✅ **Completed Orders Revenue Card**
- Tracks money earned when tasks are completed
- Calculates remaining amount after advance payment
- Updates when task status changes to "Completed"
- Example: Rs 25,000 order with Rs 5,000 advance = Rs 20,000 completed revenue

#### Order Management System
✅ **Order Creation**
- Automatic order ID generation with branch prefix
- Branch detection from user authentication
- Advance payment and total price tracking
- Image upload and product management

✅ **Task Lifecycle**
- Pending → In Progress → Completed workflow
- Product addition and artwork management
- Payment processing and status updates
- Return handling for bounced cheques

#### Financial Calculations
✅ **Invoice Generation**
- Complete financial breakdown display
- Advance payment and settlement amounts
- Professional invoice formatting
- Print-ready HTML generation

✅ **Payment Processing**
- Multiple payment methods (cash, card, cheque, online)
- Immediate vs temporary completion logic
- Payment history tracking
- Credit system integration

#### Inventory Management
✅ **Stock Tracking**
- Real-time quantity updates
- Stock status indicators (In Stock/Out of Stock)
- Branch-specific inventory filtering
- Image management for products

#### Reporting System
✅ **Dashboard Metrics**
- Real-time revenue calculations
- Growth rate comparisons
- Customer and order statistics
- Waste tracking from completed tasks

✅ **Invoice Reports**
- Date range filtering
- Branch-specific reports
- Payment method filtering
- PDF export functionality

#### Branch Management
✅ **Multi-branch Support**
- Branch-specific data isolation
- Order routing between branches
- Branch-specific user access
- Centralized vs distributed operations

#### Customer Management
✅ **Credit System**
- Customer credit balance tracking
- Credit adjustment capabilities
- Payment history monitoring
- Customer search and pagination

#### Notice System
✅ **Communication**
- Best team and employee recognition
- Priority-based notice system
- Branch-specific announcements
- Date range management

#### Data Integrity
✅ **Database Relationships**
- Proper foreign key constraints
- Data consistency across tables
- Transaction handling
- Error management

✅ **Authentication & Security**
- JWT token-based authentication
- Branch-specific data access
- User role management
- Session management

---

## 9. Migration Notes

### 9.1 Database Migration

#### MongoDB to Supabase Conversion
- **ObjectId → UUID**: All MongoDB ObjectIds converted to UUIDs
- **Embedded Documents → JSONB**: Complex nested objects stored as JSONB
- **Arrays → PostgreSQL Arrays**: String arrays maintained as TEXT[]
- **Timestamps**: MongoDB timestamps converted to TIMESTAMP WITH TIME ZONE

#### Key Changes
1. **Primary Keys**: All tables use UUID with `gen_random_uuid()`
2. **Foreign Keys**: Proper foreign key relationships established
3. **Indexes**: Optimized for Supabase/PostgreSQL
4. **RLS Policies**: Row Level Security for multi-tenant architecture
5. **Triggers**: Automatic timestamp updates using `updated_at` triggers

### 9.2 Authentication Migration

#### JWT Token Structure
```typescript
interface JWTPayload {
  userId: string;
  username: string;
  branch: string;
  branchName: string;
  branchType: string;
  branchLocation: string;
  iat: number;
  exp: number;
}
```

#### Supabase Auth Integration
- Use Supabase Auth for user management
- Custom JWT claims for branch information
- RLS policies based on user branch

### 9.3 File Storage

#### UploadThing Integration
- Maintain existing UploadThing integration
- No changes required for image upload functionality
- Same API endpoints and configuration

### 9.4 API Migration

#### Endpoint Changes
- All API endpoints remain the same
- Database queries converted from MongoDB to SQL
- Response formats unchanged for backward compatibility

#### Missing Endpoint Implementation
**CRITICAL**: The following endpoints are missing and need to be implemented:

**PATCH /api/inventory/[id]** - Update Inventory Quantity Endpoint
```typescript
// app/api/inventory/[id]/route.ts - Missing PATCH function
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const branchId = (decoded as any).branch;
    const branchRecord = await BranchModel.findById(branchId);
    if (!branchRecord) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
    
    const body = await request.json();
    const { quantity } = body;
    
    const updatedItem = await InventoryItemModel.findByIdAndUpdate(
      params.id,
      { 
        quantity: parseInt(quantity),
        status: parseInt(quantity) > 0 ? "In Stock" : "Out of Stock"
      },
      { new: true }
    );
    
    if (!updatedItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: "Quantity updated successfully",
      item: updatedItem
    });
  } catch (error) {
    console.error("Error updating inventory quantity:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update quantity" },
      { status: 500 }
    );
  }
}
```

**POST /api/notices** - Create Notice Endpoint
```typescript
// app/api/notices/route.ts - Missing POST function
export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!isMainBranchUser(user)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }
  
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const {
      type, title, description, teamName, teamMembers,
      employeeName, priority, startDate, endDate, createdBy
    } = body;
    
    const newNotice = new NoticeModel({
      type, title, description, teamName,
      teamMembers: teamMembers || [],
      employeeName, priority, isActive: true,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      createdBy
    });
    
    await newNotice.save();
    
    return NextResponse.json({
      success: true,
      notice: newNotice,
      message: "Notice created successfully"
    });
  } catch (error) {
    console.error("Error creating notice:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create notice" },
      { status: 500 }
    );
  }
}
```

#### Error Handling
- Maintain existing error response formats
- Add Supabase-specific error handling
- Database connection error handling

---

## 10. Implementation Checklist

### 10.1 Database Setup
- [ ] Create all tables with proper relationships
- [ ] Set up RLS policies
- [ ] Create indexes for performance
- [ ] Set up triggers for timestamps
- [ ] Migrate existing data (if applicable)

### 10.2 Authentication
- [ ] Set up Supabase Auth
- [ ] Configure JWT tokens with branch info
- [ ] Implement RLS policies
- [ ] Test authentication flow

### 10.3 API Implementation
- [ ] Convert all MongoDB queries to SQL
- [ ] Implement all API endpoints
- [ ] **CRITICAL**: Implement missing POST /api/notices endpoint
- [ ] **CRITICAL**: Implement missing PATCH /api/inventory/[id] endpoint
- [ ] Add proper error handling
- [ ] Test all endpoints
- [ ] Verify notice creation functionality
- [ ] Verify inventory quantity update functionality

### 10.4 Frontend Integration
- [ ] Update API calls (if needed)
- [ ] Test all features
- [ ] Verify print functionality
- [ ] Test image uploads

### 10.5 Testing
- [ ] Unit tests for business logic
- [ ] Integration tests for APIs
- [ ] End-to-end tests for workflows
- [ ] Performance testing

---

This comprehensive documentation provides everything needed to migrate the Offset Dashboard from MongoDB to Supabase while maintaining all existing functionality and adding modern features for the new dashboard design.
