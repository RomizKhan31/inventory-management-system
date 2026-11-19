const BASE_URL = 'http://localhost:5000/api/v1';

interface RoleTokenMap {
  ADMIN: string;
  COMPONENT_TRACKER: string;
  RECEIVE_USER: string;
  DELIVERY_USER: string;
  REPORT_VIEWER: string;
}

const ROLES = [
  'ADMIN',
  'COMPONENT_TRACKER',
  'RECEIVE_USER',
  'DELIVERY_USER',
  'REPORT_VIEWER',
] as const;

type RoleName = (typeof ROLES)[number];

const ROLE_CREDENTIALS: Record<RoleName, { userCode: string; pass: string }> = {
  ADMIN: { userCode: 'ADMIN01', pass: 'Walton@2026' },
  COMPONENT_TRACKER: { userCode: '66798', pass: 'Walton@2026' },
  RECEIVE_USER: { userCode: '58877', pass: 'Walton@2026' },
  DELIVERY_USER: { userCode: '54671', pass: 'Walton@2026' },
  REPORT_VIEWER: { userCode: 'VIEW01', pass: 'Walton@2026' },
};

interface TestCase {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST';
  payload?: any;
  allowedRoles: RoleName[];
}

const TEST_CASES: TestCase[] = [
  {
    name: '1. Component Tracking',
    endpoint: '/inventory/track-components',
    method: 'POST',
    payload: { productBarcode: 'RBAC_CHASSIS_99', componentBarcode: 'RBAC_COMP_99' },
    allowedRoles: ['ADMIN', 'COMPONENT_TRACKER'],
  },
  {
    name: '2. Product Receiving',
    endpoint: '/inventory/receive',
    method: 'POST',
    payload: { productBarcode: '2440701AK2057', receivePoint: 'RP-REF-01' },
    allowedRoles: ['ADMIN', 'RECEIVE_USER'],
  },
  {
    name: '3. Product Delivery',
    endpoint: '/inventory/deliver',
    method: 'POST',
    payload: { productBarcode: '2440701AK2057', deliveryPoint: 'DP-REF-01' },
    allowedRoles: ['ADMIN', 'DELIVERY_USER'],
  },
  {
    name: '4. Reversal & Correction (Admin Only)',
    endpoint: '/inventory/reverse',
    method: 'POST',
    payload: { barcode: '2440701AK2057', reason: 'Test correction reason' },
    allowedRoles: ['ADMIN'],
  },
  {
    name: '5. Master Data Management (Admin Only)',
    endpoint: '/master/products',
    method: 'POST',
    payload: {
      productCode: `TEST_PROD_${Date.now()}`,
      name: 'Test Product',
      category: 'Appliances',
    },
    allowedRoles: ['ADMIN'],
  },
  {
    name: '6. User Management (Admin Only)',
    endpoint: '/users',
    method: 'GET',
    allowedRoles: ['ADMIN'],
  },
  {
    name: '7. Reports Stock Details (Viewer & Admin)',
    endpoint: '/reports/stock-details',
    method: 'GET',
    allowedRoles: ['ADMIN', 'REPORT_VIEWER'],
  },
  {
    name: '8. System Audit Logs (Admin Only)',
    endpoint: '/reports/audit-logs',
    method: 'GET',
    allowedRoles: ['ADMIN'],
  },
];

