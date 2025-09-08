const jwt = require('jsonwebtoken');
const { Tenant, User } = require('../src/models');

async function createTenant(attrs = {}) {
  const defaults = {
    code: 'T1234',
    name: 'Centre Test',
    short_name: 'Test',
    status: 'active',
  };
  return await Tenant.create({ ...defaults, ...attrs });
}

async function createUser(attrs = {}) {
  const defaults = {
    email: 'admin@example.com',
    password: 'Passw0rd!',
    role: 'SUPER_ADMIN',
    first_name: 'Admin',
    last_name: 'User',
    status: 'active',
    email_verified: true,
  };
  return await User.create({ ...defaults, ...attrs });
}

function makeToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenant_id || null,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

module.exports = { createTenant, createUser, makeToken };
