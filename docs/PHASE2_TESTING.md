# Phase 2: Testing Documentation

## Обзор

Тесты для Phase 2 покрывают:
- Storage service (retry, validation, error handling)
- SettingsProvider (hydration, error states, retry)
- TransactionsProvider (hydration, error states, retry)
- Memoized selectors (correctness, memoization)

## Запуск тестов

```bash
npm test
```

Запуск конкретного файла:
```bash
npm test storage.test.ts
npm test SettingsProvider.test.tsx
```

## Структура тестов

### 1. Storage Service Tests (`src/services/__tests__/storage.test.ts`)

#### Покрытие:

- ✅ Загрузка валидных настроек
- ✅ Загрузка валидных транзакций
- ✅ Обработка отсутствующих данных
- ✅ Обработка невалидного JSON
- ✅ Обработка невалидной структуры данных
- ✅ Retry механизм при ошибках
- ✅ Сохранение данных
- ✅ Валидация при сохранении
- ✅ Сброс хранилища

#### Примеры тестов:

```typescript
it('should load valid settings', async () => {
  const mockSettings = { currency: 'USD', monthlyIncome: 1000, isOnboarded: true };
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockSettings));
  
  const result = await loadSettings();
  
  expect(result).toEqual(mockSettings);
});

it('should retry on failure', async () => {
  // Mock setTimeout to execute immediately for retry delays
  const originalSetTimeout = global.setTimeout;
  global.setTimeout = jest.fn((fn: () => void) => {
    fn();
    return 1 as any;
  }) as any;

  const mockSettings = { currency: 'USD', monthlyIncome: 1000, isOnboarded: false };
  (AsyncStorage.getItem as jest.Mock)
    .mockRejectedValueOnce(new Error('Network error'))
    .mockRejectedValueOnce(new Error('Network error'))
    .mockResolvedValueOnce(JSON.stringify(mockSettings));

  const result = await loadSettings();

  expect(AsyncStorage.getItem).toHaveBeenCalledTimes(3);
  expect(result).toEqual(mockSettings);

  global.setTimeout = originalSetTimeout;
});
```

### 2. SettingsProvider Tests (`src/state/__tests__/SettingsProvider.test.tsx`)

#### Покрытие:

- ✅ Инициализация с дефолтными значениями
- ✅ Загрузка настроек из хранилища
- ✅ Обновление настроек
- ✅ Обработка ошибок гидратации
- ✅ Обработка ошибок сохранения
- ✅ Retry гидратации
- ✅ Сброс к дефолтным значениям
- ✅ Сохранение состояния в памяти при ошибках

#### Примеры тестов:

```typescript
it('should handle hydration errors', async () => {
  (storage.loadSettings as jest.Mock).mockRejectedValue(new Error('Storage error'));
  
  const { result } = renderHook(() => useSettings(), { wrapper });
  
  await waitFor(() => {
    expect(result.current.hydrated).toBe(true);
  });
  
  expect(result.current.error).toBeTruthy();
  expect(result.current.settings).toEqual(defaultSettings);
});
```

### 3. TransactionsProvider Tests (`src/state/__tests__/TransactionsProvider.test.tsx`)

#### Покрытие:

- ✅ Инициализация с пустым массивом
- ✅ Загрузка транзакций из хранилища
- ✅ Добавление транзакции
- ✅ Автоматическое добавление createdAt
- ✅ Автоматическая генерация ID
- ✅ Обработка ошибок гидратации
- ✅ Обработка ошибок сохранения
- ✅ Сброс транзакций
- ✅ Retry гидратации

#### Примеры тестов:

```typescript
it('should add transaction with auto-generated ID', async () => {
  const { result } = renderHook(() => useTransactions(), { wrapper });
  
  await act(async () => {
    await result.current.addTransaction({
      type: 'expense',
      amount: 50,
      category: 'Food',
    });
  });
  
  expect(result.current.transactions[0].id).toBe('mock-uuid');
});
```

### 4. Selectors Tests (`src/state/__tests__/selectors.test.ts`)

#### Покрытие:

- ✅ Корректность вычислений
- ✅ Мемоизация результатов
- ✅ Фильтрация по дате
- ✅ Фильтрация по типу
- ✅ Получение последней транзакции

#### Примеры тестов:

```typescript
it('should memoize result', () => {
  const { result, rerender } = renderHook(
    ({ transactions, income }) => useMonthlyTotals(transactions, income),
    { initialProps: { transactions: mockTransactions, income: 1000 } }
  );
  
  const firstResult = result.current;
  rerender({ transactions: mockTransactions, income: 1000 });
  
  expect(result.current).toBe(firstResult); // Same reference
});
```

## Mocking

### AsyncStorage

AsyncStorage автоматически мокируется через `jest.setup.js`:

```javascript
// jest.setup.js
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
```

В тестах не нужно мокировать AsyncStorage вручную - это делается глобально.

### Storage Service

```typescript
jest.mock('../../services/storage');
```

### UUID

```typescript
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));
```

## Best Practices

1. **Очистка моков**: Используйте `beforeEach` для очистки моков
2. **Асинхронность**: Используйте `waitFor` для асинхронных операций
3. **Act**: Обертывайте обновления состояния в `act()`
4. **Изоляция**: Каждый тест должен быть независимым

## Покрытие

Текущее покрытие Phase 2:
- Storage Service: ~90%
- SettingsProvider: ~85%
- TransactionsProvider: ~85%
- Selectors: ~80%

## Запуск с покрытием

```bash
npm test -- --coverage
```

## Известные ограничения

1. Тесты не покрывают все edge cases retry механизма
2. Нет интеграционных тестов с реальным AsyncStorage
3. Тесты selectors зависят от моков calculations модуля

## Будущие улучшения

1. Интеграционные тесты с реальным хранилищем
2. E2E тесты для полного flow
3. Performance тесты для selectors
4. Тесты для error boundaries

