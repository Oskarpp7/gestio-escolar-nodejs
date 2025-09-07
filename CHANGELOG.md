# 📋 Changelog - MouT Serveis

Tots els canvis notables d'aquest projecte es documentaran en aquest fitxer.

El format està basat en [Keep a Changelog](https://keepachangelog.com/ca/1.0.0/),
i aquest projecte segueix [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 🔄 En Desenvolupament
- Sistema de reports avançat amb gràfics
- PWA amb notificacions push
- Optimització de performance per grans volums de dades
- Integració amb pasarel·les de pagament

---

## [1.0.0] - 2025-09-08

### 🎉 Llançament Inicial

#### ✨ Funcionalitats Noves
- **Sistema Multi-tenant Complet**
  - Aïllament total de dades per escola
  - Códigos únics per centre (M5544, E128, etc.)
  - Configuració independent per tenant

- **Sistema d'Autenticació Avançat**
  - JWT amb refresh tokens
  - 5 nivells de rol: SUPER_ADMIN → FAMILIA
  - Login amb codi d'escola obligatori
  - Reset de password via email

- **Gestió de Contractes Intel·ligent**
  - Contractes FIXE vs ESPORÀDIC
  - Preus variables per escola i servei
  - Sistema de beques BC70 (30% preu) i BC100 (gratuït)
  - Validació de contractes solapats
  - Duplicació de contractes per nous períodes

- **Control d'Assistència en Temps Real**
  - Registre diari per monitors
  - Càlcul automàtic de preus segons contracte
  - Gestió d'hores d'acollida amb límits
  - Estadístiques automàtiques (ràtio assistència, ingressos)
  - Vista diària optimitzada per monitors

- **Sistema de Chat Integrat**
  - Comunicació temps real famílies ↔ monitors ↔ admin
  - Sales automàtiques per tenant i rol
  - Indicadors d'escriptura i connexió
  - Historial de missatges persistent

- **Dashboard Multi-rol**
  - Vistes personalitzades per cada tipus d'usuari
  - Mètriques en temps real
  - Gràfics d'assistència i facturació
  - Alerts per esdeveniments importants

#### 🏗️ Arquitectura Tècnica
- **Backend**: Node.js 18+ + Express.js + Sequelize ORM
- **Frontend**: Vue.js 3 + Composition API + Tailwind CSS
- **Base de Dades**: PostgreSQL (prod) / SQLite (dev)
- **Temps Real**: Socket.io amb autenticació JWT
- **Logging**: Winston amb rotació automàtica
- **Deploy**: PM2 + GitHub Actions + cPanel compatible

#### 🔒 Seguretat Implementada
- Validació exhaustiva de inputs (express-validator)
- Sanitització de dades automàtica
- Rate limiting per prevenir abusos
- Headers de seguretat (helmet.js)
- Auditoria completa d'accions d'usuari
- Soft deletes amb paranoid models

#### 📊 Models de Dades Complets
- **Tenant**: Centres educatius amb configuració independent
- **User**: Sistema de rols jeràrquic amb permisos granulars
- **Student**: Gestió completa d'estudiants amb relacions familiars
- **Contract**: Contractes complexos amb lògica de preus avançada
- **Attendance**: Registres d'assistència amb facturació automàtica
- **Invoice**: Sistema de facturació amb estat i seguiment
- **Chat**: Missatgeria temps real amb sales per context

#### 🎯 Sistema de Preus Variables
- Configuració flexible per escola:
  - Menjador FIXE: per defecte 7.54€
  - Menjador ESPORÀDIC: per defecte 3.86€
  - Acollida: per defecte 4.50€/hora
- Beques amb càlculs automàtics:
  - BC70: Família paga 30% (70% beca)
  - BC100: Completament gratuït
- Adaptable per cada centre educatiu

#### 🌐 Frontend Modern
- Vue.js 3 amb Composition API
- Components reutilitzables amb Tailwind CSS
- Routing amb Vue Router
- Gestió d'estat amb Pinia
- Build optimitzat amb Vite
- PWA ready amb Service Workers

#### 🚀 Deploy i CI/CD
- GitHub Actions per deploy automàtic
- Testing automatitzat (unit, integration, E2E)
- Build i deploy a producció en push a main
- Configuració PM2 per gestió de processos
- Compatible amb hosting cPanel

#### 📱 Responsive i Accessibilitat
- Disseny responsive per tots els dispositius
- Interfície optimitzada per tablets (monitors)
- Accessibilitat WCAG compliant
- Suport per teclat i screen readers

---

## [0.9.0] - 2025-09-06 (Beta)

### ✨ Afegit
- Implementació inicial del sistema multi-tenant
- Models de base de dades amb Sequelize
- Autenticació JWT bàsica
- Estructura de projecte completa

### 🔧 Canviat
- Migració de arquitectura Laravel a Node.js
- Redisseny complet de l'API REST

---

## [0.1.0] - 2025-08-15 (Alpha)

### ✨ Afegit
- Concepte inicial del projecte
- Anàlisi de requeriments
- Prototips de interfície
- Documentació tècnica inicial

---

## 🔮 Roadmap Futur

### [1.1.0] - Previst Q4 2025
- **Reports Avançats**
  - Generació PDF automàtica
  - Gràfics interactius amb Chart.js
  - Exportació Excel/CSV
  - Reports personalitzables

- **Millores de Performance**
  - Cache amb Redis
  - Optimització de queries BD
  - Lazy loading en frontend
  - Compressió d'imatges automàtica

- **PWA Complet**
  - Notificacions push
  - Funcionament offline
  - Sync automàtic en reconnexió
  - Instal·lació com app mòbil

- **Integracions**
  - Pasarel·les de pagament (Stripe, PayPal)
  - Calendari Google/Outlook
  - Export a sistemes comptables
  - API pública per integracions

### [1.2.0] - Previst Q1 2026
- **App Mòbil Nativa**
  - React Native per iOS/Android
  - Notificacions push natives
  - Geolocalització per assistència
  - Funcionalitat offline

- **IA i Automització**
  - Predicció d'assistència
  - Detecció d'anomalies en facturació
  - Recomanacions automàtiques
  - Chatbot per suport

### [2.0.0] - Previst Q2 2026
- **Multi-idioma Complet**
  - Català, Castellà, Anglès
  - Localització de dates i monedes
  - RTL support per idiomes àrabs

- **Sistema de Permisos Avançat**
  - Permisos granulars per funcionalitat
  - Rols personalitzables per tenant
  - Auditoria avançada amb timeline

- **Microservices Architecture**
  - Separació de serveis independents
  - API Gateway amb rate limiting
  - Contenidors Docker
  - Kubernetes per escalabilitat

---

## 📝 Tipus de Canvis

- `✨ Afegit` per noves funcionalitats
- `🔧 Canviat` per canvis en funcionalitats existents
- `❌ Deprecat` per funcionalitats que seran eliminades
- `🗑️ Eliminat` per funcionalitats eliminades
- `🐛 Corregit` per correccions d'errors
- `🔒 Seguretat` per correccions de vulnerabilitats
- `⚡ Performance` per millores de rendiment
- `📚 Documentació` per canvis en documentació

---

## 🔗 Links de Referència

- [Repositori GitHub](https://github.com/Oskarpp7/gestio-escolar-nodejs)
- [Issues Reportats](https://github.com/Oskarpp7/gestio-escolar-nodejs/issues)
- [Pull Requests](https://github.com/Oskarpp7/gestio-escolar-nodejs/pulls)
- [Releases](https://github.com/Oskarpp7/gestio-escolar-nodejs/releases)
- [Documentació Completa](https://docs.moutserveis.com)

---

**Nota**: Aquest changelog es manté manualment. Per a una llista completa de tots els canvis, consulta el [historial de commits](https://github.com/Oskarpp7/gestio-escolar-nodejs/commits/main) al repositori.
