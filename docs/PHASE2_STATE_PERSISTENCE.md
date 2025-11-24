# Phase 2: State & Persistence - Documentation

## Обзор

Фаза 2 улучшает управление состоянием и персистентность данных в приложении ExGo. Реализованы надежные механизмы обработки ошибок, retry логика, улучшенная гидратация и мемоизированные селекторы для производительности.

## Компоненты

### 1. Storage Service (`src/services/storage.ts`)

Улучшенный сервис хранения данных с retry логикой и валидацией.

#### Основные функции:

- **`loadSettings()`** - Загрузка настроек с retry и валидацией
- **`saveSettings()`** - Сохранение настроек с retry
- **`loadTransactions()`** - Загрузка транзакций с retry и валидацией
- **`saveTransactions()`** - Сохранение транзакций с retry
- **`resetStorage()`** - Очистка всего хранилища

#### Особенности:

- **Retry механизм**: Автоматические повторные попытки (до 3 раз) с экспоненциальной задержкой
- **Валидация данных**: Проверка структуры данных перед использованием
- **Безопасный парсинг**: Обработка ошибок парсинга JSON
- **Логирование**: Детальное логирование ошибок для отладки

#### Пример использования:

```typescript
import { loadSettings, saveSettings } from '../services/storage';

// Загрузка с автоматическим retry
const settings = await loadSettings();

// Сохранение с автоматическим retry
await saveSettings(newSettings);
```

### 2. SettingsProvider (`src/state/SettingsProvider.tsx`)

Провайдер настроек с улучшенной обработкой ошибок и состояний.

#### API:

```typescript
type SettingsContextValue = {
  settings: UserSettings;           // Текущие настройки
  hydrated: boolean;                // Флаг завершения гидратации
  loading: boolean;                 // Флаг загрузки
  error: SettingsError | null;      // Ошибка (если есть)
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  setOnboarded: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
  retryHydration: () => Promise<void>;
};
```

#### Состояния:

- **`hydrated`**: `true` когда данные загружены из хранилища
- **`loading`**: `true` во время загрузки/сохранения
- **`error`**: Объект ошибки с возможностью retry

#### Обработка ошибок:

- При ошибке загрузки используются значения по умолчанию
- При ошибке сохранения состояние в памяти остается актуальным
- Все ошибки логируются в консоль
- Предоставляется функция `retry` для повторной попытки

#### Пример использования:

```typescript
import { useSettings } from '../state/SettingsProvider';

const MyComponent = () => {
  const { settings, loading, error, updateSettings, retryHydration } = useSettings();

  if (loading) return <Loader />;
  if (error) {
    return (
      <ErrorView 
        message={error.message} 
        onRetry={error.retry} 
      />
    );
  }

  return <SettingsForm settings={settings} onSave={updateSettings} />;
};
```

### 3. TransactionsProvider (`src/state/TransactionsProvider.tsx`)

Провайдер транзакций с улучшенной обработкой ошибок и состояний.

#### API:

```typescript
type TransactionsContextValue = {
  transactions: Transaction[];
  hydrated: boolean;
  loading: boolean;
  error: TransactionsError | null;
  addTransaction: (input: {...}) => Promise<void>;
  resetTransactions: () => Promise<void>;
  retryHydration: () => Promise<void>;
};
```

#### Особенности:

- Автоматическая генерация ID для новых транзакций (UUID)
- Автоматическое добавление timestamp при создании
- Сохранение состояния в памяти даже при ошибках сохранения
- Retry механизм для всех операций

### 4. Memoized Selectors (`src/state/selectors.ts`)

Мемоизированные селекторы для оптимизации производительности.

#### Доступные селекторы:

- **`useMonthlyTotals()`** - Вычисление месячных итогов
- **`useCategoryBreakdown()`** - Разбивка по категориям
- **`useCurrentMonthTransactions()`** - Транзакции текущего месяца
- **`useTransactionsByType()`** - Транзакции по типу
- **`useLastTransaction()`** - Последняя транзакция

#### Преимущества:

