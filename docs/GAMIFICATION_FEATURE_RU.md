# Функция "Геймификация" (Gamification) - Version 2.0

Документ описывает систему геймификации в приложении ExGo версии 2.0, которая мотивирует пользователей к здоровым финансовым привычкам через streaks, badges, challenges и levels.

## Цель и ценность

Система геймификации добавляет мотивационный слой к приложению, поощряя пользователей:
- Регулярно записывать транзакции (streaks)
- Достигать финансовых целей (badges)
- Соблюдать бюджет (badges, challenges)
- Своевременно платить по долгам (badges)
- Поддерживать финансовую дисциплину (consistency badges)

## Принципы дизайна

- **Purpose over points:** Каждая награда связана с здоровыми финансовыми привычками
- **Calm defaults:** Минимальные уведомления, опциональные push-алерты
- **Progress always visible:** Легкие индикаторы прогресса (streak dots, level chip)
- **Fairness and honesty:** Нет темных паттернов, четкие правила и даты окончания

## Основные механики

### 1. Streaks (Последовательность дней)

**Описание:**
- Отслеживает последовательные дни с хотя бы одной транзакцией
- Прощение пропусков: 1 "skip token" каждые 14 дней
- UI: маленькие точки на HomeScreen, нажатие открывает детали

**Реализация:**
- `StreakState` хранит `current`, `best`, `skipTokens`, `lastDate`
- Обновляется автоматически при добавлении транзакции
- Skip token используется автоматически при пропуске одного дня

### 2. Badges (Достижения)

**Категории:**
- **Logging:** 7/30/100 дней записи транзакций
- **Goals:** 50%/80%/100% финансирования цели
- **Budgets:** 1/3/6 месяцев под бюджетом
- **Debts:** 3/6/12 месяцев своевременных платежей
- **Consistency:** 1/3/6 месяцев без перерасхода

**Уровни:** Bronze, Silver, Gold

**Реализация:**
- 15 предустановленных badges
- Автоматическое отслеживание прогресса
- Автоматическая разблокировка при достижении цели
- Анимация конфетти при разблокировке (использует существующий ConfettiProvider)

### 3. Challenges (Вызовы)

**Типы:**
- "No Delivery" - неделя без доставки
- "Groceries -10% vs avg" - снижение расходов на продукты
- "Log daily" - ежедневная запись транзакций
- Custom challenges

**Особенности:**
- Временные (start/end date)
- Только один активный challenge за раз
- Награда: badge + XP + streak boost

**Реализация:**
- Пользователь может создавать challenges
- Автоматическое обновление прогресса
- Автоматическое завершение/истечение по дате

### 4. Levels (Уровни) и XP

**Система XP:**
- +10 XP за каждую транзакцию
- +50 XP за достижение 50% цели
- +75 XP за достижение 80% цели
- +100 XP за завершение цели
- +25 XP за месяц под бюджетом
- +30 XP за своевременный платеж по долгу
- +150 XP за завершение challenge

**Прогрессия уровней:**
- Линейная: уровень * 100 XP
- Уровень 1: 0-100 XP
- Уровень 2: 100-200 XP
- И так далее

**Награды:**
- Только косметические (card accent, profile ring)
- Никогда не блокируют функции

## UX Surfaces

### Home Ribbon
- Компактные `StreakChip` и `LevelChip`
- Нажатие открывает GamificationHub
- Расположены между донатом и summary section

### GamificationHub Screen
- Полный обзор всех элементов геймификации
- Сетка badges (разблокированные и заблокированные)
- Детали streak (текущая, лучшая, skip tokens)
- Активный challenge с прогресс-баром
- История challenges

### Toasts
- Минимальные уведомления при разблокировке badge
- Формат: "Badge earned: On-Time Payer (3 mo)"
- Использует существующую систему уведомлений

## Технические детали

### Data Model

```typescript
interface GamificationState {
  streak: StreakState;
  badges: Badge[];
  challenges: Challenge[];
  level: LevelState;
  lastUpdated: string;
}

interface StreakState {
  current: number;
  best: number;
  skipTokens: number;
  lastDate: string | null;
}

interface Badge {
  id: string;
  name: string;
  tier: 'bronze' | 'silver' | 'gold';
  category: 'logging' | 'goals' | 'budgets' | 'debts' | 'consistency';
  unlockedAt: string | null;
  progress: number;
  target: number;
  description?: string;
}

interface Challenge {
  id: string;
  name: string;
  type: ChallengeType;
  start: string;
  end: string;
  status: 'active' | 'completed' | 'failed' | 'expired';
  progress: number;
  target: number;
  description?: string;
  rewardXP?: number;
}

interface LevelState {
  xp: number;
  level: number;
}
```