async function runRbacMatrixTests() {
  console.log('========================================================================');
  console.log('🛡️  ROLE-BASED ACCESS CONTROL (RBAC) COMPREHENSIVE MATRIX TEST SUITE');
  console.log('========================================================================\n');

  // Step 1: Acquire tokens for all 5 roles
  console.log('🔑 Authenticating all 5 roles to acquire valid JWT session tokens...');
  const tokens: Partial<RoleTokenMap> = {};

  for (const role of ROLES) {
    const creds = ROLE_CREDENTIALS[role];
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: creds.userCode, password: creds.pass }),
    });

    const data: any = await res.json();
    if (res.status !== 200 || !data.data?.token) {
      console.error(`❌ Failed to login as role ${role}:`, data);
      process.exit(1);
    }
    tokens[role] = data.data.token;
    console.log(`   ✓ Authenticated ${role.padEnd(18)} (UserCode: ${creds.userCode})`);
  }

  console.log('\n------------------------------------------------------------------------');
  console.log('📋 Testing Every Role Against Every Restricted Endpoint');
  console.log('------------------------------------------------------------------------\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const tc of TEST_CASES) {
    console.log(`\n📌 Operation: ${tc.name} [${tc.method} ${tc.endpoint}]`);
    console.log(`   Permitted Roles: [${tc.allowedRoles.join(', ')}]`);

    // Test Unauthenticated request (no token)
    totalTests++;
    const unauthRes = await fetch(`${BASE_URL}${tc.endpoint}`, {
      method: tc.method,
      headers: { 'Content-Type': 'application/json' },
      body: tc.payload ? JSON.stringify(tc.payload) : undefined,
    });

    if (unauthRes.status === 401) {
      console.log(`   ✅ PASS: Unauthenticated request rejected (HTTP 401)`);
      passedTests++;
    } else {
      console.error(`   ❌ FAIL: Unauthenticated request returned HTTP ${unauthRes.status}`);
      failedTests++;
    }

    // Test each role
    for (const role of ROLES) {
      totalTests++;
      const token = tokens[role]!;
      const isAllowed = tc.allowedRoles.includes(role);

      let payload = tc.payload;
      if (payload && payload.componentBarcode) {
        payload = { ...payload, componentBarcode: `${payload.componentBarcode}_${role}_${Date.now()}` };
      }
      if (tc.endpoint === '/inventory/receive' && isAllowed) {
        const rbacChassis = `RBAC_RCV_${role}_${Date.now()}`;
        const rbacComp = `RBAC_RCV_COMP_${role}_${Date.now()}`;
        await fetch(`${BASE_URL}/inventory/track-components`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens.ADMIN}`,
          },
          body: JSON.stringify({
            productBarcode: rbacChassis,
            componentBarcode: rbacComp,
          }),
        });
        payload = { productBarcode: rbacChassis, receivePoint: 'RP-REF-01' };
      }
      if (tc.endpoint === '/inventory/deliver' && isAllowed) {
        const rbacChassis = `RBAC_DEL_${role}_${Date.now()}`;
        const rbacComp = `RBAC_DEL_COMP_${role}_${Date.now()}`;
        await fetch(`${BASE_URL}/inventory/track-components`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens.ADMIN}`,
          },
          body: JSON.stringify({
            productBarcode: rbacChassis,
            componentBarcode: rbacComp,
          }),
        });
        await fetch(`${BASE_URL}/inventory/receive`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens.ADMIN}`,
          },
          body: JSON.stringify({
            productBarcode: rbacChassis,
            receivePoint: 'RP-REF-01',
          }),
        });
        payload = { productBarcode: rbacChassis, deliveryPoint: 'DP-REF-01' };
      }

      const res = await fetch(`${BASE_URL}${tc.endpoint}`, {
        method: tc.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });

      const body: any = await res.json().catch(() => null);

      if (isAllowed) {
        if (res.status >= 200 && res.status < 300) {
          console.log(`   ✅ PASS: [${role.padEnd(18)}] GRANTED access (HTTP ${res.status})`);
          passedTests++;
        } else {
          console.error(
            `   ❌ FAIL: [${role.padEnd(18)}] Expected ALLOW (2xx), but got HTTP ${res.status}:`,
            body
          );
          failedTests++;
        }
      } else {
        if (res.status === 403) {
          console.log(`   ✅ PASS: [${role.padEnd(18)}] BLOCKED access (HTTP 403 Forbidden)`);
          passedTests++;
        } else {
          console.error(
            `   ❌ FAIL: [${role.padEnd(18)}] Expected 403 Forbidden, but got HTTP ${res.status}:`,
            body
          );
          failedTests++;
        }
      }
    }
  }

  console.log('\n========================================================================');
  console.log('📊 RBAC TEST MATRIX SUMMARY');
  console.log('========================================================================');
  console.log(`Total Authorization Assertions: ${totalTests}`);
  console.log(`Passed:                          ${passedTests}`);
  console.log(`Failed:                          ${failedTests}`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runRbacMatrixTests();
