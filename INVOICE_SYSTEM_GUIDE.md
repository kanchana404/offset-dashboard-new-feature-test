# Invoice System Implementation Guide

## Overview
This document describes the new invoice-based order management system that simplifies the workflow for quick orders while maintaining flexibility for complex production orders.

## System Architecture

### New Workflow

```
CREATE ORDER → INVOICED STATE → Two Paths:

Path A (Quick Orders):
INVOICED → Add Payment → PAID ✓

Path B (Complex Orders):
INVOICED → Assign Worker → IN_PROGRESS → COMPLETED → Add Payment → PAID ✓
```

### Key Changes

#### 1. **Database Models**

**New Payment Model** (`lib/database/models/Payment.ts`)
- Tracks individual payments for orders
- Supports multiple payment types: CASH, CARD, CHEQUE, ONLINE, UPI
- Links to orders via `orderId`
- Stores payment metadata (date, received by, notes, etc.)

**Updated Task Model** (`lib/database/models/Task.ts`)
- New status values: `INVOICED`, `IN_PROGRESS`, `COMPLETED`, `PAID`
- New payment tracking fields:
  - `totalAmount`: Total order amount
  - `paidAmount`: Amount paid so far
  - `balanceDue`: Remaining balance
- Auto-creates invoice when order is created (`invoiceCreated: true`)

#### 2. **API Routes**

**Payment API** (`/api/payments`)
- `GET`: Fetch all payments for an order
- `POST`: Add a new payment (supports partial payments)
- Automatically updates task status to `PAID` when balance reaches 0

**Invoice API** (`/api/invoices`)
- `GET`: Fetch all invoices with filtering (status, branch, search)
- `PATCH`: Update invoice/task status

**Assign Worker API** (`/api/invoices/assign-worker`)
- `POST`: Assign a task to a worker
- Changes status from `INVOICED` to `IN_PROGRESS`

#### 3. **User Interface**

**New Invoices Page** (`/app/invoices/page.tsx`)
Features:
- View all invoices in a table format
- Filter by status: All, Invoiced, Unpaid, In Progress, Completed, Paid
- Search by Order ID or Customer Name
- Quick actions per invoice:
  - **Pay**: Add full or partial payments
  - **Assign**: Assign to worker (moves to tasks)
  - **Print**: Print invoice

**Payment Dialog**
- Shows payment summary (Total, Paid, Balance)
- Displays payment history
- Add new payment with:
  - Amount (validates against balance)
  - Payment type selection
  - Notes and received by fields
- Auto-closes when fully paid

**Assign Worker Dialog**
- Select from available employees
- Assigns task and moves to IN_PROGRESS

**Updated Sidebar**
- Added "Invoices" link (between Create Order and View Tasks)

#### 4. **Modified Routes**

**Create Order** (`/api/orders/route.ts`)
- Orders now automatically create with `INVOICED` status
- Payment tracking fields initialized:
  - `totalAmount` = full payment amount
  - `paidAmount` = advance payment (if any)
  - `balanceDue` = total - advance
- Invoice data stored in task

**View Tasks** (`/api/tasks/route.ts` & `/api/tasks/main/route.ts`)
- Now only shows tasks with `IN_PROGRESS` status
- Filters out `INVOICED`, `COMPLETED`, and `PAID` tasks
- Maintains backward compatibility with legacy statuses

## Usage Guide

### For Quick Orders (Walk-in Customers)

1. **Create Order** (`/create-order`)
   - Fill in customer details
   - Add description and images
   - Set total amount and advance payment (if any)
   - Submit → Order created with INVOICED status

2. **Go to Invoices** (`/invoices`)
   - Find the newly created invoice
   - Click "Pay" button
   - Enter payment amount (full or partial)
   - Select payment type (Cash, Card, etc.)
   - Submit → Invoice marked as PAID

**Result**: Order completed in 2 steps without going through tasks!

### For Complex Orders (Production Work)

1. **Create Order** (`/create-order`)
   - Same as above

2. **Go to Invoices** (`/invoices`)
   - Find the invoice
   - Click "Assign" button
   - Select a worker
   - Submit → Task moves to IN_PROGRESS

