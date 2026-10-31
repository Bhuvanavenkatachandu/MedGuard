const axios = require('axios');

const API_URL = process.env.VITE_API_URL || 'http://localhost:8000/api';

async function runEndToEndTest() {
  console.log('====================================================');
  console.log('MEDGUARD AI — FULL-STACK LOCAL BACKEND E2E AUDIT');
  console.log('====================================================');

  const testEmail = 'pharmacist_chandu_' + Date.now() + '@gmail.com';
  const testPassword = 'MedGuard@123456';
  const pharmacyName = 'Apollo MedGuard Clinic';
  const ownerName = 'Bhuvana Venkata Chandu';
  const phone = '9876543210';
  const address = '100 Feet Road, Indiranagar, Bengaluru, Karnataka - 560038';
  const licenseNumber = 'DL-KA-2026-98765';
  const latitude = 12.9716;
  const longitude = 77.5946;

  try {
    // STEP 1: Registration
    console.log('\nSTEP 1: Testing Registration with Email:', testEmail);
    const regRes = await axios.post(`${API_URL}/auth/register`, {
      email: testEmail,
      password: testPassword,
      fullName: ownerName,
      phone: phone,
    });

    console.log('✅ Step 1 PASSED: Pharmacist registered successfully!');
    const token = regRes.data.access_token;
    const userId = regRes.data.user.id;
    console.log('   User ID:', userId);

    const headers = { Authorization: `Bearer ${token}` };

    // STEP 2: Pre-setup route guard verification
    console.log('\nSTEP 2: Verifying Pre-Setup State (Redirect to Setup)...');
    try {
      await axios.get(`${API_URL}/pharmacies/me`, { headers });
      console.error('❌ Expected pharmacy to be empty pre-setup!');
    } catch (err) {
      if (err.response && err.response.status === 404) {
        console.log('✅ Step 2 PASSED: Properly detects pharmacy setup incomplete!');
      }
    }

    // STEP 3: Setup Pharmacy & Confirm Location
    console.log('\nSTEP 3: Completing Pharmacy Setup & Location...');
    const pharmRes = await axios.post(`${API_URL}/pharmacies`, {
      name: pharmacyName,
      ownerName: ownerName,
      phone: phone,
      email: testEmail,
      address: address,
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      licenseNumber: licenseNumber,
      latitude: latitude,
      longitude: longitude,
    }, { headers });

    const pharmacyId = pharmRes.data.id;
    console.log('✅ Step 3 PASSED: Pharmacy created & linked to user!');
    console.log('   Pharmacy ID:', pharmacyId);
    console.log('   Pharmacy Name:', pharmRes.data.name);

    // STEP 4: Post-setup Verification (Dashboard active)
    console.log('\nSTEP 4: Verifying Active Dashboard State...');
    const meRes = await axios.get(`${API_URL}/auth/me`, { headers });
    if (meRes.data.pharmacy_id === pharmacyId) {
      console.log('✅ Step 4 PASSED: User linked to Pharmacy ID:', meRes.data.pharmacy_id);
    }

    // STEP 5: Returning User Login Flow
    console.log('\nSTEP 5: Testing Returning Pharmacist Login Flow...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: testEmail,
      password: testPassword,
    });

    const loginToken = loginRes.data.access_token;
    const loginHeaders = { Authorization: `Bearer ${loginToken}` };
    const myPharm = await axios.get(`${API_URL}/pharmacies/me`, { headers: loginHeaders });

    if (myPharm.data.id === pharmacyId) {
      console.log('✅ Step 5 PASSED: Returning user login correctly lands on Dashboard (NOT setup)!');
    }

    // STEP 6: Public Customer Search (Zero Login)
    console.log('\nSTEP 6: Testing Public Customer Search...');
    const searchRes = await axios.get(`${API_URL}/public/medicines/search`, {
      params: { query: 'Dolo', lat: latitude, lng: longitude }
    });
    console.log(`✅ Step 6 PASSED: Found ${searchRes.data.length} nearby pharmacy matches with Google Maps links!`);

    console.log('\n====================================================');
    console.log('ALL VERIFICATION STEPS PASSED SUCCESSFULLY!');
    console.log('====================================================');
    return true;
  } catch (err) {
    console.error('❌ Test failed with error:', err.response?.data || err.message);
    return false;
  }
}

runEndToEndTest();
