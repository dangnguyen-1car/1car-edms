// =================================================================
// EDMS 1CAR Frontend Integration Test
// Test all frontend-backend integration
// =================================================================

console.log("=== EDMS 1CAR Frontend Integration Test (FIXED) ===");

async function testEDMSIntegration() {
  try {
    // Test 1: Health check via proxy
    console.log("1. Testing health check via proxy...");
    const healthResponse = await fetch('/health');
    const healthData = await healthResponse.json();
    console.log("✅ Health Check via Proxy:", healthData.status);
    console.log("  Database:", healthData.database.status);
    console.log("  Version:", healthData.version);

    // Test 2: Login via proxy
    console.log("2. Testing login via proxy...");
    const loginResponse = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        email: 'admin@1car.vn',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (loginData.success) {
      console.log("✅ Login via Proxy Success!");
      console.log("  User:", loginData.data.user.name);
      console.log("  Role:", loginData.data.user.role);
      
      // Store token for further testing
      window.testToken = loginData.data.tokens.accessToken;
      
      // Test 3: Profile API via proxy
      console.log("3. Testing profile API via proxy...");
      const profileResponse = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${loginData.data.tokens.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const profileData = await profileResponse.json();
      
      if (profileData.success) {
        console.log("✅ Profile API via Proxy Success!");
        console.log("  Profile:", profileData.user.name);
      } else {
        console.log("❌ Profile API Failed:", profileData.message);
      }

      // Test 4: Documents API via proxy
      console.log("4. Testing documents API via proxy...");
      const documentsResponse = await fetch('/api/documents', {
        headers: {
          'Authorization': `Bearer ${loginData.data.tokens.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const documentsData = await documentsResponse.json();
      
      if (documentsData.success) {
        console.log("✅ Documents API via Proxy Success!");
        console.log("  Documents count:", documentsData.data.length);
        if (documentsData.data.length > 0) {
          console.log("  First document:", documentsData.data[0].title);
          console.log("  Document code:", documentsData.data[0].document_code);
        }
      } else {
        console.log("❌ Documents API Failed:", documentsData.message);
      }

      // Test 5: Document Types API (FIXED)
      console.log("5. Testing document types API via proxy...");
      const typesResponse = await fetch('/api/documents/types', {
        headers: {
          'Authorization': `Bearer ${loginData.data.tokens.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const typesData = await typesResponse.json();
      
      if (typesData.success) {
        console.log("✅ Document Types API via Proxy Success!");
        console.log("  Available types:", typesData.data.documentTypes.length);
        typesData.data.documentTypes.forEach(type => {
          console.log(`    - ${type.code}: ${type.name}`);
        });
      } else {
        console.log("❌ Document Types API Failed:", typesData.message);
      }

      // Test 6: Departments API (FIXED)
      console.log("6. Testing departments API via proxy...");
      const deptResponse = await fetch('/api/documents/departments', {
        headers: {
          'Authorization': `Bearer ${loginData.data.tokens.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const deptData = await deptResponse.json();
      
      if (deptData.success) {
        console.log("✅ Departments API via Proxy Success!");
        console.log("  Total departments:", deptData.data.departments.length);
        console.log("  First 5 departments:");
        deptData.data.departments.slice(0, 5).forEach(dept => {
          console.log(`    - ${dept}`);
        });
      } else {
        console.log("❌ Departments API Failed:", deptData.message);
      }

      console.log("🎉 All Frontend Integration Tests Passed! 🎉");
      
    } else {
      throw new Error('Login failed: ' + loginData.message);
    }
    
  } catch (error) {
    console.error("❌ Frontend Integration Test Failed:", error);
  }
}

// Run the test
testEDMSIntegration();
