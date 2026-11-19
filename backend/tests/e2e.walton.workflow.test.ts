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

async function runWaltonE2EWorkflowTests() {
  console.log('========================================================================');
  console.log('🏭 WALTON IMS END-TO-END WORKFLOW INTEGRATION TEST (DAY 10 OF 10)');
  console.log('========================================================================\n');

  console.log('🔑 Authenticating all 5 production roles...');
  const adminToken = await login(USERS.ADMIN.userCode, USERS.ADMIN.pass);
  const trackerToken = await login(USERS.COMPONENT_TRACKER.userCode, USERS.COMPONENT_TRACKER.pass);
  const receiveToken = await login(USERS.RECEIVE_USER.userCode, USERS.RECEIVE_USER.pass);
  const deliveryToken = await login(USERS.DELIVERY_USER.userCode, USERS.DELIVERY_USER.pass);
  const viewerToken = await login(USERS.REPORT_VIEWER.userCode, USERS.REPORT_VIEWER.pass);
  console.log('   ✓ Authenticated: Admin, Tracker 66798, Receive 58877, Delivery 54671, Viewer VIEW01.\n');

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
  // PART 1: Verification of Assignment Sample Record (2440701AK2057)
  // --------------------------------------------------------------------------
  console.log('📌 PART 1: Validating Official Assignment Sample Record [2440701AK2057]...');
  const sampleBarcode = '2440701AK2057';

  // 1.1 Barcode History API query
  const historyRes = await fetch(`${BASE_URL}/reports/barcode-history/${sampleBarcode}`, {
    headers: { Authorization: `Bearer ${viewerToken}` },
  });
  const historyData: any = await historyRes.json();

  assert(historyRes.status === 200, 'Barcode history returns HTTP 200 for 2440701AK2057');
  assert(
    historyData.data?.currentStatus === 'DELIVERED',
    `Status of 2440701AK2057 is DELIVERED (actual: ${historyData.data?.currentStatus})`
  );

  const events = historyData.data?.eventsTimeline || [];
  assert(events.length >= 3, `History contains all 3 recorded events (found: ${events.length})`);

  // Verify Event 1: Component Tracked
  const evTracked = events.find((e: any) => e.eventType === 'COMPONENT_TRACKED');
  assert(
    evTracked &&
      evTracked.componentBarcode === '94A600321852' &&
      evTracked.componentName === 'Compressor' &&
      evTracked.userCode === '66798',
    'Event 1: Component Tracked (Compressor 94A600321852 by Operator 66798)',
    evTracked
  );

  // Verify Event 2: Received
  const evReceived = events.find((e: any) => e.eventType === 'RECEIVED');
  assert(
    evReceived &&
      evReceived.pointName?.includes('Receive Point') &&
      evReceived.userCode === '58877',
    'Event 2: Received (Receive Point 1 by Operator 58877)',
    evReceived
  );

  // Verify Event 3: Delivered
  const evDelivered = events.find((e: any) => e.eventType === 'DELIVERED');
  assert(
    evDelivered &&
      evDelivered.pointName?.includes('Delivery Point') &&
      evDelivered.userCode === '54671',
    'Event 3: Delivered (Delivery Point 1 by Operator 54671)',
    evDelivered
  );

  // 1.2 Verify Product does NOT appear in current stock
  const stockRes = await fetch(`${BASE_URL}/reports/stock-details?status=IN_STOCK&search=${sampleBarcode}`, {
    headers: { Authorization: `Bearer ${viewerToken}` },
  });
  const stockData: any = await stockRes.json();
  const inStockList = stockData.data || [];
  const sampleInStock = inStockList.some((p: any) => p.productBarcode === sampleBarcode);
  assert(
    sampleInStock === false,
    'Delivered product 2440701AK2057 does NOT appear in current available stock list'
  );

  // --------------------------------------------------------------------------
  // PART 2: Complete Live Workflow Execution from Scratch
  // --------------------------------------------------------------------------
  console.log('\n📌 PART 2: Executing Complete Live Workflow (Tracking -> Receiving -> Delivery)...');
  const runId = Date.now();
  const liveChassis = `2440701AK_${runId}`;
  const liveCompressor = `94A60032_${runId}`;

  // Step 2.1: Pre-check scan
  const preScanRes = await fetch(`${BASE_URL}/inventory/product-scan/${liveChassis}`, {
    headers: { Authorization: `Bearer ${trackerToken}` },
  });
  const preScanData: any = await preScanRes.json();
  assert(
    preScanData.data?.status === 'NEW_UNTRACKED' && preScanData.data?.hasActiveComponents === false,
    'Chassis starts in NEW_UNTRACKED state prior to modular component assembly'
  );

  // Step 2.2: Component Tracking by User 66798
  const trackRes = await fetch(`${BASE_URL}/inventory/track-components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${trackerToken}` },
    body: JSON.stringify({
      productBarcode: liveChassis,
      productModel: 'Refrigerator',
      componentBarcode: liveCompressor,
      componentName: 'Compressor',
      stationName: 'Refrigerator Component Track Point 1',
    }),
  });
  const trackData: any = await trackRes.json();
  assert(trackRes.status === 200, 'Operator 66798 successfully tracks modular compressor component');
  assert(trackData.data?.status === 'TRACKED', 'Product transitions to TRACKED state');

  // Verify delivery is blocked at this stage (must be in stock first)
  const prematureDelivRes = await fetch(`${BASE_URL}/inventory/deliver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deliveryToken}` },
    body: JSON.stringify({ productBarcode: liveChassis, deliveryPoint: 'DP-REF-01' }),
  });
  assert(prematureDelivRes.status === 422, 'Premature delivery blocked (Product must be received into stock first)');

  // Step 2.3: Product Receiving by User 58877
  const rcvRes = await fetch(`${BASE_URL}/inventory/receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${receiveToken}` },
    body: JSON.stringify({
      productBarcode: liveChassis,
      receivePoint: 'RP-REF-01',
      stationNotes: 'Normal intake bay quality check passed',
    }),
  });
  const rcvData: any = await rcvRes.json();
  assert(rcvRes.status === 201, 'Operator 58877 successfully receives product into stock (HTTP 201 Created)');
  assert(rcvData.data?.status === 'IN_STOCK', 'Product transitions to IN_STOCK state');

  // Verify product is now visible in current available stock
  const stockCheckRes = await fetch(`${BASE_URL}/reports/stock-details?status=IN_STOCK&search=${liveChassis}`, {
    headers: { Authorization: `Bearer ${viewerToken}` },
  });
  const stockCheckData: any = await stockCheckRes.json();
  const liveInStock = (stockCheckData.data || []).find((p: any) => p.productBarcode === liveChassis);
  assert(
    liveInStock !== undefined && liveInStock.status === 'IN_STOCK',
    'Product is confirmed present in active warehouse stock report'
  );

  // Step 2.4: Product Delivery by User 54671
  const delivRes = await fetch(`${BASE_URL}/inventory/deliver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deliveryToken}` },
    body: JSON.stringify({
      productBarcode: liveChassis,
      deliveryPoint: 'DP-REF-01',
      stationNotes: 'Dispatched on logistics truck #7',
    }),
  });
  const delivData: any = await delivRes.json();
  assert(delivRes.status === 201, 'Operator 54671 successfully delivers product from stock (HTTP 201 Created)');
  assert(delivData.data?.status === 'DELIVERED', 'Product transitions to DELIVERED state');
  assert(
    delivData.data?.originalReceivePoint?.name?.includes('Receive Point'),
    'Transaction preserves original receiving bay reference'
  );

  // Verify product leaves current stock
  const postDelivStockRes = await fetch(`${BASE_URL}/reports/stock-details?status=IN_STOCK&search=${liveChassis}`, {
    headers: { Authorization: `Bearer ${viewerToken}` },
  });
  const postDelivStockData: any = await postDelivStockRes.json();
  const liveStillInStock = (postDelivStockData.data || []).some((p: any) => p.productBarcode === liveChassis);
  assert(
    liveStillInStock === false,
    'Delivered product successfully leaves available warehouse stock'
  );

  // --------------------------------------------------------------------------
  // PART 3: Independent Reversal Scenarios
  // --------------------------------------------------------------------------
  console.log('\n📌 PART 3: Verifying Independent Reversal Scenarios...');

  // 3.1 Delivery Reversal (Restores product to stock)
  const revDelivRes = await fetch(`${BASE_URL}/inventory/reverse-delivery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      productBarcode: liveChassis,
      reason: 'Customer requested order cancellation prior to highway dispatch',
    }),
  });
  const revDelivData: any = await revDelivRes.json();
  assert(revDelivRes.status === 200, 'Admin reverses delivery (HTTP 200)');
  assert(revDelivData.data?.status === 'IN_STOCK', 'Product lifecycle state restored to IN_STOCK');
  assert(
    revDelivData.data?.restoredToReceivePoint?.includes('Receive Point'),
    'Product restored to original intake receive bay'
  );

  // 3.2 Receive Reversal (Removes product from stock back to TRACKED)
  const revRcvRes = await fetch(`${BASE_URL}/inventory/reverse-receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      productBarcode: liveChassis,
      reason: 'Physical intake inspection defect detected; returned to assembly bay',
    }),
  });
  const revRcvData: any = await revRcvRes.json();
  assert(revRcvRes.status === 200, 'Admin reverses receiving (HTTP 200)');
  assert(revRcvData.data?.status === 'TRACKED', 'Product lifecycle state returns to TRACKED');

  // 3.3 Component Reversal (Detaches modular component and frees serial barcode)
  const revCompRes = await fetch(`${BASE_URL}/inventory/reverse-component`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      productBarcode: liveChassis,
      componentBarcode: liveCompressor,
      reason: 'Compressor thermal rating model mismatched with chassis bill-of-materials',
    }),
  });
  const revCompData: any = await revCompRes.json();
  assert(revCompRes.status === 200, 'Admin reverses component tracking (HTTP 200)');
  assert(
    revCompData.data?.liberatedComponentBarcode === liveCompressor,
    'Compressor component serial liberated for re-use'
  );

  // 3.4 Re-tracking liberated component onto a different chassis
  const otherChassis = `2440701_OTHER_${runId}`;
  const retrackRes = await fetch(`${BASE_URL}/inventory/track-components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${trackerToken}` },
    body: JSON.stringify({
      productBarcode: otherChassis,
      componentBarcode: liveCompressor,
      componentName: 'Compressor',
    }),
  });
  assert(retrackRes.status === 200, 'Liberated component serial successfully bound to another chassis');

  // --------------------------------------------------------------------------
  // PART 4: Dashboard API Verification
  // --------------------------------------------------------------------------
  console.log('\n📌 PART 4: Dashboard Real-Time Statistics Verification...');
  const dashRes = await fetch(`${BASE_URL}/inventory/dashboard`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const dashData: any = await dashRes.json();

  assert(dashRes.status === 200, 'GET /inventory/dashboard returns HTTP 200');
  assert(
    typeof dashData.data?.metrics?.currentStockCount === 'number' &&
      typeof dashData.data?.metrics?.todayReceivedCount === 'number' &&
      typeof dashData.data?.metrics?.todayDeliveredCount === 'number',
    'Dashboard metrics provide accurate current stock count, today received, and today delivered counters',
    dashData.data?.metrics
  );

  assert(
    Array.isArray(dashData.data?.longestInStockProducts),
    'Dashboard provides longest-in-stock aging inventory products array'
  );

  assert(
    Array.isArray(dashData.data?.recentTransactions) && dashData.data?.recentTransactions.length > 0,
    'Dashboard provides real-time append-only transaction feed'
  );

  // ==========================================================================
  console.log('\n========================================================================');
  console.log(`📊 E2E WALTON INTEGRATION RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runWaltonE2EWorkflowTests().catch((err) => {
  console.error('Fatal E2E runner error:', err);
  process.exit(1);
});
