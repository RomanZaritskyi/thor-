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
    today: 'Сьогодні',
    noSetsToday: 'Сьогодні ще не було підходів.',
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

  errors: {
    unreadable: 'Дані не читаються',
    generic: 'Не вдалося зберегти. Спробуйте ще раз.',
  },
} as const
