# Fleet Ops Management System: Technical & Functional Specification

## 1. Project Overview
**Fleet Ops** is a management suite for transport operators (primarily bus and van services). It facilitates the end-to-end lifecycle of fleet operations, from vehicle procurement and maintenance to trip scheduling, passenger revenue collection (vouchers), and private hire contracts.

### Technical Stack
*   **Frontend:** React 19 (Hooks-based), TypeScript.
*   **Styling:** Tailwind CSS (Utility-first).
*   **Visualization:** Recharts (SVG-based charting).
*   **Data Layer:** Mock Service Layer with asynchronous `Promise`-based API simulations (`services/api.ts`).
*   **Architecture:** View-based SPA (Single Page Application) with a centralized sidebar navigation.

---

## 2. Core Data Models & Entities (Defined in `types.ts`)

### 2.1 Vehicle
Represents a physical asset in the fleet.
*   `type`: Bus, Van, Minibus, Coach.
*   `status`: Active, In Maintenance, Inactive.
*   `capacity`: Seating capacity for passenger logs.
*   `lastMaintenanceDate`: Tracks service intervals.

### 2.2 Trip
Represents a scheduled transport service.
*   `route`: An array of strings representing stops (e.g., `['Lahore', 'Sargodha', 'Islamabad']`).
*   `status`: Scheduled, En Route, Completed, Cancelled.
*   `voucher`: A financial sub-entity generated upon trip completion.

### 2.3 Financial Transaction
A unified ledger for all monetary movements.
*   **Voucher:** Generated from completed trips based on passenger counts per segment.
*   **Private Hire:** Contract-based revenue (Fixed Price or Per Day rate).
*   **Expense:** Operational costs (Fuel, Tolls, Repairs, etc.).

### 2.4 Maintenance Record
Detailed logs of vehicle servicing. Every maintenance record automatically triggers a corresponding **Expense Transaction** in the financial ledger.

---

## 3. Functional Modules

### 3.1 Dashboard (Operations Intelligence)
*   **KPI Tiles:** Real-time visibility into daily revenue, net profit, active trips, and vehicles overdue for maintenance (30-day threshold).
*   **Financial Trends:** A 7-day bar chart comparing Revenue vs. Profit.
*   **Distribution Charts:** Pie charts for Trip Status (operational health) and Expense Breakdown (cost centers).
*   **Recent Activity:** A quick-glance list of the latest trip statuses.

### 3.2 Fleet Management
*   **Asset Tracking:** List view of all vehicles with license plates and statuses.
*   **CRUD Operations:** Ability to add new vehicles and update existing asset details (type, capacity, status).

### 3.3 Trip Management & Vouchering
*   **Scheduling:** Creation of trips with multi-stop routes.
*   **Workflow:** Operations can "Start" a trip (Status: En Route).
*   **Vouchering Logic (Critical):**
    *   The system calculates all possible segments within a route (e.g., A→C via B creates A→B, B→C, and A→C).
    *   Users enter passenger counts for each segment.
    *   Revenue is calculated using a pre-defined `FARE_MATRIX` in `constants.ts`.
    *   Upon saving, the trip status moves to "Completed" and a revenue transaction is posted.

### 3.4 Financials & Private Hire
*   **Unified Ledger:** A chronological list of all revenue and expenses.
*   **Private Hire Logging:** Supports specialized contracts where a vehicle is rented out for a date range.
    *   *Fixed Price:* Total lump sum.
    *   *Per Day:* Rate multiplied by duration (managed visually with `endDate`).
*   **Manual Expenses:** Logging general operational costs not tied to specific maintenance (e.g., general office bills).

### 3.5 Maintenance & Service Logs
*   **History:** Comprehensive audit trail of all repairs and fuel refills.
*   **Integration:** Linking costs to specific vehicles to calculate TCO (Total Cost of Ownership).

---

## 4. Business Logic & Rules

1.  **Fare Calculation:** Fares are determined by a segment-based matrix. If a segment (e.g., A→D) isn't in the matrix, the segment is considered invalid for revenue entry.
2.  **Maintenance Sync:** Creating a `MaintenanceRecord` must create a `Transaction` of type `Expense`. This ensures the financial summary is always accurate.
3.  **Status Flow:** A trip should ideally move from `Scheduled` -> `En Route` -> `Completed`. Vouchers can only be generated for trips to move them to `Completed`.
4.  **Multi-Tenancy:** The data structures include a `tenantId`. Currently, the `TENANT_ID` constant filters all mock data, preparing the app for a multi-tenant backend migration.

---

## 5. Development Roadmap for Backend Integration

1.  **Authentication:** Implement JWT-based auth with `tenantId` claims.
2.  **Database:** A relational DB (PostgreSQL) is recommended to handle the complex relationships between Trips, Routes (Segments), and Transactions.
3.  **Real-time:** Implement WebSockets for the Dashboard to update "Active Trips" and "Revenue" live as drivers/operators update vouchers.
4.  **Reporting:** Expand the `FinancialSummary` logic into a backend worker that aggregates monthly/quarterly P&L statements.