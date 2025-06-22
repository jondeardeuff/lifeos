const crypto = require('crypto');
const fs = require('fs').promises;

/**
 * Security Testing Framework
 * Provides automated security testing capabilities for penetration testing
 */
class SecurityTestSuite {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:4000',
      timeout: config.timeout || 30000,
      maxAttempts: config.maxAttempts || 3,
      outputFile: config.outputFile || null,
      ...config
    };
    
    this.tests = [];
    this.results = [];
    this.registerDefaultTests();
  }
  
  /**
   * Register default security tests
   */
  registerDefaultTests() {
    // SQL Injection Tests
    this.registerTest({
      name: 'SQL Injection Protection',
      category: 'injection',
      severity: 'critical',
      description: 'Test for SQL injection vulnerabilities in GraphQL resolvers',
      test: this.testSQLInjection.bind(this)
    });
    
    // XSS Tests
    this.registerTest({
      name: 'Cross-Site Scripting Protection',
      category: 'injection',
      severity: 'high',
      description: 'Test for XSS vulnerabilities in input handling',
      test: this.testXSSProtection.bind(this)
    });
    
    // CSRF Tests
    this.registerTest({
      name: 'CSRF Protection',
      category: 'session',
      severity: 'high',
      description: 'Test CSRF protection mechanisms',
      test: this.testCSRFProtection.bind(this)
    });
    
    // Authentication Tests
    this.registerTest({
      name: 'JWT Token Security',
      category: 'authentication',
      severity: 'high',
      description: 'Test JWT token implementation security',
      test: this.testJWTSecurity.bind(this)
    });
    
    // Authorization Tests
    this.registerTest({
      name: 'Authorization Controls',
      category: 'authorization',
      severity: 'high',
      description: 'Test authorization and access controls',
      test: this.testAuthorization.bind(this)
    });
    
    // Header Security Tests
    this.registerTest({
      name: 'Security Headers',
      category: 'configuration',
      severity: 'medium',
      description: 'Test security headers implementation',
      test: this.testSecurityHeaders.bind(this)
    });
    
    // Rate Limiting Tests
    this.registerTest({
      name: 'Rate Limiting',
      category: 'availability',
      severity: 'medium',
      description: 'Test rate limiting mechanisms',
      test: this.testRateLimiting.bind(this)
    });
    
    // File Upload Tests
    this.registerTest({
      name: 'File Upload Security',
      category: 'upload',
      severity: 'high',
      description: 'Test file upload security controls',
      test: this.testFileUploadSecurity.bind(this)
    });
  }
  
  /**
   * Register a security test
   * @param {Object} test - Test definition
   */
  registerTest(test) {
    this.tests.push(test);
  }
  
  /**
   * Run all security tests
   * @returns {Promise<Array>} Test results
   */
  async runAllTests() {
    console.log(`🔍 Starting security test suite with ${this.tests.length} tests\n`);
    
    this.results = [];
    
    for (const test of this.tests) {
      try {
        console.log(`⚡ Running: ${test.name}`);
        const startTime = Date.now();
        
        const result = await test.test();
        const duration = Date.now() - startTime;
        
        const testResult = {
          ...result,
          testName: test.name,
          category: test.category,
          severity: test.severity,
          description: test.description,
          duration,
          timestamp: new Date().toISOString()
        };
        
        this.results.push(testResult);
        
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`   ${status} (${duration}ms)\n`);
        
      } catch (error) {
        console.error(`💥 Error in test ${test.name}:`, error.message);
        
        this.results.push({
          passed: false,
          findings: [`Test failed with error: ${error.message}`],
          recommendations: ['Fix test implementation or server configuration'],
          testName: test.name,
          category: test.category,
          severity: test.severity,
          duration: 0,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Save results if output file specified
    if (this.config.outputFile) {
      await this.saveResults();
    }
    
    return this.results;
  }
  
  /**
   * Test SQL injection vulnerabilities
   * @returns {Promise<Object>} Test result
   */
  async testSQLInjection() {
    const maliciousInputs = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "1' UNION SELECT * FROM users --",
      "admin'/*",
      "' OR 1=1#",
      "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --"
    ];
    
    const findings = [];
    const recommendations = [];
    
    for (const input of maliciousInputs) {
      try {
        // Test GraphQL mutation
        const result = await this.makeGraphQLRequest({
          query: `
            mutation {
              createTask(input: { title: "${input}" }) {
                id
                title
              }
            }
          `
        });
        
        // Check if malicious input was processed without errors
        if (result && result.data && result.data.createTask) {
          findings.push(`Potential SQL injection vulnerability with input: ${input.substring(0, 20)}...`);
        }
        
        // Check for SQL error messages that might leak information
        if (result && result.errors) {
          const sqlErrors = result.errors.filter(err => 
            err.message.toLowerCase().includes('sql') ||
            err.message.toLowerCase().includes('database') ||
            err.message.toLowerCase().includes('syntax')
          );
          
          if (sqlErrors.length > 0) {
            findings.push(`SQL error information disclosure: ${sqlErrors[0].message}`);
          }
        }
        
      } catch (error) {
        // Errors are expected for malicious input - this is good
      }
    }
    
    if (findings.length > 0) {
      recommendations.push('Implement parameterized queries');
      recommendations.push('Use ORM/Prisma properly to prevent SQL injection');
      recommendations.push('Add input validation and sanitization');
      recommendations.push('Implement database access controls');
    }
    
    return {
      passed: findings.length === 0,
      findings,
      recommendations
    };
  }
  
  /**
   * Test XSS protection
   * @returns {Promise<Object>} Test result
   */
  async testXSSProtection() {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      "javascript:alert('XSS')",
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<body onload=alert("XSS")>',
      '<input onfocus=alert("XSS") autofocus>'
    ];
    
    const findings = [];
    const recommendations = [];
    
    for (const payload of xssPayloads) {
      try {
        // Test task creation with XSS payload
        const result = await this.makeGraphQLRequest({
          query: `
            mutation {
              createTask(input: { 
                title: "Test Task",
                description: "${payload.replace(/"/g, '\\"')}"
              }) {
                id
                description
              }
            }
          `
        });
        
        // Check if malicious script is stored unsanitized
        if (result && result.data && result.data.createTask) {
          const description = result.data.createTask.description;
          if (description && description.includes('<script>')) {
            findings.push(`XSS vulnerability: script tag not sanitized`);
          }
          if (description && description.includes('javascript:')) {
            findings.push(`XSS vulnerability: javascript protocol not blocked`);
          }
          if (description && description.includes('onerror=')) {
            findings.push(`XSS vulnerability: event handlers not sanitized`);
          }
        }
        
      } catch (error) {
        // Input validation errors are expected and good
      }
    }
    
    if (findings.length > 0) {
      recommendations.push('Implement output encoding/escaping');
      recommendations.push('Sanitize HTML input using DOMPurify');
      recommendations.push('Use Content Security Policy (CSP)');
      recommendations.push('Validate and sanitize all user input');
    }
    
    return {
      passed: findings.length === 0,
      findings,
      recommendations
    };
  }
  
  /**
   * Test CSRF protection
   * @returns {Promise<Object>} Test result
   */
  async testCSRFProtection() {
    const findings = [];
    const recommendations = [];
    
    try {
      // Test state-changing operation without CSRF token
      const result = await this.makeRequest('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test API Key'
        })
      });
      
      // If request succeeds without CSRF token, it's vulnerable
      if (result.status === 200 || result.status === 201) {
        findings.push('CSRF protection bypassed: state-changing operation succeeded without CSRF token');
      }
      
      // Test with invalid CSRF token
      const invalidTokenResult = await this.makeRequest('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'invalid-token'
        },
        body: JSON.stringify({
          name: 'Test API Key'
        })
      });
      
      if (invalidTokenResult.status === 200 || invalidTokenResult.status === 201) {
        findings.push('CSRF protection bypassed: invalid token accepted');
      }
      
    } catch (error) {
      // Errors are expected when CSRF protection is working
    }
    
    if (findings.length > 0) {
      recommendations.push('Implement CSRF token validation for state-changing operations');
      recommendations.push('Use SameSite cookie attribute');
      recommendations.push('Implement double-submit cookie pattern');
      recommendations.push('Validate Referer header as additional protection');
    }
    
    return {
      passed: findings.length === 0,
      findings,
      recommendations
    };
  }
  
  /**
   * Test JWT security
   * @returns {Promise<Object>} Test result
   */
  async testJWTSecurity() {
    const findings = [];
    const recommendations = [];
    
    try {
      // Test with no algorithm (algorithm confusion attack)
      const noneToken = this.createMaliciousJWT('none');
      if (await this.testTokenAcceptance(noneToken)) {
        findings.push('JWT accepts "none" algorithm (algorithm confusion vulnerability)');
      }
      
      // Test with weak secret (if we can guess it)
      const weakSecrets = ['secret', '123456', 'password', 'jwt', 'key'];
      for (const secret of weakSecrets) {
        try {
          const weakToken = this.createJWTWithSecret(secret);
          if (await this.testTokenAcceptance(weakToken)) {
            findings.push(`JWT accepts weak secret: ${secret}`);
          }
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Test expired token
      const expiredToken = this.createExpiredJWT();
      if (await this.testTokenAcceptance(expiredToken)) {
        findings.push('Expired JWT tokens are being accepted');
      }
      
      // Test malformed token
      const malformedTokens = [
        'invalid.token.here',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        ''
      ];
      
      for (const token of malformedTokens) {
        if (await this.testTokenAcceptance(token)) {
          findings.push('Malformed JWT token accepted');
        }
      }
      
    } catch (error) {
      // Some errors are expected
    }
    
    if (findings.length > 0) {
      recommendations.push('Use strong JWT signing secrets (256+ bits)');
      recommendations.push('Enforce algorithm whitelist (no "none" algorithm)');
      recommendations.push('Implement proper token expiration validation');
      recommendations.push('Add token rotation/refresh mechanism');
      recommendations.push('Validate token structure and signatures properly');
    }
    
    return {
      passed: findings.length === 0,
      findings,
      recommendations
    };
  }
  
  /**
   * Test authorization controls
   * @returns {Promise<Object>} Test result
   */
  async testAuthorization() {
    const findings = [];
    const recommendations = [];
    
    try {
      // Test access to protected resources without authentication
      const unauthResult = await this.makeGraphQLRequest({
        query: `
          query {
            tasks {
              id
              title
            }
          }
        `
      });
      
      if (unauthResult && unauthResult.data && unauthResult.data.tasks) {
        findings.push('Protected endpoint accessible without authentication');
      }
      
      // Test horizontal privilege escalation (accessing other users' data)
      // This would require having test user accounts
      
      // Test vertical privilege escalation (normal user accessing admin functions)
      const adminOpResult = await this.makeGraphQLRequest({
        query: `
          query {
            analytics(startDate: "2023-01-01", endDate: "2023-12-31") {
              totalRequests
            }
          }
        `
      });
      
      // If analytics are accessible without proper authorization, it's a problem
      if (adminOpResult && adminOpResult.data && adminOpResult.data.analytics) {
        findings.push('Admin operations accessible without proper authorization');
      }
      
    } catch (error) {
      // Authorization errors are expected and good
    }
    
    if (findings.length > 0) {
      recommendations.push('Implement proper authentication checks for all protected endpoints');
      recommendations.push('Use role-based access control (RBAC)');
      recommendations.push('Validate user permissions on every request');
      recommendations.push('Implement resource-level authorization');
      recommendations.push('Add audit logging for authorization failures');
    }
    
    return {
      passed: findings.length === 0,
      findings,
      recommendations
    };
  }
  
  /**
   * Test security headers
   * @returns {Promise<Object>} Test result
   */
  async testSecurityHeaders() {
    const findings = [];
    const recommendations = [];
    
    try {
      const response = await this.makeRequest('/health');
      const headers = response.headers;
      
      // Check for required security headers
      const requiredHeaders = [
        'content-security-policy',
        'x-content-type-options',
        'x-frame-options',
        'referrer-policy'
      ];
      
      requiredHeaders.forEach(header => {
        if (!headers.get(header)) {
          findings.push(`Missing security header: ${header}`);
        }
      });
      
      // Check for removed information disclosure headers
      const unwantedHeaders = ['x-powered-by', 'server'];
      unwantedHeaders.forEach(header => {
        if (headers.get(header)) {
          findings.push(`Information disclosure header present: ${header}`);
        }
      });
      
      // Check HSTS for HTTPS
      if (this.config.baseUrl.startsWith('https') && !headers.get('strict-transport-security')) {
        findings.push('Missing HSTS header for HTTPS endpoint');
      }
      
    } catch (error) {
      findings.push(`Error testing security headers: ${error.message}`);
    }
    
    if (findings.length > 0) {
      recommendations.push('Implement all required security headers');
      recommendations.push('Remove information disclosure headers');
      recommendations.push('Configure HSTS for HTTPS');
      recommendations.push('Use helmet.js or similar security middleware');
    }
    
    return {
      passed: findings.length === 0,
      findings,
      recommendations
    };
  }
  
  /**
   * Test rate limiting
   * @returns {Promise<Object>} Test result
   */
  async testRateLimiting() {
    const findings = [];
    const recommendations = [];
    
    try {
      // Test rate limiting by making many requests quickly
      const requests = [];
      const requestCount = 50;
      
      for (let i = 0; i < requestCount; i++) {
        requests.push(this.makeRequest('/health'));
      }
      
      const responses = await Promise.allSettled(requests);
      const rateLimitedResponses = responses.filter(result => 
        result.status === 'fulfilled' && 
        (result.value.status === 429 || result.value.status === 503)
      );
      
      if (rateLimitedResponses.length === 0) {
        findings.push(`No rate limiting detected after ${requestCount} rapid requests`);
      }
      
      // Test different endpoints
      const endpointsToTest = ['/graphql', '/api/keys'];
      for (const endpoint of endpointsToTest) {
        try {
          const rapidRequests = [];
          for (let i = 0; i < 20; i++) {
            rapidRequests.push(this.makeRequest(endpoint, { method: 'POST' }));
          }
          
          const endpointResponses = await Promise.allSettled(rapidRequests);
          const endpointRateLimited = endpointResponses.filter(result =>
            result.status === 'fulfilled' &&
            (result.value.status === 429 || result.value.status === 503)
          );
          
          if (endpointRateLimited.length === 0) {
            findings.push(`No rate limiting on ${endpoint}`);
          }
        } catch (error) {
          // Some errors are expected
        }
      }
      
    } catch (error) {
      findings.push(`Error testing rate limiting: ${error.message}`);
    }
    
    if (findings.length > 0) {
      recommendations.push('Implement rate limiting for all endpoints');
      recommendations.push('Use different rate limits for different endpoint types');
      recommendations.push('Implement IP-based and user-based rate limiting');
      recommendations.push('Add rate limit headers to responses');
    }
    
    return {
      passed: findings.length === 0,
      findings,
      recommendations
    };
  }
  
  /**
   * Test file upload security
   * @returns {Promise<Object>} Test result
   */
  async testFileUploadSecurity() {
    const findings = [];
    const recommendations = [];
    
    try {
      // Test malicious file upload
      const maliciousFiles = [
        { name: 'test.php', content: '<?php echo "Hello World"; ?>', type: 'application/x-php' },
        { name: 'test.exe', content: 'MZ\x90\x00', type: 'application/octet-stream' },
        { name: 'test.js', content: 'alert("XSS")', type: 'application/javascript' },
        { name: '../../etc/passwd', content: 'root:x:0:0:', type: 'text/plain' }
      ];
      
      for (const file of maliciousFiles) {
        try {
          const formData = new FormData();
          const blob = new Blob([file.content], { type: file.type });
          formData.append('audio', blob, file.name);
          
          const result = await this.makeRequest('/api/transcribe', {
            method: 'POST',
            body: formData
          });
          
          if (result.status === 200) {
            findings.push(`Malicious file upload accepted: ${file.name}`);
          }
          
        } catch (error) {
          // Upload rejections are expected and good
        }
      }
      
      // Test oversized file
      try {
        const largeContent = 'A'.repeat(30 * 1024 * 1024); // 30MB
        const formData = new FormData();
        const blob = new Blob([largeContent], { type: 'audio/wav' });
        formData.append('audio', blob, 'large.wav');
        
        const result = await this.makeRequest('/api/transcribe', {
          method: 'POST',
          body: formData
        });
        
        if (result.status === 200) {
          findings.push('Oversized file upload accepted (30MB)');
        }
        
      } catch (error) {
        // Size limit errors are expected
      }
      
    } catch (error) {
      findings.push(`Error testing file upload: ${error.message}`);
    }
    
    if (findings.length > 0) {
      recommendations.push('Implement file type validation');
      recommendations.push('Add file size limits');
      recommendations.push('Scan uploaded files for malware');
      recommendations.push('Store uploads outside web root');
      recommendations.push('Validate file content, not just extension');
    }
    
    return {
      passed: findings.length === 0,
      findings,
      recommendations
    };
  }
  
  /**
   * Make HTTP request for testing
   * @param {string} path - Request path
   * @param {Object} options - Request options
   * @returns {Promise<Response>} Response object
   */
  async makeRequest(path, options = {}) {
    const url = `${this.config.baseUrl}${path}`;
    
    const response = await fetch(url, {
      timeout: this.config.timeout,
      ...options
    });
    
    return response;
  }
  
  /**
   * Make GraphQL request for testing
   * @param {Object} query - GraphQL query/mutation
   * @returns {Promise<Object>} GraphQL response
   */
  async makeGraphQLRequest(query) {
    const response = await this.makeRequest('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(query)
    });
    
    return await response.json();
  }
  
  /**
   * Create malicious JWT for testing
   * @param {string} algorithm - JWT algorithm
   * @returns {string} Malicious JWT
   */
  createMaliciousJWT(algorithm = 'none') {
    const header = Buffer.from(JSON.stringify({ alg: algorithm, typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ 
      sub: 'admin', 
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    })).toString('base64url');
    
    return `${header}.${payload}.`;
  }
  
  /**
   * Create JWT with weak secret
   * @param {string} secret - Weak secret
   * @returns {string} JWT with weak secret
   */
  createJWTWithSecret(secret) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ 
      sub: 'admin', 
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    })).toString('base64url');
    
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');
    
    return `${header}.${payload}.${signature}`;
  }
  
  /**
   * Create expired JWT
   * @returns {string} Expired JWT
   */
  createExpiredJWT() {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ 
      sub: 'user', 
      iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
      exp: Math.floor(Date.now() / 1000) - 3600  // 1 hour ago (expired)
    })).toString('base64url');
    
    return `${header}.${payload}.fake_signature`;
  }
  
  /**
   * Test if token is accepted by the system
   * @param {string} token - JWT token to test
   * @returns {Promise<boolean>} True if token is accepted
   */
  async testTokenAcceptance(token) {
    try {
      const result = await this.makeGraphQLRequest({
        query: `
          query {
            me {
              id
            }
          }
        `,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return !!(result && result.data && result.data.me);
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Save test results to file
   * @returns {Promise<void>}
   */
  async saveResults() {
    try {
      const report = this.generateReport();
      await fs.writeFile(this.config.outputFile, JSON.stringify({
        summary: this.getSummary(),
        results: this.results,
        report: report,
        timestamp: new Date().toISOString()
      }, null, 2));
      
      console.log(`📄 Results saved to ${this.config.outputFile}`);
    } catch (error) {
      console.error('Failed to save results:', error);
    }
  }
  
  /**
   * Get test summary
   * @returns {Object} Test summary
   */
  getSummary() {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const critical = this.results.filter(r => !r.passed && r.severity === 'critical').length;
    const high = this.results.filter(r => !r.passed && r.severity === 'high').length;
    
    return {
      total: this.results.length,
      passed,
      failed,
      successRate: Math.round((passed / this.results.length) * 100),
      criticalIssues: critical,
      highIssues: high
    };
  }
  
  /**
   * Generate security test report
   * @returns {string} Security test report
   */
  generateReport() {
    const summary = this.getSummary();
    
    let report = '🛡️  Security Penetration Test Report\n';
    report += '===================================\n\n';
    
    report += '📊 Summary:\n';
    report += `   Total Tests: ${summary.total}\n`;
    report += `   ✅ Passed: ${summary.passed}\n`;
    report += `   ❌ Failed: ${summary.failed}\n`;
    report += `   🎯 Success Rate: ${summary.successRate}%\n`;
    report += `   🚨 Critical Issues: ${summary.criticalIssues}\n`;
    report += `   ⚠️  High Issues: ${summary.highIssues}\n\n`;
    
    // Show failed tests
    const failedTests = this.results.filter(r => !r.passed);
    if (failedTests.length > 0) {
      report += '🚨 Security Issues Found:\n\n';
      
      failedTests.forEach(test => {
        const severity = test.severity.toUpperCase();
        const icon = test.severity === 'critical' ? '🚨' : test.severity === 'high' ? '⚠️' : '💛';
        
        report += `${icon} ${test.testName} (${severity})\n`;
        report += `   Category: ${test.category}\n`;
        report += `   Description: ${test.description}\n`;
        
        if (test.findings.length > 0) {
          report += '   Findings:\n';
          test.findings.forEach(finding => {
            report += `     • ${finding}\n`;
          });
        }
        
        if (test.recommendations.length > 0) {
          report += '   Recommendations:\n';
          test.recommendations.forEach(rec => {
            report += `     - ${rec}\n`;
          });
        }
        
        report += '\n';
      });
    }
    
    // Show passed tests
    const passedTests = this.results.filter(r => r.passed);
    if (passedTests.length > 0) {
      report += '✅ Security Controls Working:\n\n';
      passedTests.forEach(test => {
        report += `   ✓ ${test.testName}\n`;
      });
    }
    
    return report;
  }
}

/**
 * Security Test CLI Runner
 */
class SecurityTestCLI {
  static async run(config = {}) {
    console.log('🛡️  Starting LifeOS Security Penetration Test Suite...\n');
    
    const testSuite = new SecurityTestSuite(config);
    const results = await testSuite.runAllTests();
    
    // Generate and display report
    const report = testSuite.generateReport();
    console.log('\n' + report);
    
    const summary = testSuite.getSummary();
    
    // Exit with error code if critical or high issues found
    const criticalIssues = results.filter(r => !r.passed && (r.severity === 'critical' || r.severity === 'high'));
    
    if (criticalIssues.length > 0) {
      console.error(`\n❌ Security test failed: ${criticalIssues.length} critical/high severity issues found`);
      process.exit(1);
    } else {
      console.log(`\n✅ Security test passed: ${summary.successRate}% success rate`);
      process.exit(0);
    }
  }
}

module.exports = {
  SecurityTestSuite,
  SecurityTestCLI
};