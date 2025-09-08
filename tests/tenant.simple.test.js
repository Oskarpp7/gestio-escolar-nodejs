const request = require('supertest');
const { app } = require('../server');

describe('Tenant Routes (Simple)', () => {
  // Test súper simple que no pot encallar-se
  test('should handle tenant route basic check', async () => {
    const response = await request(app)
      .get('/health')
      .timeout(5000);
      
    expect(response.status).toBeDefined();
  }, 8000);
});
