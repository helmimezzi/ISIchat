// test-api.js — Comprehensive API testing script
const http = require('http');
const config = require('./config');
const { getDb } = require('./config/database');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Require the server app
const app = express();

// ── CORS ──────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));

// ── Parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ── Logging ───────────────────────────────────────────────
app.use(morgan('dev'));

// ── Fichiers statiques (frontend) ────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Routes API ────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin',    require('./routes/admin'));

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', phase: 1 });
});

// ── SPA fallback ──────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/index.html'));
});

// ── Gestion erreurs globale ───────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(err.status || 500).json({ error: err.message });
});

// ── Démarrage ─────────────────────────────────────────────
const PORT = config.server.port;
const server = app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════╗
║  CampusMsg v1.0 — Phase 1 (Core)      ║
║  Serveur : http://localhost:${PORT}       ║
╚═══════════════════════════════════════╝
  `);

  // Run tests
  await runTests();
  process.exit(0);
});

// Test suite
let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

async function runTests() {
  console.log('\n\n📋 Starting API Tests...\n');

  // Test 1: Health check
  await test('GET /api/health', async () => {
    const data = await makeRequest('GET', '/api/health');
    return data.status === 'ok';
  });

  // Test 2: Login with valid credentials
  let token = null;
  await test('POST /api/auth/login (Valid credentials)', async () => {
    const data = await makeRequest('POST', '/api/auth/login', {
      studentId: '21CS042',
      password: 'Ahmed123'
    });
    if (data.token && data.user) {
      token = data.token;
      return true;
    }
    return false;
  });

  // Test 3: Login with invalid password
  await test('POST /api/auth/login (Invalid password)', async () => {
    try {
      await makeRequest('POST', '/api/auth/login', {
        studentId: '21CS042',
        password: 'wrongpassword'
      });
      return false; // Should have thrown
    } catch (e) {
      return e.message.includes('Identifiants');
    }
  });

  // Test 4: Login with non-existent user
  await test('POST /api/auth/login (Non-existent user)', async () => {
    try {
      await makeRequest('POST', '/api/auth/login', {
        studentId: 'INVALID',
        password: 'anypassword'
      });
      return false;
    } catch (e) {
      return e.message.includes('Identifiants');
    }
  });

  // Test 5: GET /api/auth/me
  await test('GET /api/auth/me (Authenticated)', async () => {
    const data = await makeRequest('GET', '/api/auth/me', null, token);
    return data.user && data.user.studentId === '21CS042';
  });

  // Test 6: Search users
  await test('GET /api/messages/users/search', async () => {
    const data = await makeRequest('GET', '/api/messages/users/search', null, token);
    return Array.isArray(data.students) && data.students.length > 0;
  });

  // Test 7: Get inbox
  await test('GET /api/messages/inbox', async () => {
    const data = await makeRequest('GET', '/api/messages/inbox', null, token);
    return Array.isArray(data.messages) && 'unread' in data;
  });

  // Test 8: Get sent
  await test('GET /api/messages/sent', async () => {
    const data = await makeRequest('GET', '/api/messages/sent', null, token);
    return Array.isArray(data.messages);
  });

  // Test 9: Get conversations
  await test('GET /api/messages/conversations', async () => {
    const data = await makeRequest('GET', '/api/messages/conversations', null, token);
    return Array.isArray(data.conversations);
  });

  // Test 10: Send message
  let messageId = null;
  await test('POST /api/messages (Send message)', async () => {
    const data = await makeRequest('POST', '/api/messages', {
      receiverStudentId: '22SE017',
      subject: 'Test Subject',
      body: 'This is a test message'
    }, token);
    if (data.id) {
      messageId = data.id;
      return true;
    }
    return false;
  });

  // Test 11: Get single message
  if (messageId) {
    await test(`GET /api/messages/${messageId}`, async () => {
      const data = await makeRequest('GET', `/api/messages/${messageId}`, null, token);
      return data.message && data.message.id === messageId;
    });
  }

  // Test 12: Admin login
  let adminToken = null;
  await test('POST /api/auth/login (Admin)', async () => {
    const data = await makeRequest('POST', '/api/auth/login', {
      studentId: 'ADMIN001',
      password: 'Admin123'
    });
    if (data.token && data.user && data.user.isAdmin) {
      adminToken = data.token;
      return true;
    }
    return false;
  });

  // Test 13: Admin dashboard
  if (adminToken) {
    await test('GET /api/admin/dashboard', async () => {
      const data = await makeRequest('GET', '/api/admin/dashboard', null, adminToken);
      return 'students' in data && 'messages' in data;
    });
  }

  // Test 14: Get alerts
  if (adminToken) {
    await test('GET /api/admin/alerts', async () => {
      const data = await makeRequest('GET', '/api/admin/alerts', null, adminToken);
      return Array.isArray(data.alerts);
    });
  }

  // Test 15: Get students
  if (adminToken) {
    await test('GET /api/admin/students', async () => {
      const data = await makeRequest('GET', '/api/admin/students', null, adminToken);
      return Array.isArray(data.students);
    });
  }

  // Test 16: Edit message
  if (messageId && token) {
    await test(`PATCH /api/messages/${messageId} (Edit message)`, async () => {
      const data = await makeRequest('PATCH', `/api/messages/${messageId}`, {
        body: 'This is an edited message'
      }, token);
      return data.message && data.message.is_edited === 1;
    });
  }

  // Test 17: Send message with image
  await test('POST /api/messages (With image)', async () => {
    const imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const data = await makeRequest('POST', '/api/messages', {
      receiverStudentId: '23IRS008',
      subject: 'Message with image',
      body: 'Check this image',
      imageData: imageData
    }, token);
    return !!data.id;
  });

  // Test 18: Unauthorized access without token
  await test('GET /api/messages/inbox (No token)', async () => {
    try {
      await makeRequest('GET', '/api/messages/inbox', null, null);
      return false;
    } catch (e) {
      return e.message.includes('Non authentifié') || e.code === 401;
    }
  });

  // Test 19: Admin only endpoint (non-admin)
  let studentToken = token;
  await test('GET /api/admin/dashboard (Non-admin)', async () => {
    try {
      await makeRequest('GET', '/api/admin/dashboard', null, studentToken);
      return false;
    } catch (e) {
      return e.code === 403;
    }
  });

  // Test 20: Message with missing receiver
  await test('POST /api/messages (Invalid receiver)', async () => {
    try {
      await makeRequest('POST', '/api/messages', {
        receiverStudentId: 'NONEXISTENT',
        body: 'Test'
      }, token);
      return false;
    } catch (e) {
      return e.message.includes('introuvable');
    }
  });

  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Detailed Results:');
  testResults.forEach(r => {
    const status = r.passed ? '✅' : '❌';
    console.log(`${status} ${r.name}`);
    if (!r.passed && r.error) {
      console.log(`   Error: ${r.error}`);
    }
  });
}

async function test(name, fn) {
  try {
    const result = await fn();
    if (result) {
      testsPassed++;
      testResults.push({ name, passed: true });
      console.log(`✅ ${name}`);
    } else {
      testsFailed++;
      testResults.push({ name, passed: false, error: 'Assertion failed' });
      console.log(`❌ ${name}`);
    }
  } catch (err) {
    testsFailed++;
    testResults.push({ name, passed: false, error: err.message });
    console.log(`❌ ${name} - ${err.message}`);
  }
}

async function makeRequest(method, path, body = null, authToken = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            const err = new Error(parsed.error || 'Request failed');
            err.code = res.statusCode;
            reject(err);
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}
