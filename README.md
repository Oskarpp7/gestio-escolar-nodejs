# 🏫 **MouT Serveis - Gestió Escolar Multi-tenant**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18+-blue.svg)](https://expressjs.com/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.0+-green.svg)](https://vuejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://postgresql.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.7+-black.svg)](https://socket.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 **Descripció**

**MouT Serveis** és un sistema complet de gestió escolar multi-tenant especialitzat en serveis de **menjador** i **acollida** per centres educatius. Ofereix una solució integral amb **preus variables per escola**, **gestió de contractes**, **control d'assistència en temps real** i **comunicació directa entre famílies i monitors**.

### 🎯 **Funcionalitats Principals**

- **🏢 Multi-tenant:** Gestió independent per cada centre educatiu
- **💰 Preus Variables:** Configuració flexible per escola i servei
- **📋 Contractes Intel·ligents:** FIXE vs ESPORÀDIC amb beques BC70/BC100
- **📊 Assistència en Temps Real:** Control diari amb facturació automàtica
- **💬 Chat Integrat:** Comunicació famílies ↔ monitors ↔ administració
- **📱 PWA Ready:** Aplicació web progressiva per mòbils
- **🔐 Seguretat Avançada:** JWT + role-based permissions

---

## 🚀 **Instal·lació Ràpida**

### **Prerequisits**
```bash
Node.js >= 18.0.0
PostgreSQL >= 14.0 (producció) o SQLite (desenvolupament)
Git
```

### **1️⃣ Clona el Repositori**
```bash
git clone https://github.com/Oskarpp7/gestio-escolar-nodejs.git
cd gestio-escolar-nodejs
```

### **2️⃣ Instal·la Dependències**
```bash
# Backend
npm install

# Frontend (client)
cd client
npm install
cd ..
```

### **3️⃣ Configuració Variables d'Entorn**
```bash
# Còpia plantilla i edita
cp .env.example .env

# Edita les variables necessàries
nano .env
```

### **4️⃣ Configura Base de Dades**
```bash
# Desenvolupament (SQLite automàtic)
npm run dev

# Producció (PostgreSQL)
npm run migrate:prod
npm run seed:prod
```

### **5️⃣ Executa el Projecte**
```bash
# Desenvolupament
npm run dev

# Producció
npm start
```

🎉 **Accessible a:** `http://localhost:3000`

---

## 🏗️ **Arquitectura del Sistema**

### **Stack Tecnològic**
```
├── Backend
│   ├── Node.js 18+ + Express.js
│   ├── Sequelize ORM + PostgreSQL/SQLite
│   ├── Socket.io (temps real)
│   ├── JWT Authentication
│   └── Winston Logging
│
├── Frontend
│   ├── Vue.js 3 + Composition API
│   ├── Tailwind CSS + Chart.js
│   ├── PWA + Service Workers
│   └── Socket.io Client
│
└── Deploy
    ├── PM2 + GitHub Actions
    ├── cPanel Compatible
    └── SSL + Domain Ready
```

### **Estructura de Directoris**
```
gestio-escolar-nodejs/
├── src/                    # Backend Node.js
│   ├── models/            # Models Sequelize
│   ├── routes/            # API Routes
│   ├── middleware/        # Auth + Tenant
│   ├── socket/            # Socket.io handlers
│   └── utils/             # Utilitats + Logger
├── client/                # Frontend Vue.js
│   ├── src/components/    # Components Vue
│   ├── src/views/         # Pàgines
│   ├── src/stores/        # Pinia stores
│   └── public/            # Assets estàtics
├── config/                # Configuració
├── migrations/            # Migracions BD
├── seeders/               # Dades inicials
└── docs/                  # Documentació
```

---

## 🔧 **Configuració Detallada**

### **Variables d'Entorn (.env)**
```bash
# === SERVIDOR ===
NODE_ENV=development
PORT=3000
DOMAIN=localhost

# === BASE DE DADES ===
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gestio_escolar
DB_USER=your_user
DB_PASS=your_password

# === SEGURETAT ===
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# === EMAIL (opcional) ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password

# === LOGGING ===
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### **Configuració Base de Dades**

#### **Desenvolupament (SQLite)**
```bash
# Automàtic - no cal configuració
npm run dev
```

#### **Producció (PostgreSQL)**
```bash
# Crear base de dades
createdb gestio_escolar

# Executar migracions
npm run migrate:prod

# Inserir dades inicials
npm run seed:prod
```

---

## 🎮 **Ús del Sistema**

### **Sistema de Rols**
1. **SUPER_ADMIN:** Configuració global, preus, escoles
2. **ADMIN:** Gestió completa del centre
3. **COORDINADOR:** Supervisió operativa
4. **MONITOR:** Registre assistència diària
5. **FAMILIA:** Consulta contractes i comunicació

### **Flux de Treball Típic**

#### **1. Configuració Inicial (SUPER_ADMIN)**
```bash
# Crear centre educatiu
POST /api/tenants
{
  "name": "CEIP Exemple",
  "code": "M5544",
  "address": "Carrer Exemple 123"
}

