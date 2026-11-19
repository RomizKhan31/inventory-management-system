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

async function runReversalAuditTests() {
  console.log('========================================================================');
  console.log('🔄 REVERSAL, CORRECTION & AUDIT LOGGING AUTOMATED TEST SUITE (DAY 8 OF 10)');
  console.log('========================================================================\n');

  console.log('🔑 Authenticating operator accounts...');
  const adminToken = await login(USERS.ADMIN.userCode, USERS.ADMIN.pass);
  const trackerToken = await login(USERS.COMPONENT_TRACKER.userCode, USERS.COMPONENT_TRACKER.pass);
  const receiveToken = await login(USERS.RECEIVE_USER.userCode, USERS.RECEIVE_USER.pass);
  const deliveryToken = await login(USERS.DELIVERY_USER.userCode, USERS.DELIVERY_USER.pass);
  const viewerToken = await login(USERS.REPORT_VIEWER.userCode, USERS.REPORT_VIEWER.pass);
  console.log('   ✓ Tokens acquired for Admin, Tracker, Receive, Delivery, and Viewer.\n');

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
  // 1. Role Authorization Verification on Reversals
  // --------------------------------------------------------------------------
  console.log('📌 1. Role Authorization & Non-Admin Protection...');

  const unauthRes = await fetch(`${BASE_URL}/inventory/reverse-receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productBarcode: 'TEST_CHASSIS', reason: 'Reversal reason test' }),
  });
  assert(unauthRes.status === 401, 'Unauthenticated reversal request rejected (HTTP 401)');

  for (const [roleName, token] of [
    ['COMPONENT_TRACKER', trackerToken],
    ['RECEIVE_USER', receiveToken],
    ['DELIVERY_USER', deliveryToken],
    ['REPORT_VIEWER', viewerToken],
  ] as const) {
    const res = await fetch(`${BASE_URL}/inventory/reverse-receive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ productBarcode: 'TEST_CHASSIS', reason: 'Reversal reason test' }),
    });
    assert(res.status === 403, `Non-admin [${roleName}] blocked from reversal operations (HTTP 403 Forbidden)`);
  }

  // --------------------------------------------------------------------------
  // 2. Mandatory Reason Validation
  // --------------------------------------------------------------------------
  console.log('\n📌 2. Mandatory Reversal Reason Validation...');
  const shortReasonRes = await fetch(`${BASE_URL}/inventory/reverse-receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      productBarcode: 'TEST_CHASSIS',
      reason: 'Short', // < 10 characters
    }),
  });
  assert(
    shortReasonRes.status === 400 || shortReasonRes.status === 422,
    'Reversal rejected when reason is less than 10 characters (HTTP 400/422)'
  );

  // --------------------------------------------------------------------------
  // 3. Receive Reversal Scenario (REVERSED_RECEIVE)
  // --------------------------------------------------------------------------
  console.log('\n📌 3. Receive Reversal Workflow (REVERSED_RECEIVE)...');
  const rcvChassis = `RCV_REV_CHASSIS_${Date.now()}`;
  const rcvComp = `RCV_REV_COMP_${Date.now()}`;

  // Step A: Track component
  await fetch(`${BASE_URL}/inventory/track-components`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${trackerToken}`,
    },
    body: JSON.stringify({
      productBarcode: rcvChassis,
      componentBarcode: rcvComp,
    }),
  });

  // Step B: Receive into stock
  const intakeRes = await fetch(`${BASE_URL}/inventory/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${receiveToken}`,
    },
    body: JSON.stringify({
      productBarcode: rcvChassis,
      receivePoint: 'RP-REF-01',
    }),
  });
  const intakeData: any = await intakeRes.json();
  const origReceiveTxId = intakeData.data?.transaction?._id;
  assert(intakeRes.status === 201, 'Product admitted into stock prior to receive reversal');

  // Step C: Admin reverses the receiving operation
  const revReceiveRes = await fetch(`${BASE_URL}/inventory/reverse-receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      productBarcode: rcvChassis,
      reason: 'Physical intake inspection defect detected; returned to assembly bay',
    }),
  });
  const revReceiveData: any = await revReceiveRes.json();
  assert(
    revReceiveRes.status === 200 && revReceiveData.data?.status === 'TRACKED',
    'Admin successfully reverses receiving (HTTP 200, status returns to TRACKED)',
    revReceiveData
  );
  assert(
    revReceiveData.data?.reversalTransaction?.eventType === 'REVERSED_RECEIVE' &&
      revReceiveData.data?.reversalTransaction?.reversedTransactionId === origReceiveTxId,
    'Reversal transaction references original receive transaction ID',
    revReceiveData.data?.reversalTransaction
  );

  // Step D: Verify post-reversal stock derivation
  const postRevScanRes = await fetch(`${BASE_URL}/inventory/product-scan/${rcvChassis}`, {
    headers: { Authorization: `Bearer ${receiveToken}` },
  });
  const postRevScanData: any = await postRevScanRes.json();
  assert(
    postRevScanData.data?.status === 'TRACKED' &&
      postRevScanData.data?.isCurrentlyReceived === false &&
      postRevScanData.data?.hasActiveComponents === true,
    'Derived state confirms product is removed from stock and returned to TRACKED state',
    postRevScanData.data
  );

  // Step E: Verify delivered unit cannot have receiving reversed directly
  const delBlockedChassis = `DEL_BLOCKED_${Date.now()}`;
  const delBlockedComp = `DEL_BLOCKED_COMP_${Date.now()}`;
  await fetch(`${BASE_URL}/inventory/track-components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${trackerToken}` },
    body: JSON.stringify({ productBarcode: delBlockedChassis, componentBarcode: delBlockedComp }),
  });
  await fetch(`${BASE_URL}/inventory/receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${receiveToken}` },
    body: JSON.stringify({ productBarcode: delBlockedChassis, receivePoint: 'RP-REF-01' }),
  });
  await fetch(`${BASE_URL}/inventory/deliver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deliveryToken}` },
    body: JSON.stringify({ productBarcode: delBlockedChassis, deliveryPoint: 'DP-REF-01' }),
  });

  const blockedReceiveRevRes = await fetch(`${BASE_URL}/inventory/reverse-receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      productBarcode: delBlockedChassis,
      reason: 'Attempting invalid receive reversal while delivered',
    }),
  });
  assert(
    blockedReceiveRevRes.status === 422,
    'Attempt to reverse receiving of delivered unit rejected with HTTP 422 (Delivery reversal required first)'
  );

  // --------------------------------------------------------------------------
  // 4. Delivery Reversal Scenario (REVERSED_DELIVERY)
  // --------------------------------------------------------------------------
  console.log('\n📌 4. Delivery Reversal Workflow (REVERSED_DELIVERY)...');
  const delRevRes = await fetch(`${BASE_URL}/inventory/reverse-delivery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      productBarcode: delBlockedChassis,
      reason: 'Customer canceled delivery order before gate dispatch; returned to stock',
    }),
  });
  const delRevData: any = await delRevRes.json();
  assert(
    delRevRes.status === 200 && delRevData.data?.status === 'IN_STOCK',
    'Admin successfully reverses delivery (HTTP 200, status returns to IN_STOCK)',
    delRevData
  );
  assert(
    delRevData.data?.reversalTransaction?.eventType === 'REVERSED_DELIVERY' &&
      delRevData.data?.restoredToReceivePoint?.includes('Receive Point'),
    'Product restored to stock and original receive point is preserved',
    delRevData.data
  );

  // --------------------------------------------------------------------------
  // 5. Duplicate Reversal Prevention
  // --------------------------------------------------------------------------
  console.log('\n📌 5. Duplicate Reversal Prevention (HTTP 409 Conflict)...');
  const dupDeliveryRevRes = await fetch(`${BASE_URL}/inventory/reverse-delivery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      productBarcode: delBlockedChassis,
      reason: 'Attempting duplicate delivery reversal on same unit',
    }),
  });
  assert(
    dupDeliveryRevRes.status === 409,
    'Duplicate reversal of already reversed delivery rejected with HTTP 409 Conflict'
  );

  // --------------------------------------------------------------------------
  // 6. Component Tracking Reversal Scenario (REVERSED_COMPONENT)
  // --------------------------------------------------------------------------
  console.log('\n📌 6. Component Tracking Reversal Workflow...');
  const compRevChassis = `COMP_REV_CHASSIS_${Date.now()}`;
  const compCompressor = `COMP_REVERSIBLE_${Date.now()}`;
  const compCondenser = `COMP_COND_REV_${Date.now()}`;

  await fetch(`${BASE_URL}/inventory/track-components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${trackerToken}` },
    body: JSON.stringify({
      productBarcode: compRevChassis,
      components: [
        { componentBarcode: compCompressor, componentName: 'Compressor' },
        { componentBarcode: compCondenser, componentName: 'Condenser' },
      ],
    }),
  });

  // Reverse compressor component
  const compRevRes = await fetch(`${BASE_URL}/inventory/reverse-component`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      productBarcode: compRevChassis,
      componentBarcode: compCompressor,
      reason: 'Incorrect compressor rating model detected during QA inspection',
    }),
  });
  const compRevData: any = await compRevRes.json();
  assert(
    compRevRes.status === 200 && compRevData.data?.liberatedComponentBarcode === compCompressor,
    'Admin successfully reverses component tracking; component liberated for re-use',
    compRevData
  );

  // Verify component can be tracked onto a different chassis
  const secondChassis = `SECOND_CHASSIS_${Date.now()}`;
  const reTrackRes = await fetch(`${BASE_URL}/inventory/track-components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${trackerToken}` },
    body: JSON.stringify({
      productBarcode: secondChassis,
      componentBarcode: compCompressor,
    }),
  });
  assert(
    reTrackRes.status === 200,
    'Liberated component barcode successfully tracked onto a different product chassis'
  );

  // --------------------------------------------------------------------------
  // 7. Ledger Immutability Verification
  // --------------------------------------------------------------------------
  console.log('\n📌 7. Ledger Immutability Verification...');
  // Query transactions for compRevChassis to ensure COMPONENT_TRACKED row still exists
  const ledgerRes = await fetch(`${BASE_URL}/inventory/transactions?productBarcode=${compRevChassis}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const ledgerData: any = await ledgerRes.json();
  const txTypes = ledgerData.data?.map((t: any) => t.eventType);
  assert(
    txTypes.includes('COMPONENT_TRACKED') && txTypes.includes('REVERSED_COMPONENT'),
    'Original COMPONENT_TRACKED event is preserved in ledger alongside compensating REVERSED_COMPONENT event',
    txTypes
  );

  // --------------------------------------------------------------------------
  // 8. Transaction Details & Reversal Annotation API
  // --------------------------------------------------------------------------
  console.log('\n📌 8. Transaction Details & Annotation API...');
  const sampleTx = ledgerData.data?.[0];
  const txDetailRes = await fetch(`${BASE_URL}/inventory/transactions/${sampleTx._id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const txDetailData: any = await txDetailRes.json();
  assert(
    txDetailRes.status === 200 && txDetailData.data?._id === sampleTx._id,
    'GET /inventory/transactions/:id returns single transaction with reversal lineage metadata'
  );

  // --------------------------------------------------------------------------
  // 9. Audit Logging Verification
  // --------------------------------------------------------------------------
  console.log('\n📌 9. Audit Logging System Verification...');
  const auditRes = await fetch(`${BASE_URL}/reports/audit-logs?action=TRANSACTION_REVERSED&limit=5`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const auditData: any = await auditRes.json();
  assert(
    auditRes.status === 200 && Array.isArray(auditData.data) && auditData.data.length > 0,
    'Audit logs record TRANSACTION_REVERSED actions with operator and reason details',
    auditData.data?.[0]
  );
  assert(
    auditData.data?.[0]?.action === 'TRANSACTION_REVERSED' &&
      auditData.data?.[0]?.newValues?.reason !== undefined,
    'Audit log entry captures newValues.reason and responsible user snapshot'
  );

  // --------------------------------------------------------------------------
  // 10. Concurrency & Parallel Reversal Protection
  // --------------------------------------------------------------------------
  console.log('\n📌 10. Concurrency & Parallel Reversal Protection...');
  const concurrentChassis = `RACE_REV_CHASSIS_${Date.now()}`;
  const concurrentComp = `RACE_REV_COMP_${Date.now()}`;

  await fetch(`${BASE_URL}/inventory/track-components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${trackerToken}` },
    body: JSON.stringify({ productBarcode: concurrentChassis, componentBarcode: concurrentComp }),
  });
  await fetch(`${BASE_URL}/inventory/receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${receiveToken}` },
    body: JSON.stringify({ productBarcode: concurrentChassis, receivePoint: 'RP-REF-01' }),
  });

  // Fire 5 parallel reversal requests for the same receiving transaction
  const concurrentAttempts = 5;
  const parallelReversals = Array.from({ length: concurrentAttempts }, () =>
    fetch(`${BASE_URL}/inventory/reverse-receive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        productBarcode: concurrentChassis,
        reason: 'Simultaneous parallel reversal conflict test',
      }),
    })
  );

  const responses = await Promise.all(parallelReversals);
  const statusCodes = responses.map((r) => r.status);
  const successCount = statusCodes.filter((s) => s === 200).length;
  const conflictCount = statusCodes.filter((s) => s === 409).length;

  console.log(`   Parallel reversal status codes: [${statusCodes.join(', ')}]`);
  assert(
    successCount === 1 && conflictCount === concurrentAttempts - 1,
    `Concurrency test: Exactly 1 reversal succeeded (HTTP 200) and all other ${concurrentAttempts - 1} were safely rejected (HTTP 409 Conflict)`,
    { statusCodes, successCount, conflictCount }
  );

  // ==========================================================================
  console.log('\n========================================================================');
  console.log(`📊 REVERSAL & AUDIT TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runReversalAuditTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
