const BASE_URL = 'http://localhost:5000/api/v1';

async function runTests() {
  console.log('🧪 Starting Authentication Module Automated Test Suite...\n');
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
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    assert(healthRes.status === 200, 'Health check returns 200');

    // 2. Valid Login with userCode (ADMIN01)
    const loginAdminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'ADMIN01', password: 'Walton@2026' }),
    });
    const loginAdminData: any = await loginAdminRes.json();
    assert(
      loginAdminRes.status === 200 && loginAdminData.success && loginAdminData.data?.token,
      'Valid Login with User Code (ADMIN01)'
    );
    const adminToken = loginAdminData.data?.token;

    // 3. Valid Login with Email (Component Tracker)
    const loginTrackerRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'tracker66798@waltonbd.com', password: 'Walton@2026' }),
    });
    const loginTrackerData: any = await loginTrackerRes.json();
    assert(
      loginTrackerRes.status === 200 && loginTrackerData.data?.user?.role === 'COMPONENT_TRACKER',
      'Valid Login with Email (tracker66798@waltonbd.com)'
    );
    const trackerToken = loginTrackerData.data?.token;

    // 4. Invalid Password
    const badPassRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'ADMIN01', password: 'WrongPassword123' }),
    });
    const badPassData: any = await badPassRes.json();
    assert(badPassRes.status === 401 && !badPassData.success, 'Invalid Password returns 401');

    // 5. Non-existent User
    const unknownUserRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'UNKNOWN_USER_999', password: 'Walton@2026' }),
    });
    assert(unknownUserRes.status === 401, 'Non-existent user returns 401');

    // 6. Missing Token on Protected Route (/auth/me)
    const noTokenRes = await fetch(`${BASE_URL}/auth/me`);
    const noTokenData: any = await noTokenRes.json();
    assert(
      noTokenRes.status === 401 && noTokenData.errorCode === 'TOKEN_MISSING',
      'Missing Token on /auth/me returns 401 TOKEN_MISSING'
    );

    // 7. Malformed Token on Protected Route
    const malformedTokenRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer this_is_not_a_valid_jwt' },
    });
    const malformedTokenData: any = await malformedTokenRes.json();
    assert(
      malformedTokenRes.status === 401 && malformedTokenData.errorCode === 'TOKEN_INVALID',
      'Malformed Token returns 401 TOKEN_INVALID'
    );

    // 8. Valid Token on GET /auth/me
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const meData: any = await meRes.json();
    assert(
      meRes.status === 200 && meData.data?.userCode === 'ADMIN01' && !('passwordHash' in meData.data),
      'GET /auth/me returns sanitized user profile without passwordHash'
    );

    // 9. Unauthorized Role Access: Component Tracker attempts Admin Register
    const unauthRoleRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${trackerToken}`,
      },
      body: JSON.stringify({
        userCode: 'TEST01',
        name: 'Test Operator',
        email: 'test01@waltonbd.com',
        password: 'Password123!',
        role: 'RECEIVE_USER',
      }),
    });
    assert(
      unauthRoleRes.status === 403,
      'Non-admin role attempting Admin Registration returns 403 Forbidden'
    );

    // 10. Admin creates new user
    const newUserCode = `OP_${Date.now().toString().slice(-4)}`;
    const adminRegisterRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        userCode: newUserCode,
        name: 'Assembly Operator',
        email: `${newUserCode.toLowerCase()}@waltonbd.com`,
        password: 'Password123!',
        role: 'RECEIVE_USER',
      }),
    });
    const adminRegisterData: any = await adminRegisterRes.json();
    assert(
      adminRegisterRes.status === 201 && adminRegisterData.data?.userCode === newUserCode,
      `Admin successfully registers new user (${newUserCode})`
    );

    // 11. Login as the newly created user
    const loginNewRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: newUserCode, password: 'Password123!' }),
    });
    const loginNewData: any = await loginNewRes.json();
    assert(
      loginNewRes.status === 200 && loginNewData.data?.user?.userCode === newUserCode,
      'Newly registered user can log in'
    );
    const newUserToken = loginNewData.data?.token;

    // 12. Password Change for new user
    const changePassRes = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newUserToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'Password123!',
        newPassword: 'NewPassword2026@',
      }),
    });
    assert(changePassRes.status === 200, 'Password changed successfully');

    // 13. Verify old password no longer works
    const oldPassRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: newUserCode, password: 'Password123!' }),
    });
    assert(oldPassRes.status === 401, 'Old password rejected after password change');

    // 14. Verify new password works
    const newPassLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: newUserCode, password: 'NewPassword2026@' }),
    });
    assert(newPassLoginRes.status === 200, 'New password accepted for login');

    // 15. User Logout
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(logoutRes.status === 200, 'User Logout returns 200 OK');

    // 16. CORS Validation: Server self origin (Swagger UI on port 5000) allowed
    const corsSwaggerRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5000',
        'Access-Control-Request-Method': 'POST',
      },
    });
    assert(
      corsSwaggerRes.status === 204 &&
        corsSwaggerRes.headers.get('access-control-allow-origin') === 'http://localhost:5000',
      'CORS: Swagger UI origin (http://localhost:5000) permitted with preflight 204'
    );

    // 17. CORS Validation: Frontend origin (http://localhost:3000) allowed
    const corsFrontendRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
      },
    });
    assert(
      corsFrontendRes.status === 204 &&
        corsFrontendRes.headers.get('access-control-allow-origin') === 'http://localhost:3000',
      'CORS: Frontend origin (http://localhost:3000) permitted with preflight 204'
    );

    // 18. CORS Validation: Untrusted origin blocked with HTTP 403 (not 500)
    const corsUntrustedRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        Origin: 'http://untrusted-malicious-site.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier: 'ADMIN01', password: 'Walton@2026' }),
    });
    const corsUntrustedData: any = await corsUntrustedRes.json();
    assert(
      corsUntrustedRes.status === 403 && corsUntrustedData.errorCode === 'CORS_FORBIDDEN',
      'CORS: Untrusted origin rejected with HTTP 403 Forbidden (not 500 Internal Error)'
    );

    console.log(`\n========================================`);
    console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
