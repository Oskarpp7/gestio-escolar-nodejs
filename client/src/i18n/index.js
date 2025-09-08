import { createI18n } from 'vue-i18n'

const messages = {
  ca: {
    common: {
      save: 'Desar',
      cancel: 'Cancel·lar',
      delete: 'Eliminar',
      edit: 'Editar',
      create: 'Crear',
      loading: 'Carregant...'
    },
    auth: {
      login: 'Iniciar sessió',
      email: 'Email',
      password: 'Contrasenya'
    },
    pricing: {
      title: 'Configuració de preus',
      tenant: 'Centre',
      add: 'Afegir configuració',
      list: 'Llista de configuracions',
      active: 'Activa',
      validFrom: 'Vàlid des de',
      validTo: 'Vàlid fins a',
      service: 'Servei',
      contractType: 'Tipus de contracte',
      subtype: 'Subtipus',
      price: 'Preu',
      present: 'Present',
      absent: 'Absent',
      justified: 'Justificat',
      sporadic: 'Esporàdic'
    }
  },
}

const i18n = createI18n({
  legacy: false,
  locale: 'ca',
  fallbackLocale: 'ca',
  messages
})

export default i18n
