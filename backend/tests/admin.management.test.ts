const BASE_URL = 'http://localhost:5000/api/v1';

async function runTests() {
  console.log('========================================================================');
  console.log('🛡️  ADMIN MANAGEMENT PANEL INTEGRATION TEST SUITE (DAY 4 OF 10)');
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
    // Step 0: Acquire Auth Tokens
    // -------------------------------------------------------------
    console.log('🔑 Authenticating ADMIN and NON-ADMIN accounts...');
    
    // Admin login
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'ADMIN01', password: 'Walton@2026' }),
    });
    const adminLoginData: any = await adminLoginRes.json();
    const adminToken = adminLoginData.data.token;
    const adminId = adminLoginData.data.user.id || adminLoginData.data.user._id;

    // Component tracker login (non-admin)
    const trackerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '66798', password: 'Walton@2026' }),
    });
    const trackerLoginData: any = await trackerLoginRes.json();
    const trackerToken = trackerLoginData.data.token;

    console.log('   ✓ Admin & Tracker tokens acquired.\n');

    // -------------------------------------------------------------
    // 1. RBAC Restriction Check: Non-Admin Access Prohibited
    // -------------------------------------------------------------
    console.log('📌 1. Verifying Non-Admin Role Restrictions (HTTP 403)...');
    
    const nonAdminUserRes = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${trackerToken}` },
    });
    assert(nonAdminUserRes.status === 403, 'Non-admin blocked from GET /users (403)');

    const nonAdminProductRes = await fetch(`${BASE_URL}/master/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${trackerToken}`,
      },
      body: JSON.stringify({ productCode: 'TEST', name: 'Test' }),
    });
    assert(nonAdminProductRes.status === 403, 'Non-admin blocked from POST /master/products (403)');

    // -------------------------------------------------------------
    // 2. User Management Operations
    // -------------------------------------------------------------
    console.log('\n📌 2. User Management CRUD & Soft-Deactivation...');

    const uniqueId = Math.floor(1000 + Math.random() * 9000);
    const testUserCode = `EMP_${uniqueId}`;
    const testUserEmail = `emp${uniqueId}@waltonbd.com`;

    // 2.1 Create User
    const createUserRes = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        userCode: testUserCode,
        name: 'Tariq Rahman',
        email: testUserEmail,
        password: 'Walton@2026',
        role: 'RECEIVE_USER',
      }),
    });
    const createUserData: any = await createUserRes.json();
    assert(createUserRes.status === 201 && createUserData.success, 'Admin creates new operator user');
    const createdUserId = createUserData.data.id || createUserData.data._id;

    // 2.2 Reject Duplicate userCode
    const dupCodeRes = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        userCode: testUserCode,
        name: 'Duplicate Operator',
        email: `another${uniqueId}@waltonbd.com`,
        password: 'Walton@2026',
        role: 'DELIVERY_USER',
      }),
    });
    assert(dupCodeRes.status === 409, 'Duplicate userCode rejected with 409 Conflict');

    // 2.3 List Users with Search
    const searchUserRes = await fetch(`${BASE_URL}/users?search=${testUserCode}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const searchUserData: any = await searchUserRes.json();
    assert(
      searchUserRes.status === 200 && searchUserData.data.length === 1 && searchUserData.data[0].userCode === testUserCode,
      'Search users by userCode returns target record'
    );

    // 2.4 Edit User Information
    const updateUserRes = await fetch(`${BASE_URL}/users/${createdUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Tariq Rahman (Promoted)',
      }),
    });
    const updateUserData: any = await updateUserRes.json();
    assert(
      updateUserRes.status === 200 && updateUserData.data.name === 'Tariq Rahman (Promoted)',
      'Edit user profile information'
    );

    // 2.5 Change Role (Strict single role enforcement)
    const changeRoleRes = await fetch(`${BASE_URL}/users/${createdUserId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'DELIVERY_USER' }),
    });
    const changeRoleData: any = await changeRoleRes.json();
    assert(
      changeRoleRes.status === 200 && changeRoleData.data.role === 'DELIVERY_USER',
      'Change user single role to DELIVERY_USER'
    );

    // 2.6 Deactivate User (Soft-deactivation)
    const deactRes = await fetch(`${BASE_URL}/users/${createdUserId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: false }),
    });
    const deactData: any = await deactRes.json();
    assert(
      deactRes.status === 200 && deactData.data.isActive === false,
      'Soft-deactivate user account (isActive: false)'
    );

    // 2.7 Re-activate User
    const reactRes = await fetch(`${BASE_URL}/users/${createdUserId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: true }),
    });
    const reactData: any = await reactRes.json();
    assert(
      reactRes.status === 200 && reactData.data.isActive === true,
      'Re-activate user account (isActive: true)'
    );

    // 2.8 Prevent Admin Self-Deactivation
    const selfDeactRes = await fetch(`${BASE_URL}/users/${adminId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: false }),
    });
    assert(
      selfDeactRes.status === 400,
      'Prevent Administrator from deactivating their own account (400 Bad Request)'
    );

    // -------------------------------------------------------------
    // 3. Product Management Operations
    // -------------------------------------------------------------
    console.log('\n📌 3. Product Management CRUD & In-Use Protection...');

    const prodCode = `TV-WAL-${uniqueId}`;
    const prodBarcode = `BAR-TV-${uniqueId}`;

    // 3.1 Create Product
    const createProdRes = await fetch(`${BASE_URL}/master/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        productCode: prodCode,
        barcode: prodBarcode,
        name: 'Walton 4K Smart TV 55-inch',
        category: 'Electronics',
        modelNumber: `WTV-55-4K-${uniqueId}`,
        description: 'Ultra High Definition Android TV',
        isActive: true,
      }),
    });
    const createProdData: any = await createProdRes.json();
    assert(createProdRes.status === 201 && createProdData.success, 'Create new product master catalog item');
    const createdProductId = createProdData.data._id;

    // 3.2 Reject Duplicate Product Barcode
    const dupBarcodeRes = await fetch(`${BASE_URL}/master/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        productCode: `ANOTHER-${uniqueId}`,
        barcode: prodBarcode,
        name: 'Another Television',
        category: 'Electronics',
      }),
    });
    assert(dupBarcodeRes.status === 409, 'Duplicate product barcode rejected with 409 Conflict');

    // 3.3 Search & Paginate Products
    const listProdRes = await fetch(`${BASE_URL}/master/products?search=${prodCode}&page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listProdData: any = await listProdRes.json();
    assert(
      listProdRes.status === 200 && listProdData.data.length >= 1 && listProdData.meta.total >= 1,
      'List products with search & pagination metadata'
    );

    // 3.4 Edit Product
    const editProdRes = await fetch(`${BASE_URL}/master/products/${createdProductId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        description: 'Updated UHD 4K Smart TV with OLED panel',
      }),
    });
    const editProdData: any = await editProdRes.json();
    assert(
      editProdRes.status === 200 && editProdData.data.description === 'Updated UHD 4K Smart TV with OLED panel',
      'Edit product master information'
    );

    // 3.5 Soft Delete Product (In-use protection verification)
    const delProdRes = await fetch(`${BASE_URL}/master/products/${createdProductId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const delProdData: any = await delProdRes.json();
    assert(
      delProdRes.status === 200 && delProdData.data.isDeleted === true && delProdData.data.isActive === false,
      'Soft-delete product preserves historical record (isDeleted: true, isActive: false)'
    );

    // -------------------------------------------------------------
    // 4. Component Management Operations
    // -------------------------------------------------------------
    console.log('\n📌 4. Component Management CRUD & Barcode Uniqueness...');

    const compCode = `COMP-DISP-${uniqueId}`;
    const compBarcode = `BAR-COMP-${uniqueId}`;

    // 4.1 Create Component
    const createCompRes = await fetch(`${BASE_URL}/master/components`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        componentCode: compCode,
        barcode: compBarcode,
        name: 'OLED Display Panel',
        category: 'Display',
        specifications: '55-inch 120Hz 4K UHD Matrix',
        isActive: true,
      }),
    });
    const createCompData: any = await createCompRes.json();
    assert(createCompRes.status === 201 && createCompData.success, 'Create component master item');
    const createdCompId = createCompData.data._id;

    // 4.2 Reject Duplicate Component Barcode
    const dupCompBarRes = await fetch(`${BASE_URL}/master/components`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        componentCode: `COMP-OTHER-${uniqueId}`,
        barcode: compBarcode,
        name: 'Duplicate Component',
      }),
    });
    assert(dupCompBarRes.status === 409, 'Prevent duplicate component barcode with 409 Conflict');

    // 4.3 Edit Component
    const editCompRes = await fetch(`${BASE_URL}/master/components/${createdCompId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ specifications: '144Hz High Refresh OLED Panel' }),
    });
    const editCompData: any = await editCompRes.json();
    assert(
      editCompRes.status === 200 && editCompData.data.specifications === '144Hz High Refresh OLED Panel',
      'Edit component specifications'
    );

    // 4.4 Soft Delete Component
    const delCompRes = await fetch(`${BASE_URL}/master/components/${createdCompId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const delCompData: any = await delCompRes.json();
    assert(
      delCompRes.status === 200 && delCompData.data.isDeleted === true,
      'Component soft-deleted safely'
    );

    // -------------------------------------------------------------
    // 5. Receive Point & Delivery Point Management
    // -------------------------------------------------------------
    console.log('\n📌 5. Receive & Delivery Points CRUD & Deactivation...');

    const rpCode = `RP-WH3-${uniqueId}`;
    const dpCode = `DP-OUT-${uniqueId}`;

    // 5.1 Create Receive Point
    const createRpRes = await fetch(`${BASE_URL}/master/receive-points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        pointCode: rpCode,
        name: 'Intake Bay 3 (Electronics)',
        location: 'Building C Dock 4',
        isActive: true,
      }),
    });
    const createRpData: any = await createRpRes.json();
    assert(createRpRes.status === 201 && createRpData.success, 'Create receive point');
    const createdRpId = createRpData.data._id;

    // 5.2 Edit & Soft-Deactivate Receive Point
    const editRpRes = await fetch(`${BASE_URL}/master/receive-points/${createdRpId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ location: 'Building C Dock 4 (Expanded)' }),
    });
    const editRpData: any = await editRpRes.json();
    assert(editRpRes.status === 200 && editRpData.data.location === 'Building C Dock 4 (Expanded)', 'Edit receive point location');

    const delRpRes = await fetch(`${BASE_URL}/master/receive-points/${createdRpId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delRpRes.status === 200, 'Soft-deactivate receive point');

    // 5.3 Create Delivery Point
    const createDpRes = await fetch(`${BASE_URL}/master/delivery-points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        pointCode: dpCode,
        name: 'Outbound Logistics Dock 2',
        location: 'Gate 2 - Highway Express',
        isActive: true,
      }),
    });
    const createDpData: any = await createDpRes.json();
    assert(createDpRes.status === 201 && createDpData.success, 'Create delivery point');
    const createdDpId = createDpData.data._id;

    // 5.4 Edit & Soft-Deactivate Delivery Point
    const editDpRes = await fetch(`${BASE_URL}/master/delivery-points/${createdDpId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ location: 'Gate 2 - Highway Express (Bay B)' }),
    });
    assert(editDpRes.status === 200, 'Edit delivery point location');

    const delDpRes = await fetch(`${BASE_URL}/master/delivery-points/${createdDpId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delDpRes.status === 200, 'Soft-deactivate delivery point');

    // -------------------------------------------------------------
    // 6. Master Stats & Audit Log Verification
    // -------------------------------------------------------------
    console.log('\n📌 6. Master Statistics & Immutable Audit Logging...');

    // 6.1 Overview Stats
    const statsRes = await fetch(`${BASE_URL}/master/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statsData: any = await statsRes.json();
    assert(
      statsRes.status === 200 &&
        statsData.data.products.total >= 1 &&
        statsData.data.components.total >= 1 &&
        statsData.data.receivePoints.total >= 1 &&
        statsData.data.deliveryPoints.total >= 1 &&
        statsData.data.users.total >= 1,
      'Retrieve aggregated master data overview statistics'
    );

    // 6.2 Query Audit Logs
    const auditRes = await fetch(`${BASE_URL}/reports/audit-logs?search=${testUserCode}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditData: any = await auditRes.json();
    assert(
      auditRes.status === 200 && auditData.data.length >= 1,
      'Audit log recorded user operations with timestamp and responsible user'
    );

    const firstAudit = auditData.data[0];
    assert(
      firstAudit.userCode === 'ADMIN01' && (firstAudit.newValues !== undefined || firstAudit.previousValues !== undefined),
      'Audit log entry captures previous/new values and responsible admin'
    );

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`📊 ADMIN MANAGEMENT TEST RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('💥 Test execution error:', err);
    process.exit(1);
  }
}

runTests();
