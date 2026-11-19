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

async function runReceivingTests() {
  console.log('========================================================================');
  console.log('📦 PRODUCT RECEIVING MODULE AUTOMATED TEST SUITE (DAY 6 OF 10)');
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
  // 1. Role-Based Access Control on Product Receiving
  // --------------------------------------------------------------------------
  console.log('📌 1. Role Authorization Verification...');

  // Unauthenticated request
  const unauthRes = await fetch(`${BASE_URL}/inventory/receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productBarcode: 'TEST_CHASSIS_01', receivePoint: 'RP-REF-01' }),
  });
  assert(unauthRes.status === 401, 'Unauthenticated request rejected with HTTP 401');

  // Forbidden roles: COMPONENT_TRACKER, DELIVERY_USER, REPORT_VIEWER
  for (const [roleName, token] of [
    ['COMPONENT_TRACKER', trackerToken],
    ['DELIVERY_USER', deliveryToken],
    ['REPORT_VIEWER', viewerToken],
  ] as const) {
    const res = await fetch(`${BASE_URL}/inventory/receive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ productBarcode: 'TEST_CHASSIS_01', receivePoint: 'RP-REF-01' }),
    });
    assert(res.status === 403, `Non-receive role [${roleName}] rejected with HTTP 403 Forbidden`);
  }

  // --------------------------------------------------------------------------
  // 2. Active Receive Points Query
  // --------------------------------------------------------------------------
  console.log('\n📌 2. Active Receive Points Master List Query...');
  const pointsRes = await fetch(`${BASE_URL}/inventory/receive-points`, {
    headers: { Authorization: `Bearer ${receiveToken}` },
  });
  const pointsData: any = await pointsRes.json();
  assert(
    pointsRes.status === 200 && Array.isArray(pointsData.data) && pointsData.data.length > 0,
    'RECEIVE_USER can retrieve active receive points list',
    pointsData
  );

  const samplePoint = pointsData.data?.[0];
  const samplePointCode = samplePoint?.pointCode || 'RP-REF-01';

  // --------------------------------------------------------------------------
  // 3. Barcode and Input Validation
  // --------------------------------------------------------------------------
  console.log('\n📌 3. Barcode & Input Validation...');

  // Short barcode (< 3 chars)
  const shortBarcodeRes = await fetch(`${BASE_URL}/inventory/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${receiveToken}`,
    },
    body: JSON.stringify({ productBarcode: 'A', receivePoint: samplePointCode }),
  });
  assert(
    shortBarcodeRes.status === 400 || shortBarcodeRes.status === 422,
    'Short product barcode (< 3 chars) rejected (HTTP 400/422)'
  );

  // Missing receive point
  const missingPointRes = await fetch(`${BASE_URL}/inventory/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${receiveToken}`,
    },
    body: JSON.stringify({ productBarcode: 'VALID_CHASSIS_01' }),
  });
  assert(
    missingPointRes.status === 400 || missingPointRes.status === 422,
    'Missing receive point identifier rejected (HTTP 400/422)'
  );

  // --------------------------------------------------------------------------
  // 4. Component Tracking Prerequisite Check
  // --------------------------------------------------------------------------
  console.log('\n📌 4. Component Tracking Prerequisite Enforcement...');
  const untrackedBarcode = `UNTRACKED_CHASSIS_${Date.now()}`;
  const untrackedReceiveRes = await fetch(`${BASE_URL}/inventory/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${receiveToken}`,
    },
    body: JSON.stringify({
      productBarcode: untrackedBarcode,
      receivePoint: samplePointCode,
    }),
  });
  const untrackedData: any = await untrackedReceiveRes.json();
  assert(
    untrackedReceiveRes.status === 422 &&
      (untrackedData.message?.includes('component tracking') || untrackedData.error?.includes('component tracking')),
    'Receiving an untracked chassis rejected with HTTP 422 (Component tracking required)',
    untrackedData
  );

  // --------------------------------------------------------------------------
  // 5. Invalid & Deactivated Receive Point Checks
  // --------------------------------------------------------------------------
  console.log('\n📌 5. Invalid & Deactivated Receive Point Enforcement...');
  // First track a chassis so tracking prerequisite is satisfied
  const validChassis1 = `CHASSIS_REC_TEST_${Date.now()}`;
  const validComp1 = `COMP_REC_TEST_${Date.now()}`;
  await fetch(`${BASE_URL}/inventory/track-components`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${trackerToken}`,
    },
    body: JSON.stringify({
      productBarcode: validChassis1,
      componentBarcode: validComp1,
    }),
  });

  // Non-existent receive point
  const nonExistentPointRes = await fetch(`${BASE_URL}/inventory/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${receiveToken}`,
    },
    body: JSON.stringify({
      productBarcode: validChassis1,
      receivePoint: 'RP-NON-EXISTENT-999',
    }),
  });
  assert(
    nonExistentPointRes.status === 404,
    'Non-existent receive point rejected with HTTP 404 Not Found'
  );

  // --------------------------------------------------------------------------
  // 6. Valid Product Receiving Workflow
  // --------------------------------------------------------------------------
  console.log('\n📌 6. Valid Product Receiving Workflow...');
  const validChassis2 = `WALTON_REF_CHASSIS_${Date.now()}`;
  const compCompressor = `COMP_REFRIG_${Date.now()}_1`;
  const compCondenser = `COMP_COND_${Date.now()}_2`;

  // Track components onto product
  const trackRes = await fetch(`${BASE_URL}/inventory/track-components`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${trackerToken}`,
    },
    body: JSON.stringify({
      productBarcode: validChassis2,
      components: [
        { componentBarcode: compCompressor, componentName: 'Compressor' },
        { componentBarcode: compCondenser, componentName: 'Condenser' },
      ],
    }),
  });
  const trackData: any = await trackRes.json();
  assert(trackRes.status === 200, 'Components successfully tracked onto chassis prior to intake', trackData);

  // Verify state before receiving: TRACKED
  const preScanRes = await fetch(`${BASE_URL}/inventory/product-scan/${validChassis2}`, {
    headers: { Authorization: `Bearer ${receiveToken}` },
  });
  const preScanData: any = await preScanRes.json();
  assert(
    preScanData.data?.status === 'TRACKED' && preScanData.data?.attachedComponents?.length === 2,
    'Pre-receive scan reports status TRACKED with 2 active components',
    preScanData
  );

  // Execute Receiving by RECEIVE_USER
  const receiveRes = await fetch(`${BASE_URL}/inventory/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${receiveToken}`,
    },
    body: JSON.stringify({
      productBarcode: validChassis2,
      receivePoint: samplePointCode,
      stationNotes: 'Shift A Batch 01 Pallet #14',
    }),
  });
  const receiveData: any = await receiveRes.json();
  assert(
    receiveRes.status === 201 && receiveData.data?.status === 'IN_STOCK',
    'RECEIVE_USER successfully receives product (HTTP 201, status IN_STOCK)',
    receiveData
  );
  assert(
    receiveData.data?.transaction?.eventType === 'RECEIVED' &&
      receiveData.data?.transaction?.userCode === USERS.RECEIVE_USER.userCode,
    'Transaction snapshots eventType RECEIVED and operator userCode 58877',
    receiveData.data?.transaction
  );

  // Verify derived stock status after receiving: IN_STOCK
  const postScanRes = await fetch(`${BASE_URL}/inventory/product-scan/${validChassis2}`, {
    headers: { Authorization: `Bearer ${receiveToken}` },
  });
  const postScanData: any = await postScanRes.json();
  assert(
    postScanData.data?.status === 'IN_STOCK' &&
      postScanData.data?.isCurrentlyReceived === true &&
      postScanData.data?.canAttachComponents === false,
    'Post-receive scan derives IN_STOCK, isCurrentlyReceived: true, and blocks further component attachment',
    postScanData
  );

  // --------------------------------------------------------------------------
  // 7. Duplicate Receiving Prevention (Already In Stock)
  // --------------------------------------------------------------------------
  console.log('\n📌 7. Duplicate Receiving Prevention (HTTP 409 Conflict)...');
  const duplicateReceiveRes = await fetch(`${BASE_URL}/inventory/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${receiveToken}`,
    },
    body: JSON.stringify({
      productBarcode: validChassis2,
      receivePoint: samplePointCode,
    }),
  });
  const duplicateData: any = await duplicateReceiveRes.json();
  assert(
    duplicateReceiveRes.status === 409,
    'Duplicate receiving of product already in stock rejected with HTTP 409 Conflict',
    duplicateData
  );

  // --------------------------------------------------------------------------
  // 8. Re-Receiving Delivered Product Prohibited
  // --------------------------------------------------------------------------
  console.log('\n📌 8. Already Delivered Product Re-Receiving Restriction...');
  // The assignment seed unit 2440701AK2057 is in DELIVERED state
  const deliveredChassis = '2440701AK2057';
  const deliveredReceiveRes = await fetch(`${BASE_URL}/inventory/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${receiveToken}`,
    },
    body: JSON.stringify({
      productBarcode: deliveredChassis,
      receivePoint: samplePointCode,
    }),
  });
  const deliveredData: any = await deliveredReceiveRes.json();
  assert(
    deliveredReceiveRes.status === 422,
    'Delivered product re-receive attempt rejected with HTTP 422 (Reversal required)',
    deliveredData
  );

  // --------------------------------------------------------------------------
  // 9. Admin User Receiving Authority
  // --------------------------------------------------------------------------
  console.log('\n📌 9. Admin User Receiving Authority...');
  const adminChassis = `ADMIN_RCV_${Date.now()}`;
  const adminComp = `ADMIN_RCV_COMP_${Date.now()}`;
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

  const adminReceiveRes = await fetch(`${BASE_URL}/inventory/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      productBarcode: adminChassis,
      receivePointId: samplePoint._id,
    }),
  });
  const adminReceiveData: any = await adminReceiveRes.json();
  assert(
    adminReceiveRes.status === 201 && adminReceiveData.data?.status === 'IN_STOCK',
    'ADMIN user can also execute product receiving (HTTP 201 Created)',
    adminReceiveData
  );

  // --------------------------------------------------------------------------
  // 10. Concurrency & Race Condition Protection
  // --------------------------------------------------------------------------
  console.log('\n📌 10. Concurrency & Parallel Intake Protection...');
  const concurrentChassis = `RACE_CHASSIS_${Date.now()}`;
  const concurrentComp = `RACE_COMP_${Date.now()}`;

  // Track component first
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

  // Launch 5 parallel receive requests at the exact same instant
  const concurrentAttempts = 5;
  const parallelRequests = Array.from({ length: concurrentAttempts }, () =>
    fetch(`${BASE_URL}/inventory/receive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${receiveToken}`,
      },
      body: JSON.stringify({
        productBarcode: concurrentChassis,
        receivePoint: samplePointCode,
      }),
    })
  );

  const responses = await Promise.all(parallelRequests);
  const statusCodes = responses.map((r) => r.status);
  const successCount = statusCodes.filter((s) => s === 201).length;
  const conflictCount = statusCodes.filter((s) => s === 409).length;

  console.log(`   Parallel request status codes: [${statusCodes.join(', ')}]`);
  assert(
    successCount === 1 && conflictCount === concurrentAttempts - 1,
    `Concurrency test: Exactly 1 request succeeded (HTTP 201) and all other ${concurrentAttempts - 1} were safely rejected (HTTP 409 Conflict)`,
    { statusCodes, successCount, conflictCount }
  );

  // ==========================================================================
  console.log('\n========================================================================');
  console.log(`📊 PRODUCT RECEIVING TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runReceivingTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
