# Phase 5: Add Transaction Flow - Documentation

## Обзор

Фаза 5 реализует полноценный flow для добавления транзакций с модальным окном-степпером, валидацией и автоматическим обновлением данных во всех частях приложения.

## Компоненты

### 1. AddTransactionModal (`src/components/AddTransaction/AddTransactionModal.tsx`)

Главный компонент модального окна со степпером для добавления транзакции.

#### Особенности:

- **4 шага**: Type selection → Amount input → Category selection → Confirm
- **Навигация**: Кнопки Back/Next для перемещения между шагами
- **Индикатор прогресса**: Визуальные точки показывают текущий шаг
- **Валидация**: Проверка на каждом шаге перед переходом
- **Автоматические категории**: Для income - "Income", для saved - "Savings"
- **Уведомления**: Alert при успешном сохранении

#### Props:

```typescript
type AddTransactionModalProps = {
  visible: boolean;
  initialType?: TransactionType;  // Опциональный начальный тип
  onClose: () => void;
};
```

#### Шаги:

1. **Type Selection** (если не указан initialType)
   - Выбор типа: Expense, Income, Saved
   - Автоматический переход к следующему шагу

2. **Amount Input**
   - Ввод суммы с форматированием валюты
   - Валидация: положительное число
   - Превью отформатированной суммы

3. **Category Selection**
   - Для expense: выбор из 13 категорий
   - Для saved: автоматически "Savings"
   - Для income: автоматически "Income" (пропускается)

4. **Confirm**
   - Просмотр всех данных транзакции
   - Подтверждение и сохранение

### 2. AmountInputStep (`src/components/AddTransaction/AmountInputStep.tsx`)

Компонент для ввода суммы транзакции.

#### Особенности:

- **Форматирование валюты**: Автоматическое определение символа валюты
- **Валидация**: Только положительные числа
- **Превью**: Показ отформатированной суммы под полем ввода
- **Обработка десятичных**: Поддержка до 2 знаков после запятой

#### Props:

```typescript
type AmountInputStepProps = {
  amount: string;
  currency: string;
  onChange: (amount: string) => void;
  error?: string | null;
  style?: ViewStyle;
};
```

### 3. CategorySelectionStep (`src/components/AddTransaction/CategorySelectionStep.tsx`)

Компонент для выбора категории транзакции.

#### Особенности:

- **Типозависимый**: Разные категории для разных типов
- **Визуальная индикация**: Выбранная категория подсвечивается
- **Автоматический выбор**: Для income и saved категории фиксированы
- **ScrollView**: Для длинного списка категорий expense

#### Props:

```typescript
type CategorySelectionStepProps = {
  type: TransactionType;
  selectedCategory: string | null;
  onSelect: (category: string) => void;
  style?: ViewStyle;
};
```

### 4. ConfirmStep (`src/components/AddTransaction/ConfirmStep.tsx`)

Компонент для подтверждения данных транзакции.

#### Особенности:

- **Полная информация**: Тип, сумма, категория, дата
- **Цветовая кодировка**: Разные цвета для разных типов
- **Форматирование**: Красивое отображение всех данных

#### Props:

```typescript
type ConfirmStepProps = {
  type: TransactionType;
  amount: number;
  category: string | null;
  currency: string;
  createdAt: string;
  style?: ViewStyle;
};
```

## Интеграция

### HomeScreen

Модальное окно интегрировано в HomeScreen:

```typescript
<AddTransactionModal
  visible={modalVisible}
  onClose={handleCloseModal}
/>
```

Открывается при нажатии на FloatingActionButton.

## Обновление данных

### Автоматическое обновление

Благодаря архитектуре приложения, данные обновляются автоматически во всех компонентах:

1. **Оптимистичное обновление** в `TransactionsProvider`:
   - Состояние обновляется сразу при вызове `addTransaction`
   - Сохранение в AsyncStorage происходит асинхронно
   - UI реагирует мгновенно

2. **Мемоизированные селекторы**:
   - `useMonthlyTotals` - пересчитывает totals при изменении transactions
   - `useLastTransaction` - обновляет последнюю транзакцию
   - `useCurrentMonthTransactions` - фильтрует транзакции текущего месяца
   - `useCategoryBreakdown` - пересчитывает разбивку по категориям

3. **React Context**:
   - Все компоненты, использующие `useTransactions()`, автоматически получают обновленные данные
   - HomeScreen, DetailsScreen и другие компоненты обновляются без дополнительных действий

### Компоненты, которые обновляются автоматически:

- **HomeScreen**:
  - Donut chart (totals)
  - Summary cards (Remaining, Spent, Saved)
  - Last transaction preview
  - Balance header

- **DetailsScreen**:
  - Category breakdown
  - Totals

- **Любые другие компоненты**, использующие `useTransactions()` или селекторы

## Валидация

### Amount Input

- ✅ Положительное число
- ✅ Поддержка десятичных (до 2 знаков)
- ✅ Автоматическое форматирование

### Category Selection

- ✅ Обязательна для expense и saved
- ✅ Автоматически устанавливается для income ("Income")
- ✅ Автоматически устанавливается для saved ("Savings")

### Confirm Step

- ✅ Проверка всех полей перед сохранением
- ✅ Валидация суммы перед сохранением

## Обработка ошибок

- **Валидация**: Показ ошибок под полями ввода
- **Сохранение**: Обработка ошибок AsyncStorage с показом сообщения
- **Отмена**: Подтверждение при закрытии модального окна с несохраненными данными

## UX особенности

1. **Плавная навигация**: Кнопки Back/Next для перемещения между шагами
2. **Визуальная обратная связь**: Индикатор прогресса, подсветка выбранных элементов
3. **Автоматизация**: Пропуск шага категории для income
4. **Уведомления**: Alert при успешном сохранении
5. **Блокировка**: Кнопки неактивны при невалидных данных

## Технические детали

### Сохранение транзакции

```typescript
await addTransaction({
  type: 'expense',
  amount: 100,
  category: 'Groceries',
  createdAt: new Date().toISOString(),
});
```

### Генерация ID

Используется `uuidv4()` для генерации уникальных ID транзакций.

### Формат даты

Дата сохраняется в ISO формате (`new Date().toISOString()`).

## Известные ограничения

1. Нет редактирования существующих транзакций (будет в будущих фазах)
2. Нет удаления транзакций (будет в будущих фазах)
3. Toast уведомления используют Alert (можно улучшить в Phase 8)

## Будущие улучшения

1. Редактирование транзакций
2. Удаление транзакций
3. Повторяющиеся транзакции
4. Категории с иконками
5. Кастомные категории
6. Более продвинутые toast уведомления