3. **View Tasks** (`/tasks`)
   - Worker sees the task
   - Completes the work
   - Marks as complete → Status changes to COMPLETED

4. **Back to Invoices** (`/invoices`)
   - Find the completed order
   - Click "Pay" to collect payment
   - Invoice marked as PAID

### Partial Payments

The system supports multiple payments for a single order:

1. Customer pays advance when ordering
2. Customer pays partial amount during work
3. Customer pays final balance on completion

Each payment is tracked separately with full history.

## Status Flow

```
INVOICED (New order, invoice created)
   ↓
   ├─→ PAID (Quick path - direct payment)
   │
   └─→ IN_PROGRESS (Assigned to worker)
          ↓
       COMPLETED (Work finished)
          ↓
       PAID (Payment collected)
```

## Benefits

✅ **Faster for quick orders**: 2 steps instead of 6-7
✅ **Clear separation**: Invoices (payment) vs Tasks (production)
✅ **Flexible workflow**: Can handle both quick and complex orders
✅ **Payment tracking**: Full visibility of paid/unpaid amounts
✅ **Partial payments**: Accept multiple installments
✅ **Backward compatible**: Old tasks still work

## Migration Notes

### Existing Orders
- Old orders with "Pending", "In Progress", "Completed" statuses will continue to work
- They will appear in the tasks view as before
- New orders will use the new INVOICED → IN_PROGRESS → COMPLETED → PAID flow

### Database
- No migration needed - new fields have defaults
- Old tasks will show `balanceDue = 0` if not set
- Payment tracking starts fresh for new orders

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/invoices` | GET | Fetch invoices with filters |
| `/api/invoices` | PATCH | Update invoice status |
| `/api/invoices/assign-worker` | POST | Assign task to worker |
| `/api/payments` | GET | Get payments for order |
| `/api/payments` | POST | Add new payment |
| `/api/orders` | POST | Create order (auto-creates invoice) |
| `/api/tasks` | GET | Get IN_PROGRESS tasks only |

## Testing Checklist

### Quick Order Path
- [ ] Create order with customer details
- [ ] Verify order appears in Invoices with INVOICED status
- [ ] Add full payment
- [ ] Verify status changes to PAID
- [ ] Verify order disappears from Invoices (or moves to Paid filter)

### Complex Order Path
- [ ] Create order
- [ ] Assign to worker from Invoices
- [ ] Verify task appears in View Tasks with IN_PROGRESS status
- [ ] Complete task
- [ ] Verify status changes to COMPLETED
- [ ] Go to Invoices and add payment
- [ ] Verify status changes to PAID

### Partial Payments
- [ ] Create order with Rs 1000 total
- [ ] Add Rs 300 advance payment
- [ ] Verify balance shows Rs 700
- [ ] Add Rs 400 payment
- [ ] Verify balance shows Rs 300
- [ ] Add Rs 300 final payment
- [ ] Verify status changes to PAID

### Filtering & Search
- [ ] Filter by Unpaid - shows orders with balance > 0
- [ ] Filter by In Progress - shows assigned tasks
- [ ] Filter by Paid - shows fully paid orders
- [ ] Search by Order ID - finds specific order
- [ ] Search by Customer Name - finds orders

## Troubleshooting

### Issue: Orders not showing in Invoices
**Solution**: Check if order was created successfully. Verify `status` field is set to "INVOICED".

### Issue: Can't assign worker
**Solution**: Ensure employees are loaded. Check `/api/employees/branch` endpoint.

### Issue: Payment exceeds balance
**Solution**: System validates payment amount. Cannot pay more than balance due.

### Issue: Old tasks not showing
**Solution**: Old tasks with "Pending" status should still appear. Check task status in database.

## Future Enhancements

- [ ] Invoice PDF generation
- [ ] Email invoice to customer
- [ ] SMS notifications for payment reminders
- [ ] Payment receipt printing
- [ ] Analytics dashboard for payments
- [ ] Cheque tracking and clearance
- [ ] Online payment gateway integration

