# 06. Sample Database Records & Setup Guide
## Reproducible Seed Data Matching Assignment Industrial Test Record

### 1. Official Assignment Test Record Verification

The assignment specification (Page 3 & 4) provides a mandatory test record that must be seeded and tested end-to-end:
> *"Seed the three history rows below in this order: the first scan registers the barcode, the component is tracked before the unit is received, and delivery comes last. Afterwards the unit's status is delivered and the barcode history report shows all three rows."*

Here is the exact mapping in our MongoDB Atlas database:

#### Event 1: Component Tracked
* **Date & Time:** `2026-03-27 10:00:00`
* **Event Type:** `COMPONENT_TRACKED`
* **Product Barcode:** `2440701AK2057`
* **Product / Component:** `Compressor 94A600321852 (product: Refrigerator)`
* **Point:** `Refrigerator Component Track Point 1`
* **By Operator:** `66798` (Role: `COMPONENT_TRACKER`, Name: *Hasan Ali*)
* **MongoDB Document Snapshot:**
```json
{
  "_id": "67cd80010000000000000001",
  "productBarcode": "2440701AK2057",
  "productModel": "Refrigerator",
  "eventType": "COMPONENT_TRACKED",
  "componentBarcode": "94A600321852",
  "componentName": "Compressor",
  "pointName": "Refrigerator Component Track Point 1",
  "userCode": "66798",
  "userName": "Hasan Ali (Component Tracker)",
  "createdAt": "2026-03-27T10:00:00.000Z"
}
```

#### Event 2: Received
* **Date & Time:** `2026-03-28 10:15:00`
* **Event Type:** `RECEIVED`
* **Product Barcode:** `2440701AK2057`
* **Product:** `Refrigerator`
* **Point:** `Refrigerator Receive Point 1`
* **By Operator:** `58877` (Role: `RECEIVE_USER`, Name: *Rahim Uddin*)
* **MongoDB Document Snapshot:**
```json
{
  "_id": "67cd80010000000000000002",
  "productBarcode": "2440701AK2057",
  "productModel": "Refrigerator",
  "eventType": "RECEIVED",
  "pointName": "Refrigerator Receive Point 1",
  "userCode": "58877",
  "userName": "Rahim Uddin (Receive Officer)",
  "createdAt": "2026-03-28T10:15:00.000Z"
}
```

#### Event 3: Delivered
* **Date & Time:** `2026-03-30 11:30:00`
* **Event Type:** `DELIVERED`
* **Product Barcode:** `2440701AK2057`
* **Product:** `Refrigerator`
* **Point:** `Refrigerator Delivery Point 1`
* **By Operator:** `54671` (Role: `DELIVERY_USER`, Name: *Karim Mollah*)
* **MongoDB Document Snapshot:**
```json
{
  "_id": "67cd80010000000000000003",
  "productBarcode": "2440701AK2057",
  "productModel": "Refrigerator",
  "eventType": "DELIVERED",
  "pointName": "Refrigerator Delivery Point 1",
  "userCode": "54671",
  "userName": "Karim Mollah (Delivery Officer)",
  "createdAt": "2026-03-30T11:30:00.000Z"
}
```

---

### 2. Default Seed User Accounts (One per Role)

All seed user accounts use the default demonstration password: `Walton@2026` (hashed with `bcryptjs` 12 rounds).

| User Code | Name | Email | Role Assigned | Permissions Overview |
| :--- | :--- | :--- | :--- | :--- |
| **`ADMIN01`** | System Administrator | `admin@waltonbd.com` | `ADMIN` | Full master data, user administration, reversals, all reports. |
| **`66798`** | Hasan Ali | `tracker66798@waltonbd.com` | `COMPONENT_TRACKER` | Scans product barcode, attaches component barcodes. |
| **`58877`** | Rahim Uddin | `receive58877@waltonbd.com` | `RECEIVE_USER` | Scans product barcode, admits unit to Receive Point. |
| **`54671`** | Karim Mollah | `delivery54671@waltonbd.com` | `DELIVERY_USER` | Scans product barcode, delivers from stock at Delivery Point. |
| **`VIEW01`** | Audit Inspector | `viewer@waltonbd.com` | `REPORT_VIEWER` | Read-only access to all stock details, trends, and history. |

---

### 3. Step-by-Step Database Setup & Seeding Instructions

#### Option A: Running with MongoDB Atlas (Recommended)
1. In your MongoDB Atlas Console, obtain your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.walton.mongodb.net/inventory_db?retryWrites=true&w=majority
   ```
2. Set `MONGODB_URI` in `backend/.env`:
   ```bash
   MONGODB_URI="mongodb+srv://..."
   ```
3. Run the database seed script:
   ```bash
   cd backend
   npm run seed
   ```

#### Option B: Running with Local MongoDB (Replica Set)
1. Start local MongoDB instance with replica set enabled:
   ```bash
   mongod --replSet rs0 --dbpath /var/lib/mongodb
   ```
2. Initialize replica set (first time only):
   ```bash
   mongosh --eval "rs.initiate()"
   ```
3. Execute seed script:
   ```bash
   cd backend
   npm run seed
   ```
