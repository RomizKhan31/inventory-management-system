const BASE_URL = 'http://localhost:5000/api/v1';

async function runComponentTrackingTests() {
  console.log('========================================================================');
  console.log('🧩 COMPONENT TRACKING MODULE AUTOMATED TEST SUITE (DAY 5 OF 10)');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, details = '') => {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${details}`);
      failed++;
    }
  };

  try {
    // -------------------------------------------------------------
    // Step 0: Acquire Tokens
    // -------------------------------------------------------------
    console.log('🔑 Authenticating operators...');
    
    // Admin login
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'ADMIN01', password: 'Walton@2026' }),
    });
    const adminData: any = await adminRes.json();
    const adminToken = adminData.data.token;

    // Component tracker login (66798)
    const trackerRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '66798', password: 'Walton@2026' }),
    });
    const trackerData: any = await trackerRes.json();
    const trackerToken = trackerData.data.token;

    // Receive user login (58877) - unauthorized for component tracking
    const receiveRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '58877', password: 'Walton@2026' }),
    });
    const receiveData: any = await receiveRes.json();
    const receiveToken = receiveData.data.token;

    console.log('   ✓ Tokens acquired for Admin, Component Tracker, and Receive User.\n');

    // -------------------------------------------------------------
    // 1. Authorization: Verify Unauthorized Role is Blocked
    // -------------------------------------------------------------
    console.log('📌 1. Authorization & Role Verification...');
    
    const unauthRes = await fetch(`${BASE_URL}/inventory/track-components`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${receiveToken}`,
      },
      body: JSON.stringify({
        productBarcode: 'TEST_CHASSIS_01',
        componentBarcode: 'TEST_COMP_01',
      }),
    });
    assert(unauthRes.status === 403, 'Receive User is rejected from Component Tracking (HTTP 403 Forbidden)');

    // -------------------------------------------------------------
    // 2. Barcode Validation
    // -------------------------------------------------------------
    console.log('\n📌 2. Product & Component Barcode Validation...');

    // 2.1 Invalid product barcode format (<3 chars)
    const invalidProductRes = await fetch(`${BASE_URL}/inventory/product-scan/AB`, {
      headers: { Authorization: `Bearer ${trackerToken}` },
    });
    assert(invalidProductRes.status === 400, 'Invalid short product barcode rejected (HTTP 400)');

    // 2.2 Valid product barcode query
    const validChassisBarcode = `2440701AK${Math.floor(1000 + Math.random() * 9000)}`;
    const validProductRes = await fetch(`${BASE_URL}/inventory/product-scan/${validChassisBarcode}`, {
      headers: { Authorization: `Bearer ${trackerToken}` },
    });
    const validProductData: any = await validProductRes.json();
    assert(
      validProductRes.status === 200 &&
        validProductData.data.status === 'NEW_UNTRACKED' &&
        validProductData.data.canAttachComponents === true,
      'Valid new product chassis scan returns status NEW_UNTRACKED with canAttach: true'
    );

    // 2.3 Pre-registered component query from seed data
    const compQueryRes = await fetch(`${BASE_URL}/inventory/component-scan/COMP-INV-01`, {
      headers: { Authorization: `Bearer ${trackerToken}` },
    });
    const compQueryData: any = await compQueryRes.json();
    assert(
      compQueryRes.status === 200 && compQueryData.data.isRegisteredInMaster === true,
      'Registered component query returns master catalog item specifications'
    );

    // -------------------------------------------------------------
    // 3. Attaching Multiple Components to One Product Chassis
    // -------------------------------------------------------------
    console.log('\n📌 3. Attaching Multiple Components to One Product Chassis...');

    const compBarcodeCompressor = `COMP_BAR_${Math.floor(100000 + Math.random() * 900000)}`;
    const compBarcodeCondenser = `COND_BAR_${Math.floor(100000 + Math.random() * 900000)}`;
    const compBarcodePCB = `PCB_BAR_${Math.floor(100000 + Math.random() * 900000)}`;

    // 3.1 Attach Compressor
    const attachCompRes1 = await fetch(`${BASE_URL}/inventory/track-components`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${trackerToken}`,
      },
      body: JSON.stringify({
        productBarcode: validChassisBarcode,
        productModel: 'Refrigerator',
        componentBarcode: compBarcodeCompressor,
        componentName: 'Compressor',
      }),
    });
    const attachData1: any = await attachCompRes1.json();
    assert(
      attachCompRes1.status === 200 &&
        attachData1.data.status === 'TRACKED' &&
        attachData1.data.allAttachedComponents.length === 1,
      'First component (Compressor) attached to product chassis'
    );

    // 3.2 Attach Condenser to the SAME Product Chassis (1:N relationship)
    const attachCompRes2 = await fetch(`${BASE_URL}/inventory/track-components`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${trackerToken}`,
      },
      body: JSON.stringify({
        productBarcode: validChassisBarcode,
        componentBarcode: compBarcodeCondenser,
        componentName: 'Condenser',
      }),
    });
    const attachData2: any = await attachCompRes2.json();
    assert(
      attachCompRes2.status === 200 &&
        attachData2.data.allAttachedComponents.length === 2,
      'Second component (Condenser) attached to the same product chassis (1:N verified)'
    );

    // 3.3 Attach Inverter PCB as Third Component
    const attachCompRes3 = await fetch(`${BASE_URL}/inventory/track-components`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${trackerToken}`,
      },
      body: JSON.stringify({
        productBarcode: validChassisBarcode,
        componentBarcode: compBarcodePCB,
        componentName: 'Inverter PCB',
      }),
    });
    const attachData3: any = await attachCompRes3.json();
    assert(
      attachCompRes3.status === 200 &&
        attachData3.data.allAttachedComponents.length === 3,
      'Third component (Inverter PCB) attached to the same product chassis'
    );

    // -------------------------------------------------------------
    // 4. Duplicate Component Assignment Prevention (1:1 Exclusivity)
    // -------------------------------------------------------------
    console.log('\n📌 4. Duplicate Component Assignment Prevention...');

    const secondChassisBarcode = `2440701AK${Math.floor(1000 + Math.random() * 9000)}`;

    // Attempt to attach the ALREADY bound Compressor to a different chassis
    const dupCompRes = await fetch(`${BASE_URL}/inventory/track-components`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${trackerToken}`,
      },
      body: JSON.stringify({
        productBarcode: secondChassisBarcode,
        componentBarcode: compBarcodeCompressor, // ALREADY BOUND TO validChassisBarcode
        componentName: 'Compressor',
      }),
    });
    const dupCompData: any = await dupCompRes.json();
    assert(
      dupCompRes.status === 409,
      'Duplicate component assignment to a second product rejected with 409 Conflict'
    );
    assert(
      dupCompData.message.includes('already attached to product chassis'),
      'Clear error message details existing product binding'
    );

    // -------------------------------------------------------------
    // 5. Query Product Status After Component Tracking
    // -------------------------------------------------------------
    console.log('\n📌 5. Query Product Tracking Status...');

    const queryStateRes = await fetch(`${BASE_URL}/inventory/product-scan/${validChassisBarcode}`, {
      headers: { Authorization: `Bearer ${trackerToken}` },
    });
    const queryStateData: any = await queryStateRes.json();
    assert(
      queryStateRes.status === 200 &&
        queryStateData.data.status === 'TRACKED' &&
        queryStateData.data.attachedComponents.length === 3,
      'Product query reflects TRACKED status and lists all 3 attached components'
    );

    // -------------------------------------------------------------
    // 6. Admin Reversal of Component Tracking
    // -------------------------------------------------------------
    console.log('\n📌 6. Administrative Component Reversal & Detachment...');

    // 6.1 Non-Admin trying to reverse component tracking rejected
    const nonAdminRevRes = await fetch(`${BASE_URL}/inventory/reverse-component`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${trackerToken}`,
      },
      body: JSON.stringify({
        productBarcode: validChassisBarcode,
        componentBarcode: compBarcodePCB,
        reason: 'Incorrect PCB attached to chassis by operator',
      }),
    });
    assert(nonAdminRevRes.status === 403, 'Non-Admin blocked from reversing component tracking (403)');

    // 6.2 Reversal rejected with short/empty reason (<10 chars)
    const shortReasonRes = await fetch(`${BASE_URL}/inventory/reverse-component`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        productBarcode: validChassisBarcode,
        componentBarcode: compBarcodePCB,
        reason: 'Mistake', // Only 7 chars
      }),
    });
    assert(
      shortReasonRes.status === 422 || shortReasonRes.status === 400,
      'Reversal rejected when reason is under 10 characters (HTTP 422 Validation Error)'
    );

    // 6.3 Admin reverses Inverter PCB attachment with valid audit reason
    const validRevRes = await fetch(`${BASE_URL}/inventory/reverse-component`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        productBarcode: validChassisBarcode,
        componentBarcode: compBarcodePCB,
        reason: 'Defective inverter PCB swapped on assembly line prior to QC inspection',
      }),
    });
    const validRevData: any = await validRevRes.json();
    assert(
      validRevRes.status === 200 && validRevData.success,
      'Admin successfully reverses component tracking with audit reason'
    );
    assert(
      validRevData.data.remainingComponents.length === 2,
      'Component is detached; product now retains exactly 2 active components'
    );

    // 6.4 Re-tracking the Liberated Component Barcode
    console.log('\n📌 7. Re-Tracking Liberated Component Onto Another Chassis...');

    const retrackRes = await fetch(`${BASE_URL}/inventory/track-components`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${trackerToken}`,
      },
      body: JSON.stringify({
        productBarcode: secondChassisBarcode,
        componentBarcode: compBarcodePCB, // LIBERATED by reversal!
        componentName: 'Inverter PCB',
      }),
    });
    const retrackData: any = await retrackRes.json();
    assert(
      retrackRes.status === 200 && retrackData.success,
      'Liberated component barcode can be successfully tracked again onto another product'
    );

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`📊 COMPONENT TRACKING TEST RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('💥 Test execution error:', err);
    process.exit(1);
  }
}

runComponentTrackingTests();
