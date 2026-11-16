import mongoose from 'mongoose';
import { User } from '../src/database/models/User';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:5000/api/v1';

async function testDeactivation() {
  console.log('\n🔒 Testing Inactive User & Forced Logout Edge Cases...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/inventory_db');

  // Create a dedicated temporary user for deactivation test
  const testUserCode = `DEACT_${Date.now().toString().slice(-4)}`;
  const loginAdminRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'ADMIN01', password: 'Walton@2026' }),
  });
  const { data: adminData }: any = await loginAdminRes.json();

  // 1. Admin creates user
  await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminData.token}`,
    },
    body: JSON.stringify({
      userCode: testUserCode,
      name: 'Deactivation Target User',
      email: `${testUserCode.toLowerCase()}@waltonbd.com`,
      password: 'Password123!',
      role: 'RECEIVE_USER',
    }),
  });

  // 2. User logs in and acquires active JWT token
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: testUserCode, password: 'Password123!' }),
  });
  const { data: userData }: any = await loginRes.json();
  const userToken = userData.token;
  console.log(`✅ User ${testUserCode} logged in with valid token`);

  // 3. User verifies access to /auth/me while active
  const meBefore = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  console.log(`✅ /auth/me status before deactivation: ${meBefore.status}`);

  // 4. Admin deactivates user in DB
  await User.updateOne({ userCode: testUserCode }, { isActive: false });
  console.log(`⚠️ User ${testUserCode} marked as isActive: false in database`);

  // 5. User attempts request with the existing valid JWT -> MUST BE REJECTED 403 (Forced Logout)
  const meAfter = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const meAfterData: any = await meAfter.json();
  if (meAfter.status === 403 && meAfterData.errorCode === 'ACCOUNT_DEACTIVATED') {
    console.log('✅ PASS: Deactivated user with active JWT was FORCED LOGOUT (HTTP 403 ACCOUNT_DEACTIVATED)');
  } else {
    console.error('❌ FAIL: Deactivated user was not blocked!', meAfter.status, meAfterData);
    process.exit(1);
  }

  // 6. User attempts new login while deactivated -> MUST BE REJECTED 403
  const loginAfter = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: testUserCode, password: 'Password123!' }),
  });
  const loginAfterData: any = await loginAfter.json();
  if (loginAfter.status === 403 && loginAfterData.errorCode === 'ACCOUNT_DEACTIVATED') {
    console.log('✅ PASS: Deactivated user login rejected (HTTP 403 ACCOUNT_DEACTIVATED)');
  } else {
    console.error('❌ FAIL: Deactivated user login was not rejected!', loginAfter.status, loginAfterData);
    process.exit(1);
  }

  // Cleanup test user
  await User.deleteOne({ userCode: testUserCode });
  await mongoose.disconnect();
  console.log('✨ Deactivation and forced logout verification completed successfully!\n');
}

testDeactivation();