### Storage

- Ключ: `gamification`
- Функции: `loadGamification()`, `saveGamification()`
- Валидация структуры данных

### Triggers

#### Transaction Logged
- Вызывается из `TransactionsProvider.addTransaction()`
- Обновляет streak (если первая транзакция дня)
- Добавляет +10 XP
- Проверяет прогресс badges

#### Goal Funded
- Вызывается из `GoalsProvider` при обновлении прогресса цели
- Проверяет milestones (50%, 80%, 100%)
- Награждает соответствующим XP
- Обновляет goal badges

#### Budget Month Closed
- Вызывается при закрытии месяца под бюджетом
- Обновляет budget badges
- Добавляет +25 XP

#### Debt On-Time Payment
- Вызывается при своевременном платеже по кредиту
- Обновляет debt badges
- Добавляет +30 XP

#### Challenge Tick
- Обновляется при релевантных событиях
- Автоматически завершается/истекает по дате

## Интеграция

### GamificationProvider
- Расположен в `src/state/GamificationProvider.tsx`
- Интегрирован в `AppProvider` после `NotificationProvider`
- Использует хуки из других провайдеров (Transactions, Goals, MiniBudgets, CreditProducts)

### Триггеры в провайдерах
- `TransactionsProvider`: вызывает `updateStreak()`, `addXP()`, `checkBadgeProgress()`
- `GoalsProvider`: вызывает `addXP()` и `checkBadgeProgress()` при обновлении целей
- Условные импорты для обратной совместимости

## Локализация

### Ключи (en/uk)

```json
{
  "gamification": {
    "title": "Gamification" / "Гейміфікація",
    "streak": "days" / "днів",
    "streakTitle": "Streak" / "Серія",
    "currentStreak": "Current: {{days}} days" / "Поточна: {{days}} днів",
    "bestStreak": "Best: {{days}} days" / "Найкраща: {{days}} днів",
    "skipTokens": "Skip tokens: {{count}}" / "Токени пропуску: {{count}}",
    "activeChallenge": "Active Challenge" / "Активний виклик",
    "unlockedBadges": "Unlocked Badges" / "Розблоковані значки",
    "allBadges": "All Badges" / "Всі значки",
    "badgeCategory": {
      "logging": "Logging" / "Запис",
      "goals": "Goals" / "Цілі",
      "budgets": "Budgets" / "Бюджети",
      "debts": "Debts" / "Борги",
      "consistency": "Consistency" / "Послідовність"
    }
  }
}
```

## Ограничения и известные проблемы

1. **Упрощенная логика badges:**
   - Budget, Debt, Consistency badges используют упрощенную логику
   - В полной реализации требуется отслеживание истории по месяцам

2. **Challenges:**
   - Пользователь не может создавать challenges через UI (только через код)
   - В будущем: UI для создания challenges

3. **Digest:**
   - Weekly/monthly digest не реализован
   - В будущем: карточка digest на HomeScreen

## Будущие улучшения

1. **UI для создания challenges**
2. **Weekly/monthly digest card**
3. **Расширенная логика badges** (точное отслеживание истории)
4. **Cosmetic rewards** (card accent, profile ring)
5. **Badge unlock animations** (улучшенные)
6. **Progress previews** ("Next: log 3 more days")

## Файлы

### Созданные файлы
- `src/types/index.ts` - Добавлены типы геймификации
- `src/services/storage.ts` - Добавлены функции хранения
- `src/state/GamificationProvider.tsx` - Основной провайдер
- `src/components/StreakChip.tsx` - Компонент streak
- `src/components/LevelChip.tsx` - Компонент уровня
- `src/screens/GamificationHubScreen.tsx` - Экран геймификации

### Измененные файлы
- `src/state/AppProvider.tsx` - Интеграция GamificationProvider
- `src/state/TransactionsProvider.tsx` - Триггеры геймификации
- `src/state/GoalsProvider.tsx` - Триггеры геймификации
- `src/screens/HomeScreen.tsx` - Добавлен gamification ribbon
- `src/navigation/RootNavigator.tsx` - Добавлен GamificationHub screen
- `src/i18n/locales/en.json` - Локализация
- `src/i18n/locales/uk.json` - Локализация

## Версия

**Версия:** 2.0.0  
**Дата:** 2025-01-27  
**Статус:** ✅ Реализовано (базовая версия)

---

**Поддерживается командой разработки ExGo**