- Пересчет только при изменении зависимостей
- Оптимизация производительности через `useMemo`
- Чистый API для компонентов

#### Пример использования:

```typescript
import { useMonthlyTotals, useCategoryBreakdown } from '../state/selectors';
import { useSettings } from '../state/SettingsProvider';
import { useTransactions } from '../state/TransactionsProvider';

const HomeScreen = () => {
  const { settings } = useSettings();
  const { transactions } = useTransactions();
  
  // Мемоизированные вычисления
  const totals = useMonthlyTotals(transactions, settings.monthlyIncome);
  const breakdown = useCategoryBreakdown(transactions);

  return <Dashboard totals={totals} breakdown={breakdown} />;
};
```

### 5. AppRoot Hydration Gate (`src/AppRoot.tsx`)

Улучшенный gate для гидратации с обработкой ошибок.

#### Логика:

1. **Загрузка**: Показывается индикатор загрузки
2. **Ошибка**: Показывается экран ошибки с кнопкой retry
3. **Успех**: Приложение загружается с данными

#### Особенности:

- Блокировка навигации до завершения гидратации
- Отдельная обработка ошибок для settings и transactions
- Возможность retry для каждого провайдера
- Fallback на значения по умолчанию при ошибках

## Retry Механизм

### Конфигурация:

- **Максимум попыток**: 3
- **Задержка**: 500ms с экспоненциальным увеличением
- **Применяется к**: Все операции чтения/записи в AsyncStorage

### Реализация:

```typescript
const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 500,
): Promise<T> => {
  // Экспоненциальная задержка: 500ms, 1000ms, 1500ms
  // ...
};
```

## Валидация Данных

### Settings Validation:

```typescript
const validateSettings = (data: unknown): data is UserSettings => {
  return (
    typeof settings.currency === 'string' &&
    typeof settings.monthlyIncome === 'number' &&
    typeof settings.isOnboarded === 'boolean'
  );
};
```

### Transactions Validation:

```typescript
const validateTransactions = (data: unknown): data is Transaction[] => {
  return Array.isArray(data) && data.every(validateTransaction);
};
```

## Обработка Ошибок

### Стратегия:

1. **При загрузке**: Fallback на значения по умолчанию, приложение продолжает работу
2. **При сохранении**: Состояние в памяти обновляется, ошибка логируется
3. **Retry**: Предоставляется функция для повторной попытки
4. **Логирование**: Все ошибки логируются в консоль для отладки

### Типы ошибок:

```typescript
type SettingsError = {
  message: string;
  code?: string;        // 'HYDRATION_ERROR' | 'SAVE_ERROR'
  retry?: () => Promise<void>;
};
```

## Производительность

### Оптимизации:

1. **Memoized Selectors**: Пересчет только при изменении зависимостей
2. **useCallback**: Мемоизация функций в провайдерах
3. **useMemo**: Мемоизация значений контекста
4. **Минимальные ре-рендеры**: Только при изменении релевантных данных

### Best Practices:

- Используйте селекторы вместо прямых вычислений в компонентах
- Избегайте создания новых объектов в render
- Используйте `useCallback` для функций, передаваемых в дочерние компоненты

## Тестирование

См. `docs/PHASE2_TESTING.md` для подробной информации о тестах.

## Миграция

### Из старой версии:

Старый код:
```typescript
const { settings, updateSettings } = useSettings();
```

Новый код (совместим):
```typescript
const { settings, updateSettings, loading, error, retryHydration } = useSettings();
```

Все существующие API остаются совместимыми, добавлены только новые опциональные поля.

## Известные ограничения

1. Retry механизм не учитывает тип ошибки (всегда повторяет)
2. Нет автоматического восстановления после сетевых ошибок (не применимо для AsyncStorage)
3. Валидация не проверяет бизнес-логику (только структуру)

## Будущие улучшения

1. Более умный retry с учетом типа ошибки
2. Метрики производительности
3. Офлайн-очередь для операций записи
4. Синхронизация между устройствами (если потребуется)


