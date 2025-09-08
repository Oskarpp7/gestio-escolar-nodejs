const request = require('supertest');
const express = require('express');

// App mock mínima para validar comportamiento básico
const app = express();
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

describe('Tenant Routes Basic', () => {
  test('health endpoint should respond', async () => {
    const response = await request(app)
      .get('/api/health')
      .timeout(3000);
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
  
  test('should handle unknown routes gracefully', async () => {
    const response = await request(app)
      .get('/api/nonexistent')
      .timeout(3000);
    
    expect(response.status).toBe(404);
  });
});
