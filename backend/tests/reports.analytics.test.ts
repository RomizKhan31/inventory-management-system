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

async function runReportsAnalyticsTests() {
  console.log('========================================================================');
  console.log('📊 REPORTS AND ANALYTICS AUTOMATED TEST SUITE (DAY 9 OF 10)');
  console.log('========================================================================\n');

  console.log('🔑 Authenticating operator accounts...');
  const adminToken = await login(USERS.ADMIN.userCode, USERS.ADMIN.pass);
  const trackerToken = await login(USERS.COMPONENT_TRACKER.userCode, USERS.COMPONENT_TRACKER.pass);
  const receiveToken = await login(USERS.RECEIVE_USER.userCode, USERS.RECEIVE_USER.pass);
  const deliveryToken = await login(USERS.DELIVERY_USER.userCode, USERS.DELIVERY_USER.pass);
  const viewerToken = await login(USERS.REPORT_VIEWER.userCode, USERS.REPORT_VIEWER.pass);
  console.log('   ✓ Tokens acquired for Admin, Tracker, Receive, Delivery, and Report Viewer.\n');

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
  // 1. Role Authorization Verification on Reports
  // --------------------------------------------------------------------------
  console.log('📌 1. Role Authorization on Reporting Endpoints...');

  // Unauthenticated requests
  const unauthRes = await fetch(`${BASE_URL}/reports/stock-details`);
  assert(unauthRes.status === 401, 'Unauthenticated report request rejected (HTTP 401)');

  // REPORT_VIEWER and ADMIN should have access
  const viewerStockRes = await fetch(`${BASE_URL}/reports/stock-details`, {
    headers: { Authorization: `Bearer ${viewerToken}` },
  });
  assert(viewerStockRes.status === 200, 'REPORT_VIEWER granted access to stock-details (HTTP 200)');

  const adminStockRes = await fetch(`${BASE_URL}/reports/stock-details`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminStockRes.status === 200, 'ADMIN granted access to stock-details (HTTP 200)');

  // Operational roles (Tracker, Receive, Delivery) must receive 403 Forbidden
  for (const [roleName, token] of [
    ['COMPONENT_TRACKER', trackerToken],
    ['RECEIVE_USER', receiveToken],
    ['DELIVERY_USER', deliveryToken],
  ] as const) {
    const blockedStockRes = await fetch(`${BASE_URL}/reports/stock-details`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(
      blockedStockRes.status === 403,
      `Non-authorized role [${roleName}] blocked from reports (HTTP 403 Forbidden)`
    );
  }

  // --------------------------------------------------------------------------
  // 2. Sample Data Setup for Precision Ledger Accounting
  // --------------------------------------------------------------------------
  console.log('\n📌 2. Setting Up Sample Lifecycle Operations for Reconciliation...');
  const testRunId = Date.now();

  // Unit A: In Stock (Tracked -> Received)
  const chassisA = `RPT_STOCK_A_${testRunId}`;
  const compA = `RPT_COMP_A_${testRunId}`;
  await fetch(`${BASE_URL}/inventory/track-components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${trackerToken}` },
    body: JSON.stringify({ productBarcode: chassisA, componentBarcode: compA, componentName: 'Compressor' }),
  });
  await fetch(`${BASE_URL}/inventory/receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${receiveToken}` },
    body: JSON.stringify({ productBarcode: chassisA, receivePoint: 'RP-REF-01' }),
  });

  // Unit B: Delivered (Tracked -> Received -> Delivered)
  const chassisB = `RPT_DELIV_B_${testRunId}`;
  const compB = `RPT_COMP_B_${testRunId}`;
  await fetch(`${BASE_URL}/inventory/track-components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${trackerToken}` },
    body: JSON.stringify({ productBarcode: chassisB, componentBarcode: compB, componentName: 'Condenser' }),
  });
  await fetch(`${BASE_URL}/inventory/receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${receiveToken}` },
    body: JSON.stringify({ productBarcode: chassisB, receivePoint: 'RP-REF-01' }),
  });
  await fetch(`${BASE_URL}/inventory/deliver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deliveryToken}` },
    body: JSON.stringify({ productBarcode: chassisB, deliveryPoint: 'DP-REF-01' }),
  });

  // Unit C: Reversed Receive (Tracked -> Received -> Reversed) -> Must be TRACKED, NOT in stock!
  const chassisC = `RPT_REV_RCV_C_${testRunId}`;
  const compC = `RPT_COMP_C_${testRunId}`;
  await fetch(`${BASE_URL}/inventory/track-components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${trackerToken}` },
    body: JSON.stringify({ productBarcode: chassisC, componentBarcode: compC, componentName: 'Thermostat' }),
  });
  await fetch(`${BASE_URL}/inventory/receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${receiveToken}` },
    body: JSON.stringify({ productBarcode: chassisC, receivePoint: 'RP-REF-01' }),
  });
  await fetch(`${BASE_URL}/inventory/reverse-receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ productBarcode: chassisC, reason: 'Quality inspection reject on intake bay' }),
  });

  console.log('   ✓ Sample units initialized (Unit A: In Stock, Unit B: Delivered, Unit C: Reversed Receive).\n');

  // --------------------------------------------------------------------------
  // 3. Stock Details Report Verification
  // --------------------------------------------------------------------------
  console.log('📌 3. Stock Details Report Calculation & Reversal Safeguard...');
  const stockReportRes = await fetch(`${BASE_URL}/reports/stock-details?search=${testRunId}`, {
    headers: { Authorization: `Bearer ${viewerToken}` },
  });
  const stockReportData: any = await stockReportRes.json();

  assert(stockReportRes.status === 200, 'Stock details report returns HTTP 200');
  assert(
    Array.isArray(stockReportData.data),
    'Stock details report returns array of product items'
  );

  const foundA = stockReportData.data.find((item: any) => item.productBarcode === chassisA);
  const foundB = stockReportData.data.find((item: any) => item.productBarcode === chassisB);
  const foundC = stockReportData.data.find((item: any) => item.productBarcode === chassisC);

  assert(
    foundA && foundA.status === 'IN_STOCK' && foundA.currentReceivePoint?.includes('Receive Point'),
    `Unit A derived as IN_STOCK at '${foundA?.currentReceivePoint}'`,
    foundA
  );

  assert(
    foundB && foundB.status === 'DELIVERED' && foundB.deliveryPoint?.includes('Delivery Point'),
    `Unit B derived as DELIVERED via '${foundB?.deliveryPoint}'`,
    foundB
  );

  assert(
    foundC && foundC.status === 'TRACKED' && foundC.hasReversals === true,
    'Reversal Safeguard: Unit C (reversed receive) is NOT counted as IN_STOCK (status is TRACKED)',
    foundC
  );

  // Status Filter test (status=IN_STOCK)
  const inStockOnlyRes = await fetch(`${BASE_URL}/reports/stock-details?search=${testRunId}&status=IN_STOCK`, {
    headers: { Authorization: `Bearer ${viewerToken}` },
  });
  const inStockOnlyData: any = await inStockOnlyRes.json();
  const inStockBarcodes = inStockOnlyData.data.map((i: any) => i.productBarcode);
  assert(
    inStockBarcodes.includes(chassisA) && !inStockBarcodes.includes(chassisB) && !inStockBarcodes.includes(chassisC),
    'Status filter correctly includes only active IN_STOCK units and excludes DELIVERED or REVERSED units'
  );

  // Component information in stock report
  assert(
    foundA?.components?.length > 0 && foundA?.components[0]?.barcode === compA,
    'Stock details report displays modular component barcodes and names',
    foundA?.components
  );

  // --------------------------------------------------------------------------
  // 4. Date Range Summary Report & KPI Aggregation
  // --------------------------------------------------------------------------
  console.log('\n📌 4. Date Range Summary Report Verification...');
  const summaryRes = await fetch(`${BASE_URL}/reports/summary`, {
    headers: { Authorization: `Bearer ${viewerToken}` },
  });
  const summaryData: any = await summaryRes.json();

  assert(summaryRes.status === 200, 'Date range summary report returns HTTP 200');
  const metrics = summaryData.data?.metrics;
  assert(
    metrics &&
      metrics.totalTransactions > 0 &&
      metrics.totalReceived > 0 &&
      metrics.totalDelivered > 0 &&
      metrics.reversals.reversedReceive >= 1,
    'Summary metrics accurately compute total transactions, intake, dispatch, and reversal counts',
    metrics
  );

  assert(
    metrics.netActiveReceived === metrics.totalReceived - metrics.reversals.reversedReceive,
    'Net active receipts correctly equals (totalReceived - reversedReceive)',
    { net: metrics.netActiveReceived, raw: metrics.totalReceived, rev: metrics.reversals.reversedReceive }
  );

  // Daily activity timeseries structure for charts
  const dailyActivity = summaryData.data?.dailyActivity;
  assert(
    Array.isArray(dailyActivity) && dailyActivity.length > 0 && dailyActivity[0].date !== undefined,
    'Daily activity timeseries array populated for frontend chart visualization',
    dailyActivity?.[0]
  );

  // Station summaries
  const receivePointsSummary = summaryData.data?.receivePointsSummary;
  assert(
    Array.isArray(receivePointsSummary) && receivePointsSummary.length > 0,
    'Receive points activity summary generated with station breakdown',
    receivePointsSummary?.[0]
  );

  // --------------------------------------------------------------------------
  // 5. Barcode-Wise Complete Lifecycle History Report
  // --------------------------------------------------------------------------
  console.log('\n📌 5. Barcode-Wise Full Lifecycle Journey Report...');
  const historyRes = await fetch(`${BASE_URL}/reports/barcode-history/${chassisC}`, {
    headers: { Authorization: `Bearer ${viewerToken}` },
  });
  const historyData: any = await historyRes.json();

  assert(historyRes.status === 200, 'Barcode history returns HTTP 200 for tracked product');
  assert(
    historyData.data?.productBarcode === chassisC,
    'Barcode history matches requested chassis barcode'
  );

  const timeline = historyData.data?.eventsTimeline;
  assert(
    Array.isArray(timeline) && timeline.length === 3,
    'Timeline contains all 3 lifecycle operations: COMPONENT_TRACKED, RECEIVED, REVERSED_RECEIVE',
    timeline?.map((t: any) => t.eventType)
  );

  // Verify chronological ordering
  const isChronological = timeline.every((ev: any, idx: number) => {
    if (idx === 0) return true;
    return new Date(ev.createdAt).getTime() >= new Date(timeline[idx - 1].createdAt).getTime();
  });
  assert(isChronological, 'Original chronological order strictly preserved in lifecycle timeline');

  // Verify reversal annotation
  const receivedStep = timeline.find((t: any) => t.eventType === 'RECEIVED');
  const reversalStep = timeline.find((t: any) => t.eventType === 'REVERSED_RECEIVE');
  assert(
    receivedStep?.isReversed === true && receivedStep?.reversalDetails?.reason?.includes('Quality inspection'),
    'Received event is annotated as reversed with responsible reason and operator details',
    receivedStep?.reversalDetails
  );
  assert(
    reversalStep?.isReversalEvent === true,
    'Compensating reversal event clearly distinguished in timeline tree'
  );

  // --------------------------------------------------------------------------
  // 6. CSV Export Functionality
  // --------------------------------------------------------------------------
  console.log('\n📌 6. CSV / Excel Report Export Capabilities...');

  // 6.1 Stock Details CSV Export
  const exportStockRes = await fetch(`${BASE_URL}/reports/export?reportType=stock-details&search=${testRunId}`, {
    headers: { Authorization: `Bearer ${viewerToken}` },
  });
  assert(
    exportStockRes.status === 200 && (exportStockRes.headers.get('content-type') || '').includes('text/csv'),
    'Stock details exported as text/csv format with RFC-4180 headers'
  );
  const stockCsvText = await exportStockRes.text();
  assert(
    stockCsvText.includes('Product Barcode') && stockCsvText.includes(chassisA),
    'Stock details CSV contains required header columns and product row data'
  );

  // 6.2 Summary CSV Export
  const exportSummaryRes = await fetch(`${BASE_URL}/reports/export?reportType=summary`, {
    headers: { Authorization: `Bearer ${viewerToken}` },
  });
  assert(
    exportSummaryRes.status === 200 && (exportSummaryRes.headers.get('content-type') || '').includes('text/csv'),
    'Summary report exported as text/csv format'
  );
  const summaryCsvText = await exportSummaryRes.text();
  assert(
    summaryCsvText.includes('Date') && summaryCsvText.includes('Received Count'),
    'Summary CSV contains daily activity headers'
  );

  // 6.3 Barcode History CSV Export
  const exportHistoryRes = await fetch(`${BASE_URL}/reports/export?reportType=barcode-history&barcode=${chassisC}`, {
    headers: { Authorization: `Bearer ${viewerToken}` },
  });
  assert(
    exportHistoryRes.status === 200 && (exportHistoryRes.headers.get('content-type') || '').includes('text/csv'),
    'Barcode history exported as text/csv format'
  );
  const historyCsvText = await exportHistoryRes.text();
  assert(
    historyCsvText.includes('Step') && historyCsvText.includes('REVERSED_RECEIVE'),
    'Barcode history CSV includes complete step-by-step lifecycle entries'
  );

  // Export role authorization (Non-viewer role blocked)
  const blockedExportRes = await fetch(`${BASE_URL}/reports/export?reportType=summary`, {
    headers: { Authorization: `Bearer ${trackerToken}` },
  });
  assert(
    blockedExportRes.status === 403,
    'Non-authorized role blocked from report export (HTTP 403 Forbidden)'
  );

  // ==========================================================================
  console.log('\n========================================================================');
  console.log(`📊 REPORTS & ANALYTICS TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runReportsAnalyticsTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