# Configurar preus personalitzats
PUT /api/tenants/M5544/pricing
{
  "menjador_fixe": 7.54,
  "menjador_esporadic": 3.86,
  "acollida_hora": 4.50
}
```

#### **2. Gestió Contractes (ADMIN/COORDINADOR)**
```bash
# Crear contracte estudiant
POST /api/contracts
{
  "student_id": "uuid",
  "type": "FIXE",
  "has_menjador": true,
  "has_acollida": true,
  "menjador_days": ["monday", "tuesday", "wednesday"],
  "acollida_hours": 2,
  "scholarship_type": "BC70"
}
```

#### **3. Registre Assistència (MONITOR)**
```bash
# Registrar assistència diària
POST /api/attendance
{
  "contract_id": "uuid",
  "date": "2025-09-08",
  "service_type": "MENJADOR",
  "status": "PRESENT"
}
```

### **Sistema de Comunicació**
- **Chat temps real** entre rols
- **Notificacions automàtiques** per assistència
- **Alerts** per facturació i pagaments

---

## 🔐 **Seguretat i Autenticació**

### **Sistema JWT**
```javascript
// Login amb codi escola
POST /api/auth/login
{
  "email": "familia@exemple.com",
  "password": "password123",
  "school_code": "M5544"
}

// Resposta amb tokens
{
  "access_token": "jwt_token",
  "refresh_token": "refresh_token",
  "user": { ... },
  "tenant": { ... }
}
```

### **Middleware Multi-tenant**
- **Aïllament total** de dades per escola
- **Verificació automàtica** de permisos
- **Auditoria completa** d'accions

---

## 📊 **API Endpoints**

### **Autenticació**
```
POST   /api/auth/login           # Login usuari
POST   /api/auth/refresh         # Renovar token
POST   /api/auth/logout          # Logout
GET    /api/auth/me              # Perfil usuari
```

### **Gestió Usuaris**
```
GET    /api/users               # Llistar usuaris
POST   /api/users               # Crear usuari
PUT    /api/users/:id           # Actualitzar usuari
DELETE /api/users/:id           # Eliminar usuari
```

### **Contractes**
```
GET    /api/contracts           # Llistar contractes
POST   /api/contracts           # Crear contracte
PUT    /api/contracts/:id       # Actualitzar contracte
GET    /api/contracts/:id/pricing # Calcular preus
```

### **Assistència**
```
GET    /api/attendance          # Llistar assistència
POST   /api/attendance          # Registrar assistència
GET    /api/attendance/daily/:date # Vista diària
PUT    /api/attendance/:id      # Actualitzar registre
```

---

## 🚀 **Deploy i Producció**

### **Deploy Automàtic (GitHub Actions)**
```yaml
# .github/workflows/deploy.yml
# Push a main -> Deploy automàtic
git push origin main
```

### **Deploy Manual**
```bash
# Construir client
cd client && npm run build

# Configurar PM2
pm2 start ecosystem.config.js

# Nginx proxy (si cal)
nginx -s reload
```

### **Monitoratge**
```bash
# Logs en temps real
pm2 logs mout-serveis

# Estat aplicació
pm2 status

# Restart si cal
pm2 restart mout-serveis
```

---

## 🧪 **Testing**

### **Executar Tests**
```bash
# Tests backend
npm test

# Tests frontend
cd client && npm test

# Coverage
npm run test:coverage
```

### **Tests Automàtics**
- **Unit tests** per models i utilitats
- **Integration tests** per API endpoints
- **E2E tests** per fluxos crítics

---

## 🤝 **Contribució**

### **Com Contribuir**
1. **Fork** el repositori
2. **Crea** branch: `git checkout -b feature/nova-funcionalitat`
3. **Commit** canvis: `git commit -m 'Afegir nova funcionalitat'`
4. **Push** branch: `git push origin feature/nova-funcionalitat`
5. **Obre** Pull Request

### **Estàndards de Codi**
- **ESLint** per JavaScript
- **Prettier** per formateo
- **Conventional Commits**
- **Tests obligatoris** per noves funcionalitats

---

## 📝 **Changelog**

### **[1.0.0] - 2025-09-08**
- ✅ Sistema multi-tenant complet
- ✅ Gestió contractes FIXE/ESPORÀDIC
- ✅ Assistència temps real
- ✅ Chat integrat
- ✅ PWA ready

---

## 📄 **Llicència**

Aquest projecte està llicenciat sota la [Llicència MIT](LICENSE).

---

## 📞 **Suport i Contacte**

- **📧 Email:** suport@moutserveis.com
- **🌐 Web:** https://app.moutserveis.com
- **📱 Telèfon:** +34 XXX XXX XXX
- **🐛 Issues:** [GitHub Issues](https://github.com/Oskarpp7/gestio-escolar-nodejs/issues)

---

## 🙏 **Agraïments**

Gràcies a tots els centres educatius que han contribuït amb feedback per millorar aquest sistema.

**Desenvolupat amb ❤️ per MouT Serveis**
