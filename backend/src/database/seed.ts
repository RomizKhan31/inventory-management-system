import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import {
  User,
  Product,
  Component,
  ReceivePoint,
  DeliveryPoint,
  InventoryTransaction,
  AuditLog,
  ComponentBinding,
} from './models';

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_db';

export const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[Seed] Connected. Clearing existing collections...');

    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Component.deleteMany({}),
      ReceivePoint.deleteMany({}),
      DeliveryPoint.deleteMany({}),
      InventoryTransaction.deleteMany({}),
      AuditLog.deleteMany({}),
      ComponentBinding.deleteMany({}),
    ]);

    console.log('[Seed] Collections cleared. Creating users...');

    // 1. Seed Users (5 mutually exclusive roles)
    const defaultPasswordHash = await bcrypt.hash('Walton@2026', 12);

    const users = await User.insertMany([
      {
        userCode: 'ADMIN01',
        name: 'System Administrator',
        email: 'admin@waltonbd.com',
        passwordHash: defaultPasswordHash,
        role: 'ADMIN',
        isActive: true,
      },
      {
        userCode: '66798', // Exact Employee ID from assignment sample test record
        name: 'Hasan Ali (Component Tracker)',
        email: 'tracker66798@waltonbd.com',
        passwordHash: defaultPasswordHash,
        role: 'COMPONENT_TRACKER',
        isActive: true,
      },
      {
        userCode: '58877', // Exact Employee ID from assignment sample test record
        name: 'Rahim Uddin (Receive Officer)',
        email: 'receive58877@waltonbd.com',
        passwordHash: defaultPasswordHash,
        role: 'RECEIVE_USER',
        isActive: true,
      },
      {
        userCode: '54671', // Exact Employee ID from assignment sample test record
        name: 'Karim Mollah (Delivery Officer)',
        email: 'delivery54671@waltonbd.com',
        passwordHash: defaultPasswordHash,
        role: 'DELIVERY_USER',
        isActive: true,
      },
      {
        userCode: 'VIEW01',
        name: 'Audit Inspector',
        email: 'viewer@waltonbd.com',
        passwordHash: defaultPasswordHash,
        role: 'REPORT_VIEWER',
        isActive: true,
      },
    ]);

    console.log(`[Seed] Seeded ${users.length} users with 5 distinct roles.`);

    // 2. Seed Master Data: Products
    const products = await Product.insertMany([
      {
        productCode: 'REF-WDN-2B6',
        name: 'Refrigerator',
        modelNumber: 'WDN-2B6-RXXX',
        category: 'Appliances',
        description: 'Walton Direct Cool Refrigerator 2B6',
        isActive: true,
        isDeleted: false,
      },
      {
        productCode: 'AC-INV-1.5T',
        name: 'Air Conditioner',
        modelNumber: 'WSI-INVERNA-18C',
        category: 'HVAC',
        description: 'Walton 1.5 Ton Inverter Air Conditioner',
        isActive: true,
        isDeleted: false,
      },
    ]);

    // 3. Seed Master Data: Components
    const components = await Component.insertMany([
      {
        componentCode: 'COMP-INV-01',
        name: 'Compressor',
        category: 'Mechanical',
        specifications: 'Rotary Inverter Compressor R600a',
        isActive: true,
        isDeleted: false,
      },
      {
        componentCode: 'COND-CU-02',
        name: 'Condenser',
        category: 'Mechanical',
        specifications: '100% Copper Condenser Coil',
        isActive: true,
        isDeleted: false,
      },
      {
        componentCode: 'PCB-INV-03',
        name: 'Inverter PCB',
        category: 'Electrical',
        specifications: 'Intelligent Inverter Controller Board',
        isActive: true,
        isDeleted: false,
      },
    ]);

    // 4. Seed Master Data: Receive Points
    const receivePoints = await ReceivePoint.insertMany([
      {
        pointCode: 'RP-REF-01',
        name: 'Refrigerator Receive Point 1',
        location: 'Warehouse Bay 1 - Finished Goods Intake',
        isActive: true,
        isDeleted: false,
      },
      {
        pointCode: 'RP-REF-02',
        name: 'Refrigerator Receive Point 2',
        location: 'Warehouse Bay 2 - Overflow Bay',
        isActive: true,
        isDeleted: false,
      },
    ]);

    // 5. Seed Master Data: Delivery Points
    const deliveryPoints = await DeliveryPoint.insertMany([
      {
        pointCode: 'DP-REF-01',
        name: 'Refrigerator Delivery Point 1',
        location: 'Outbound Dock 1 - Primary Dispatch',
        isActive: true,
        isDeleted: false,
      },
      {
        pointCode: 'DP-REF-02',
        name: 'Refrigerator Delivery Point 2',
        location: 'Outbound Dock 2 - Secondary Dispatch',
        isActive: true,
        isDeleted: false,
      },
    ]);

    console.log('[Seed] Master data seeded.');

    // Find references for official assignment test record
    const adminUser = users.find((u) => u.userCode === 'ADMIN01')!;
    const trackerUser = users.find((u) => u.userCode === '66798')!;
    const receiveUser = users.find((u) => u.userCode === '58877')!;
    const deliveryUser = users.find((u) => u.userCode === '54671')!;
    const refProduct = products.find((p) => p.name === 'Refrigerator')!;
    const compCompressor = components.find((c) => c.name === 'Compressor')!;
    const recPoint1 = receivePoints.find(
      (r) => r.name === 'Refrigerator Receive Point 1'
    )!;
    const delPoint1 = deliveryPoints.find(
      (d) => d.name === 'Refrigerator Delivery Point 1'
    )!;

    console.log('[Seed] Seeding Official Assignment Sample Test Record...');

    // 6. Seed Official Assignment Sample Record (Page 3 & 4 of assignment specification)
    // Row 1: Component tracked
    // Date & Time: 2026-03-27 10:00:00
    // Event: Component tracked
    // Barcode: 2440701AK2057
    // Product or component: Compressor 94A600321852 (product: Refrigerator)
    // Point: Refrigerator Component Track Point 1
    // By: 66798
    const tx1 = await InventoryTransaction.create({
      productBarcode: '2440701AK2057',
      productId: refProduct._id,
      productModel: 'Refrigerator',
      eventType: 'COMPONENT_TRACKED',
      componentBarcode: '94A600321852',
      componentId: compCompressor._id,
      componentName: 'Compressor',
      pointName: 'Refrigerator Component Track Point 1',
      performedBy: trackerUser._id,
      userCode: trackerUser.userCode,
      userName: trackerUser.name,
      createdAt: new Date('2026-03-27T10:00:00.000Z'),
    });

    // Record 1-to-1 active binding
    await ComponentBinding.create({
      componentBarcode: '94A600321852',
      productBarcode: '2440701AK2057',
      componentName: 'Compressor',
      attachedAt: new Date('2026-03-27T10:00:00.000Z'),
      attachedBy: trackerUser._id,
      transactionId: tx1._id,
    });

    // Row 2: Received
    // Date & Time: 2026-03-28 10:15:00
    // Event: Received
    // Barcode: 2440701AK2057
    // Product or component: Refrigerator
    // Point: Refrigerator Receive Point 1
    // By: 58877
    const tx2 = await InventoryTransaction.create({
      productBarcode: '2440701AK2057',
      productId: refProduct._id,
      productModel: 'Refrigerator',
      eventType: 'RECEIVED',
      pointId: recPoint1._id,
      pointName: recPoint1.name,
      performedBy: receiveUser._id,
      userCode: receiveUser.userCode,
      userName: receiveUser.name,
      createdAt: new Date('2026-03-28T10:15:00.000Z'),
    });

    // Row 3: Delivered
    // Date & Time: 2026-03-30 11:30:00
    // Event: Delivered
    // Barcode: 2440701AK2057
    // Product or component: Refrigerator
    // Point: Refrigerator Delivery Point 1
    // By: 54671
    const tx3 = await InventoryTransaction.create({
      productBarcode: '2440701AK2057',
      productId: refProduct._id,
      productModel: 'Refrigerator',
      eventType: 'DELIVERED',
      pointId: delPoint1._id,
      pointName: delPoint1.name,
      performedBy: deliveryUser._id,
      userCode: deliveryUser.userCode,
      userName: deliveryUser.name,
      createdAt: new Date('2026-03-30T11:30:00.000Z'),
    });

    // 7. Seed Initial Audit Log Entries
    await AuditLog.insertMany([
      {
        action: 'USER_CREATED',
        entity: 'USER',
        entityId: adminUser._id.toString(),
        performedBy: adminUser._id,
        userCode: adminUser.userCode,
        userName: adminUser.name,
        newValues: { userCode: adminUser.userCode, role: adminUser.role },
        timestamp: new Date('2026-03-25T08:00:00.000Z'),
      },
      {
        action: 'MASTER_DATA_CREATED',
        entity: 'PRODUCT',
        entityId: refProduct._id.toString(),
        performedBy: adminUser._id,
        userCode: adminUser.userCode,
        userName: adminUser.name,
        newValues: { name: refProduct.name, code: refProduct.productCode },
        timestamp: new Date('2026-03-26T09:00:00.000Z'),
      },
    ]);

    console.log('[Seed] Database initialization and seed completed successfully!');
    console.log(`[Seed] Summary:
      - Users: 5
      - Products: 2
      - Components: 3
      - Receive Points: 2
      - Delivery Points: 2
      - Inventory History Rows: 3 (Unit 2440701AK2057 is in DELIVERED state)
      - Component Bindings: 1
      - Audit Logs: 2`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Database seeding failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Execute if run directly from CLI
if (require.main === module) {
  seedDatabase();
}
