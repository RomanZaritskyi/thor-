/**
 * Every user-visible string, in one place. No i18n library: the app has one
 * language, and a framework for switching between one language is not a feature.
 */
export const ui = {
  appName: 'Thor',

  picker: {
    title: 'Вправи',
    searchLabel: 'Пошук вправи',
    searchPlaceholder: 'Почніть вводити назву',
    addLabel: 'Назва нової вправи',
    add: 'Додати вправу',
    addNamed: (name: string) => `Додати «${name}»`,
    emptyAll: 'Список порожній. Додайте першу вправу — далі вона буде тут.',
    emptySearch: (query: string) => `За запитом «${query}» нічого не знайдено.`,
    loading: 'Завантаження…',
  },

  exercise: {
    back: 'До списку вправ',
    lastTime: 'Минулого разу',
    noHistory: 'Цю вправу ще не робили. Це буде перший запис.',
    today: 'Цей раз',
    noSetsToday: 'Ще жодного підходу — запишіть перший.',
    finish: 'Закінчити вправу',
    finishing: 'Закриваю…',
    finishHint:
      'Закриє цей підхід до вправи. Якщо повернетесь до неї сьогодні — ці підходи стануть «минулого разу».',
    atTime: (time: string) => `сьогодні, ${time}`,
    notFound: 'Такої вправи немає.',
    daysAgo: (days: number) =>
      days === 0 ? 'сьогодні' : days === 1 ? 'учора' : `${String(days)} дн. тому`,
  },

  record: {
    legend: 'Записати підхід',
    weightLabel: 'Вага, кг',
    repsLabel: 'Повтори',
    noteLabel: 'Примітка (тренажер, отвір, відчуття)',
    submit: 'Записати підхід',
    submitting: 'Записую…',
  },

  set: {
    /** 60 × 10 reads the way it is written in a notebook. */
    summary: (weightKg: number, reps: number) => `${String(weightKg)} × ${String(reps)}`,
    delete: (weightKg: number, reps: number) =>
      `Видалити підхід ${String(weightKg)} × ${String(reps)}`,
    bodyweight: 'власна вага',
  },

  transfer: {
    title: 'Дані',
    back: 'До списку вправ',
    exportHeading: 'Експорт',
    exportHint: 'Збереже все у файл. Тримайте копію: дані живуть лише на цьому пристрої.',
    export: 'Зберегти у файл',
    importHeading: 'Імпорт',
    importHint: 'Імпорт замінить усе, що записано зараз.',
    importLabel: 'Файл для імпорту',
    confirmTitle: 'Замінити всі дані?',
    confirmBody: (exercises: number, sets: number) =>
      `Буде видалено ${String(exercises)} вправ(и) та ${String(sets)} підход(ів). Скасувати це буде неможливо.`,
    confirmFile: (exercises: number, sets: number) =>
      `З файлу буде відновлено ${String(exercises)} вправ(и) та ${String(sets)} підход(ів).`,
    confirm: 'Замінити',
    cancel: 'Скасувати',
    imported: 'Дані відновлено з файлу.',
    cancelled: 'Імпорт скасовано. Нічого не змінено.',
  },

  unreadable: {
    title: 'Дані не читаються',
    body: 'Частину записів не вдалося прочитати. Щоб нічого не втратити, застосунок нічого не змінює й не дозволяє записувати нові підходи.',
    salvageHeading: 'Що вдалося прочитати',
    salvage: 'Зберегти прочитане у файл',
    eraseHeading: 'Почати з чистого аркуша',
    eraseHint: 'Видалить усе безповоротно. Спершу збережіть файл вище.',
    erase: 'Стерти все й почати заново',
    eraseConfirm: 'Так, стерти все',
    cancel: 'Скасувати',
  },

  notFound: {
    title: 'Сторінку не знайдено',
    body: 'Такої адреси немає.',
    back: 'До списку вправ',
  },

  errors: {
    unreadable: 'Дані не читаються',
    generic: 'Не вдалося зберегти. Спробуйте ще раз.',
  },
} as const
