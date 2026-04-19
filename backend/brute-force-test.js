// brute-force-test.js — Test brute force detection
const http = require('http');
const config = require('./config');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Require the server app
const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin', require('./routes/admin'));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/index.html')));
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(err.status || 500).json({ error: err.message });
});

const PORT = config.server.port;
const server = app.listen(PORT, async () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}\n`);
  console.log('🔒 Testing Brute Force Detection...\n');

  try {
    // Test 1: Normal login (success)
    console.log('1️⃣ Normal successful login...');
    let response = await makeRequest('POST', '/api/auth/login', {
      studentId: '21CS042',
      password: 'Ahmed123'
    });
    console.log(`✅ Login successful\n`);

    // Test 2: Attempt with wrong password (should fail but not block)
    console.log('2️⃣ Testing failed login attempts...');
    for (let i = 1; i <= 3; i++) {
      try {
        await makeRequest('POST', '/api/auth/login', {
          studentId: '22SE017',
          password: 'wrongpassword'
        });
      } catch (e) {
        console.log(`   Attempt ${i}: ${e.message}`);
      }
    }
    console.log(`✅ 3 failed attempts recorded\n`);

    // Test 3: 4th and 5th attempts to trigger block
    console.log('3️⃣ Triggering brute force block (attempts 4-5)...');
    for (let i = 4; i <= 5; i++) {
      try {
        await makeRequest('POST', '/api/auth/login', {
          studentId: '22SE017',
          password: 'wrongpassword'
        });
      } catch (e) {
        console.log(`   Attempt ${i}: ${e.message}`);
      }
    }
    console.log(`✅ IP should now be blocked\n`);

    // Test 4: Try to login with correct credentials (should be blocked)
    console.log('4️⃣ Testing if IP is blocked (even with correct credentials)...');
    try {
      const response = await makeRequest('POST', '/api/auth/login', {
        studentId: '22SE017',
        password: 'Sarra123'  // Correct password
      });
      console.log(`❌ FAIL: IP was NOT blocked! Login succeeded.`);
    } catch (e) {
      if (e.code === 429) {
        console.log(`✅ IP correctly blocked with 429 status`);
        console.log(`   Error: ${e.message}\n`);
      } else {
        console.log(`   Got error: ${e.message} (code: ${e.code})\n`);
      }
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Brute Force Detection Tests Complete');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
});

async function makeRequest(method, path, body = null) {
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
