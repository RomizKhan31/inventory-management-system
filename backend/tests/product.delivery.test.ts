import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api/v1';

interface RoleCreds {
  userCode: string;
  pass: string;
}

const USERS: Record<string, RoleCreds> = {
  ADMIN: { userCode: 'ADMIN01', pass: 'Walton@2026' },
  COMPONENT_TRACKER: { userCode: '66798', pass: 'Walton@2026' },
  RECEIVE_USER: { userCode: '58877', pass: 'Walton@2026' },
  DELIVERY_USER: { userCode: '54671', pass: 'Walton@2026' },
  REPORT_VIEWER: { userCode: 'VIEW01', pass: 'Walton@2026' },
};

async function login(userCode: string, pass: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: userCode, password: pass }),
  });
  const data: any = await res.json();
  if (!res.ok || !data.data?.token) {
    throw new Error(`Failed to login as ${userCode}: ${JSON.stringify(data)}`);
  }
  return data.data.token;
}

async function runDeliveryTests() {
  console.log('========================================================================');
  console.log('🚚 PRODUCT DELIVERY MODULE AUTOMATED TEST SUITE (DAY 7 OF 10)');
  console.log('========================================================================\n');

  console.log('🔑 Authenticating operator accounts...');
  const adminToken = await login(USERS.ADMIN.userCode, USERS.ADMIN.pass);
  const trackerToken = await login(USERS.COMPONENT_TRACKER.userCode, USERS.COMPONENT_TRACKER.pass);
  const receiveToken = await login(USERS.RECEIVE_USER.userCode, USERS.RECEIVE_USER.pass);
  const deliveryToken = await login(USERS.DELIVERY_USER.userCode, USERS.DELIVERY_USER.pass);
  const viewerToken = await login(USERS.REPORT_VIEWER.userCode, USERS.REPORT_VIEWER.pass);
  console.log('   ✓ Tokens acquired for Admin, Component Tracker, Receive User, Delivery User, and Report Viewer.\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, errorDetails?: any) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`, errorDetails ? JSON.stringify(errorDetails, null, 2) : '');
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // 1. Role-Based Access Control on Product Delivery
  // --------------------------------------------------------------------------
  console.log('📌 1. Role Authorization Verification...');

  // Unauthenticated request
  const unauthRes = await fetch(`${BASE_URL}/inventory/deliver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productBarcode: 'TEST_CHASSIS_01', deliveryPoint: 'DP-REF-01' }),
  });
  assert(unauthRes.status === 401, 'Unauthenticated request rejected with HTTP 401');

  // Forbidden roles: COMPONENT_TRACKER, RECEIVE_USER, REPORT_VIEWER
  for (const [roleName, token] of [
    ['COMPONENT_TRACKER', trackerToken],
    ['RECEIVE_USER', receiveToken],
    ['REPORT_VIEWER', viewerToken],
  ] as const) {
    const res = await fetch(`${BASE_URL}/inventory/deliver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ productBarcode: 'TEST_CHASSIS_01', deliveryPoint: 'DP-REF-01' }),
    });
    assert(res.status === 403, `Non-delivery role [${roleName}] rejected with HTTP 403 Forbidden`);
  }

  // --------------------------------------------------------------------------
  // 2. Active Delivery Points Query
  // --------------------------------------------------------------------------
  console.log('\n📌 2. Active Delivery Points Master List Query...');
  const pointsRes = await fetch(`${BASE_URL}/inventory/delivery-points`, {
    headers: { Authorization: `Bearer ${deliveryToken}` },
  });
  const pointsData: any = await pointsRes.json();
  assert(
    pointsRes.status === 200 && Array.isArray(pointsData.data) && pointsData.data.length > 0,
    'DELIVERY_USER can retrieve active delivery points list',
    pointsData
  );

  const sampleDeliveryPoint = pointsData.data?.[0];
  const sampleDeliveryPointCode = sampleDeliveryPoint?.pointCode || 'DP-REF-01';

  // --------------------------------------------------------------------------
  // 3. Barcode and Input Validation
  // --------------------------------------------------------------------------
  console.log('\n📌 3. Barcode & Input Validation...');

  // Short barcode (< 3 chars)
  const shortBarcodeRes = await fetch(`${BASE_URL}/inventory/deliver`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${deliveryToken}`,
    },
    body: JSON.stringify({ productBarcode: 'B', deliveryPoint: sampleDeliveryPointCode }),
  });
  assert(
    shortBarcodeRes.status === 400 || shortBarcodeRes.status === 422,
    'Short product barcode (< 3 chars) rejected (HTTP 400/422)'
  );

  // Missing delivery point
  const missingPointRes = await fetch(`${BASE_URL}/inventory/deliver`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${deliveryToken}`,
    },
    body: JSON.stringify({ productBarcode: 'VALID_CHASSIS_01' }),
  });
  assert(
    missingPointRes.status === 400 || missingPointRes.status === 422,
    'Missing delivery point identifier rejected (HTTP 400/422)'
  );

  // --------------------------------------------------------------------------
  // 4. Unavailable Products Delivery Restrictions
  // --------------------------------------------------------------------------
  console.log('\n📌 4. Stock Availability & Invariant Enforcement...');

  // 4.1 Untracked product chassis (never tracked)
  const untrackedBarcode = `UNTRACKED_DEL_${Date.now()}`;
  const untrackedDelRes = await fetch(`${BASE_URL}/inventory/deliver`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${deliveryToken}`,
    },
    body: JSON.stringify({
      productBarcode: untrackedBarcode,
      deliveryPoint: sampleDeliveryPointCode,
    }),
  });
  const untrackedData: any = await untrackedDelRes.json();
  assert(
    untrackedDelRes.status === 422,
    'Delivering an untracked chassis rejected with HTTP 422 (Not in stock / tracking required)',
    untrackedData
  );

  // 4.2 Tracked chassis that has NEVER been received into stock
  const trackedNotReceived = `TRACKED_UNRECEIVED_${Date.now()}`;
  const comp1 = `COMP_UNREC_${Date.now()}`;
  await fetch(`${BASE_URL}/inventory/track-components`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${trackerToken}`,
    },
    body: JSON.stringify({
      productBarcode: trackedNotReceived,
      componentBarcode: comp1,
    }),
  });

  const unreceivedDelRes = await fetch(`${BASE_URL}/inventory/deliver`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${deliveryToken}`,
    },
    body: JSON.stringify({
      productBarcode: trackedNotReceived,
      deliveryPoint: sampleDeliveryPointCode,
    }),
  });
  const unreceivedData: any = await unreceivedDelRes.json();
  assert(
    unreceivedDelRes.status === 422 &&
      (unreceivedData.message?.includes('not currently in warehouse stock') || unreceivedData.message?.includes('must be admitted into stock')),
    'Delivering a tracked but un-received chassis rejected with HTTP 422 (Product must be in stock)',
    unreceivedData
  );

  // --------------------------------------------------------------------------
  // 5. Invalid Delivery Point Handling
  // --------------------------------------------------------------------------
  console.log('\n📌 5. Invalid Delivery Point Enforcement...');
  // Create an in-stock unit first
  const inStockChassis1 = `STOCK_FOR_DEL_${Date.now()}`;
  const inStockComp1 = `STOCK_COMP_${Date.now()}`;
  await fetch(`${BASE_URL}/inventory/track-components`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${trackerToken}`,
    },
    body: JSON.stringify({
      productBarcode: inStockChassis1,
      componentBarcode: inStockComp1,
    }),
  });
  await fetch(`${BASE_URL}/inventory/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${receiveToken}`,
    },
    body: JSON.stringify({
      productBarcode: inStockChassis1,
      receivePoint: 'RP-REF-01',
    }),
  });

  // Non-existent delivery point
  const nonExistentPointRes = await fetch(`${BASE_URL}/inventory/deliver`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${deliveryToken}`,
    },
    body: JSON.stringify({
      productBarcode: inStockChassis1,
      deliveryPoint: 'DP-NON-EXISTENT-999',
    }),
  });
  assert(
    nonExistentPointRes.status === 404,
    'Non-existent delivery point rejected with HTTP 404 Not Found'
  );

  // --------------------------------------------------------------------------
  // 6. Valid Product Delivery Workflow & Origin Point Preservation
  // --------------------------------------------------------------------------
  console.log('\n📌 6. Valid Product Delivery Workflow & Origin Preservation...');
  const deliveryChassis = `WALTON_DISPATCH_${Date.now()}`;
  const deliveryCompA = `DISP_COMPA_${Date.now()}`;
  const deliveryCompB = `DISP_COMPB_${Date.now()}`;

  // Step A: Track components
  await fetch(`${BASE_URL}/inventory/track-components`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${trackerToken}`,
    },
    body: JSON.stringify({
      productBarcode: deliveryChassis,
      components: [
        { componentBarcode: deliveryCompA, componentName: 'Compressor' },
        { componentBarcode: deliveryCompB, componentName: 'Condenser' },
      ],
    }),
  });

  // Step B: Receive unit into stock at RP-REF-01
  const intakeRes = await fetch(`${BASE_URL}/inventory/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${receiveToken}`,
    },
    body: JSON.stringify({
      productBarcode: deliveryChassis,
      receivePoint: 'RP-REF-01',
      stationNotes: 'Intake Bay 1 - Shift 1',
    }),
  });
  assert(intakeRes.status === 201, 'Product admitted into stock at RP-REF-01 prior to dispatch');

  // Verify status is IN_STOCK and currentReceivePoint is exposed
  const preDelScanRes = await fetch(`${BASE_URL}/inventory/product-scan/${deliveryChassis}`, {
    headers: { Authorization: `Bearer ${deliveryToken}` },
  });
  const preDelScanData: any = await preDelScanRes.json();
  assert(
    preDelScanData.data?.status === 'IN_STOCK' &&
      preDelScanData.data?.currentReceivePoint?.pointName?.includes('Receive Point'),
    'Pre-delivery scan confirms status IN_STOCK and identifies origin receive point',
    preDelScanData.data?.currentReceivePoint
  );

  // Step C: Execute Delivery by DELIVERY_USER at DP-REF-01
  const deliveryRes = await fetch(`${BASE_URL}/inventory/deliver`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${deliveryToken}`,
    },
    body: JSON.stringify({
      productBarcode: deliveryChassis,
      deliveryPoint: sampleDeliveryPointCode,
      stationNotes: 'Outbound Truck Bay 4 - Invoice #88492',
    }),
  });
  const deliveryData: any = await deliveryRes.json();
  assert(
    deliveryRes.status === 201 && deliveryData.data?.status === 'DELIVERED',
    'DELIVERY_USER successfully delivers product (HTTP 201, status DELIVERED)',
    deliveryData
  );

  // Verify transaction record and origin receive point preservation
  const tx = deliveryData.data?.transaction;
  assert(
    tx?.eventType === 'DELIVERED' &&
      tx?.userCode === USERS.DELIVERY_USER.userCode &&
      tx?.metadata?.originalReceivePointName?.includes('Receive Point'),
    'Transaction snapshots eventType DELIVERED, operator 54671, and preserves originalReceivePointName',
    tx?.metadata
  );

  // Verify post-delivery derived state: DELIVERED
  const postDelScanRes = await fetch(`${BASE_URL}/inventory/product-scan/${deliveryChassis}`, {
    headers: { Authorization: `Bearer ${deliveryToken}` },
  });
  const postDelScanData: any = await postDelScanRes.json();
  assert(
    postDelScanData.data?.status === 'DELIVERED' &&
      postDelScanData.data?.isCurrentlyDelivered === true &&
      postDelScanData.data?.lastDelivery?.pointName === sampleDeliveryPoint?.name,
    'Post-delivery scan derives DELIVERED state and snapshots dispatch location',
    postDelScanData.data?.lastDelivery
  );

  // --------------------------------------------------------------------------
  // 7. Duplicate Delivery Prevention (Already Delivered)
  // --------------------------------------------------------------------------
  console.log('\n📌 7. Duplicate Delivery Prevention (HTTP 409 Conflict)...');
  const duplicateDelRes = await fetch(`${BASE_URL}/inventory/deliver`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${deliveryToken}`,
    },
    body: JSON.stringify({
      productBarcode: deliveryChassis,
      deliveryPoint: sampleDeliveryPointCode,
    }),
  });
  const duplicateData: any = await duplicateDelRes.json();
  assert(
    duplicateDelRes.status === 409,
    'Duplicate delivery of already delivered product rejected with HTTP 409 Conflict',
    duplicateData
  );

  // --------------------------------------------------------------------------
  // 8. Admin User Delivery Authority
  // --------------------------------------------------------------------------
  console.log('\n📌 8. Admin User Delivery Authority...');
  const adminChassis = `ADMIN_DISP_${Date.now()}`;
  const adminComp = `ADMIN_DISP_COMP_${Date.now()}`;
  await fetch(`${BASE_URL}/inventory/track-components`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      productBarcode: adminChassis,
      componentBarcode: adminComp,
    }),
  });
  await fetch(`${BASE_URL}/inventory/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      productBarcode: adminChassis,
      receivePoint: 'RP-REF-01',
    }),
  });

  const adminDeliveryRes = await fetch(`${BASE_URL}/inventory/deliver`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      productBarcode: adminChassis,
      deliveryPointId: sampleDeliveryPoint._id,
    }),
  });
  const adminDeliveryData: any = await adminDeliveryRes.json();
  assert(
    adminDeliveryRes.status === 201 && adminDeliveryData.data?.status === 'DELIVERED',
    'ADMIN user can also execute product delivery (HTTP 201 Created)',
    adminDeliveryData
  );

  // --------------------------------------------------------------------------
  // 9. Concurrency & Race Condition Protection
  // --------------------------------------------------------------------------
  console.log('\n📌 9. Concurrency & Parallel Delivery Protection...');
  const concurrentChassis = `RACE_DEL_CHASSIS_${Date.now()}`;
  const concurrentComp = `RACE_DEL_COMP_${Date.now()}`;

  // Setup: Track and receive product
  await fetch(`${BASE_URL}/inventory/track-components`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${trackerToken}`,
    },
    body: JSON.stringify({
      productBarcode: concurrentChassis,
      componentBarcode: concurrentComp,
    }),
  });
  await fetch(`${BASE_URL}/inventory/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${receiveToken}`,
    },
    body: JSON.stringify({
      productBarcode: concurrentChassis,
      receivePoint: 'RP-REF-01',
    }),
  });

  // Launch 5 parallel delivery requests at the exact same instant
  const concurrentAttempts = 5;
  const parallelRequests = Array.from({ length: concurrentAttempts }, () =>
    fetch(`${BASE_URL}/inventory/deliver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deliveryToken}`,
      },
      body: JSON.stringify({
        productBarcode: concurrentChassis,
        deliveryPoint: sampleDeliveryPointCode,
      }),
    })
  );

  const responses = await Promise.all(parallelRequests);
  const statusCodes = responses.map((r) => r.status);
  const successCount = statusCodes.filter((s) => s === 201).length;
  const conflictCount = statusCodes.filter((s) => s === 409).length;

  console.log(`   Parallel delivery status codes: [${statusCodes.join(', ')}]`);
  assert(
    successCount === 1 && conflictCount === concurrentAttempts - 1,
    `Concurrency test: Exactly 1 delivery succeeded (HTTP 201) and all other ${concurrentAttempts - 1} were safely rejected (HTTP 409 Conflict)`,
    { statusCodes, successCount, conflictCount }
  );

  // ==========================================================================
  console.log('\n========================================================================');
  console.log(`📊 PRODUCT DELIVERY TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runDeliveryTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
