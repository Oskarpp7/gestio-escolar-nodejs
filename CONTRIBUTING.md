# 🤝 Guia de Contribució - MouT Serveis

¡Gràcies per l'interès en contrib uir al projecte **MouT Serveis**! 🎉

Aquesta guia t'ajudarà a entendre com pots participar en el desenvolupament d'aquest sistema de gestió escolar multi-tenant.

## 📋 Taula de Continguts

- [Codi de Conducta](#-codi-de-conducta)
- [Com Contribuir](#-com-contribuir)
- [Configuració de l'Entorn](#️-configuració-de-lentorn)
- [Estàndards de Codi](#-estàndards-de-codi)
- [Flux de Treball](#-flux-de-treball)
- [Testing](#-testing)
- [Documentació](#-documentació)
- [Issues i Bug Reports](#-issues-i-bug-reports)
- [Pull Requests](#-pull-requests)
- [Comunitat](#-comunitat)

---

## 📜 Codi de Conducta

Aquest projecte segueix un codi de conducta per assegurar un entorn inclusiu i respectuós per a tothom.

### 🤝 Els Nostres Compromisos

- **Respecte mutu**: Tractem tothom amb dignitat i respecte
- **Inclusivitat**: Acollim persones de tots els contextos i experiències
- **Col·laboració**: Treballem junts per assolir objectius comuns
- **Professionalitat**: Mantenim un to constructiu i professional
- **Aprenentatge**: Valorem l'aprenentatge continu i compartim coneixement

### ❌ Comportaments No Acceptables

- Llenguatge ofensiu, discriminatori o d'assetjament
- Atacs personals o comentaris despectius
- Spam o promoció no relacionada amb el projecte
- Publicació de contingut inapropiat
- Qualsevol altra conducta que pugui ser considerada inadequada

---

## 🚀 Com Contribuir

Hi ha moltes maneres de contribuir al projecte:

### 🐛 Reportar Bugs
- Utilitza les [plantilles d'issues](.github/ISSUE_TEMPLATE/) per reportar errors
- Proporciona informació detallada per reproduir el problema
- Inclou logs, screenshots i context rellevant

### ✨ Proposar Noves Funcionalitats
- Crea un [Feature Request](.github/ISSUE_TEMPLATE/feature_request.yml)
- Explica el problema que resol i el valor que aporta
- Discuteix la proposta amb la comunitat abans d'implementar

### 📚 Millorar Documentació
- Corregeix errors tipogràfics o informació obsoleta
- Afegeix exemples i casos d'ús
- Tradueix contingut quan sigui necessari

### 🧪 Testing
- Escriu tests per funcionalitats existents que no en tenen
- Millora la cobertura de tests
- Reporta tests que fallen o són inestables

### 💻 Desenvolupament
- Implementa noves funcionalitats
- Corregeix bugs existents
- Millora el rendiment del sistema
- Refactoritza codi per millorar la maintainability

---

## 🛠️ Configuració de l'Entorn

### Prerequisits
```bash
# Versions mínimes requerides
Node.js >= 18.0.0
npm >= 8.0.0
Git >= 2.30.0
PostgreSQL >= 14.0 (per producció)
```

### Configuració Inicial
```bash
# 1. Fork el repositori a GitHub
# 2. Clona el teu fork
git clone https://github.com/TU_USERNAME/gestio-escolar-nodejs.git
cd gestio-escolar-nodejs

# 3. Afegeix el repositori original com upstream
git remote add upstream https://github.com/Oskarpp7/gestio-escolar-nodejs.git

# 4. Instal·la dependències
npm install
cd client && npm install && cd ..

# 5. Configura variables d'entorn
cp .env.example .env
# Edita .env amb la teva configuració

# 6. Configura base de dades (desenvolupament amb SQLite)
npm run migrate:dev
npm run seed:dev

# 7. Executa l'aplicació
npm run dev
```

### Estructura de Branques
```bash
main          # Producció - només codi estable
develop       # Desenvolupament - integració contínua
feature/*     # Noves funcionalitats
bugfix/*      # Corrections d'errors
hotfix/*      # Correccions urgents per producció
docs/*        # Millores de documentació
```

---

## 📏 Estàndards de Codi

### JavaScript/Node.js
```javascript
// Utilitza ESLint i Prettier per consistència
npm run lint        # Revisar estil
npm run lint:fix    # Corregir automàticament
npm run format      # Formatar codi
```

#### Conventions
```javascript
// ✅ Bones pràctiques
const calculatePrice = (contract, service) => {
  // Funcions amb noms descriptius
  if (!contract || !service) {
    throw new Error('Contract i service són obligatoris');
  }
  
  return contract.calculateServicePrice(service);
};

// ✅ Comentaris en català per lògica de negoci
/**
 * Calcula el preu d'un servei segons el tipus de contracte
 * @param {Object} contract - Contracte de l'estudiant
 * @param {string} service - Tipus de servei (MENJADOR/ACOLLIDA)
 * @returns {number} Preu calculat en euros
 */

// ✅ Gestió d'errors consistent
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  logger.error('Error en operació:', error);
  throw error;
}
```

### Vue.js/Frontend
```vue
<!-- ✅ Components ben estructurats -->
<template>
  <div class="contract-form">
    <!-- Template clar i semàntic -->
  </div>
</template>

<script setup>
// ✅ Composition API preferida
import { ref, computed, onMounted } from 'vue'
import { useContractStore } from '@/stores/contracts'

const contractStore = useContractStore()

// ✅ Reactivitat clara
const formData = ref({
  student_id: '',
  type: 'FIXE'
})

// ✅ Computed properties per lògica derivada
const totalPrice = computed(() => {
  return contractStore.calculatePrice(formData.value)
})
</script>

<style scoped>
/* ✅ Tailwind CSS preferit, CSS custom quan sigui necessari */
.contract-form {
  @apply max-w-2xl mx-auto p-6 bg-white rounded-lg shadow;
}
</style>
```

### Base de Dades
```javascript
// ✅ Models Sequelize ben definits
class Contract extends Model {
  static associate(models) {
    // Relacions clares
    Contract.belongsTo(models.Student, { 
      foreignKey: 'student_id',
      as: 'student' 
    });
  }
  
  // ✅ Mètodes d'instància per lògica de negoci
  calculatePricing() {
    // Lògica de càlcul encapsulada
  }
}

// ✅ Migracions versionades
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('contracts', 'new_field', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },
  
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('contracts', 'new_field');
  }
};
```

---

## 🔄 Flux de Treball

### 1. Planificació
```bash
# Abans de començar, assegura't que el teu fork està actualitzat
git checkout main
git pull upstream main
git push origin main
```

### 2. Crear Branch
```bash
# Crea branch amb nom descriptiu
git checkout -b feature/millora-sistema-preus
# o
git checkout -b bugfix/corregir-calcul-assistencia
```

### 3. Desenvolupament
```bash
# Fes commits atòmics amb missatges descriptius
git add .
git commit -m "feat: afegir càlcul automàtic de beques BC70"

# Segueix Conventional Commits
# feat: Nova funcionalitat
# fix: Correcció d'error
# docs: Canvis en documentació
# style: Formateo, no canvis de funcionalitat
# refactor: Refactoring sense canvis funcionals
# test: Afegir o modificar tests
# chore: Manteniment, configuració
```

### 4. Testing
```bash
# Executa tests abans de fer push
npm test                    # Tests backend
cd client && npm test      # Tests frontend
npm run test:e2e           # Tests end-to-end
```

### 5. Push i Pull Request
```bash
# Push al teu fork
git push origin feature/millora-sistema-preus

# Crea Pull Request a GitHub
# Utilitza la plantilla de PR per proporcionar context
```

---

## 🧪 Testing

### Tipus de Tests
```bash
# Tests unitaris - funcions individuals
npm run test:unit

# Tests d'integració - mòduls treballant junts
npm run test:integration

# Tests E2E - fluxos complets d'usuari
npm run test:e2e

# Coverage - cobertura de codi
npm run test:coverage
```

### Escriure Bons Tests
```javascript
// ✅ Test descriptiu i complet
describe('Contract Price Calculation', () => {
  it('should calculate correct price for FIXE contract with BC70 scholarship', async () => {
    // Arrange
    const contract = await createTestContract({
      type: 'FIXE',
      has_menjador: true,
      scholarship_type: 'BC70'
    });
    
    // Act
    const pricing = contract.calculatePricing();
    
    // Assert
    expect(pricing.menjador.unitPrice).toBe(5.278); // 7.54 * 0.70
    expect(pricing.menjador.scholarshipApplied).toBe('BC70');
  });
});
```

---

## 📚 Documentació

### README Updates
- Mantén el README actualitzat amb noves funcionalitats
- Inclou exemples d'ús pràctics
- Actualitza instruccions d'instal·lació si cal

### API Documentation
```javascript
/**
 * @api {post} /api/contracts Crear Contracte
 * @apiName CreateContract
 * @apiGroup Contracts
 * 
 * @apiParam {String} student_id ID de l'estudiant
 * @apiParam {String="FIXE","ESPORÀDIC"} type Tipus de contracte
 * @apiParam {Boolean} has_menjador Inclou servei menjador
 * @apiParam {Boolean} has_acollida Inclou servei acollida
 * 
 * @apiSuccess {Object} contract Contracte creat
 * @apiSuccess {Object} pricing Informació de preus
 * 
 * @apiExample {curl} Exemple:
 * curl -X POST \
 *   http://localhost:3000/api/contracts \
 *   -H 'Content-Type: application/json' \
 *   -d '{"student_id":"123","type":"FIXE","has_menjador":true}'
 */
```

### Code Comments
```javascript
// ✅ Comenta la lògica complexa, no l'òbvia
class PricingCalculator {
  /**
   * Aplica descompte de beca segons tipus
   * BC70 = 30% del preu (70% descompte)
   * BC100 = Gratuït (100% descompte)
   */
  applyScholarshipDiscount(basePrice, scholarshipType) {
    switch (scholarshipType) {
      case 'BC70':
        return basePrice * 0.30; // Família paga 30%
      case 'BC100':
        return 0; // Completament gratuït
      default:
        return basePrice;
    }
  }
}
```

---

## 🐛 Issues i Bug Reports

### Quan Crear un Issue
- Has trobat un bug que afecta la funcionalitat
- Vols proposar una millora o nova funcionalitat
- Necessites ajuda o tens una pregunta
- La documentació és confusa o incorrecta

### Bones Pràctiques
```markdown
# ✅ Títol descriptiu
[BUG] Càlcul incorrecte de preus amb beca BC70 en contractes ESPORÀDIC

# ✅ Informació completa
## Reproducció:
1. Crear contracte ESPORÀDIC
2. Aplicar beca BC70
3. Registrar assistència menjador
4. Veure preu calculat incorrecte

## Esperat: 1.158€ (3.86 * 0.30)
## Actual: 2.702€ (7.54 * 0.30 - utilitzant preu FIXE)

## Entorn:
- Node.js: 18.17.0
- Base de dades: PostgreSQL 14.9
- Navegador: Chrome 118
```

---

## 🔀 Pull Requests

### Abans de Crear un PR
- [ ] Els tests passen localment
- [ ] El codi segueix els estàndards del projecte
- [ ] Has actualitzat la documentació si cal
- [ ] Has provat la funcionalitat manualment
- [ ] El commit té un missatge descriptiu

### Procés de Review
1. **Automated Checks**: CI/CD executa tests automàticament
2. **Code Review**: Almenys un maintainer revisa el codi
3. **Testing**: Es prova la funcionalitat en entorn de test
4. **Approval**: PR aprovada per maintainers
5. **Merge**: Integració a la branca principal

### Després del Merge
```bash
# Neteja el teu entorn local
git checkout main
git pull upstream main
git branch -d feature/millora-sistema-preus
git push origin --delete feature/millora-sistema-preus
```

---

## 🌟 Reconeixement

### Hall of Fame
Reconeixem les contribucions destacades:

- **🏆 Major Contributor**: Més de 10 PRs acceptades
- **🐛 Bug Hunter**: Reporta i corregeix bugs crítics
- **📚 Documentation Master**: Millores significatives en docs
- **🧪 Testing Champion**: Contribucions destacades en testing
- **🎨 UX Improver**: Millores en experiència d'usuari

### Com Ser Reconegut
- Contribueix de forma consistent i constructiva
- Ajuda altres contributors
- Participa en discussions de la comunitat
- Mantens alta qualitat en les teves contribucions

---

## 📞 Obtenir Ajuda

### Canals de Comunicació
- **GitHub Issues**: Per bugs i feature requests
- **GitHub Discussions**: Per preguntes generals
- **Email**: suport@moutserveis.com per temes privats

### Recursos Útils
- [Node.js Documentation](https://nodejs.org/docs/)
- [Vue.js Guide](https://vuejs.org/guide/)
- [Sequelize Documentation](https://sequelize.org/docs/)
- [Express.js Guide](https://expressjs.com/guide/)

---

## 🎯 Roadmap del Projecte

### Proper Sprint (v1.1)
- [ ] Millora del sistema de reports
- [ ] Optimització de performance
- [ ] PWA amb notificacions push
- [ ] Integració de pagaments online

### Futur (v2.0)
- [ ] App mòbil nativa
- [ ] Dashboard analític avançat
- [ ] Integració amb sistemes escolars existents
- [ ] Multi-idioma complet

---

**¡Gràcies per contribuir a MouT Serveis!** 🙏

Cada contribució, per petita que sigui, ajuda a millorar l'experiència de centres educatius i famílies. Junts estem construint una eina que realment fa la diferència en la gestió escolar.

**Desenvolupat amb ❤️ per la comunitat educativa**
