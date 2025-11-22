# Phase 4: Home Experience - Documentation

## Обзор

Фаза 4 реализует полноценный домашний экран приложения ExGo с визуализацией бюджета, статистикой и удобным интерфейсом для добавления транзакций.

## Компоненты

### 1. DonutChart (`src/components/DonutChart.tsx`)

Улучшенный компонент круговой диаграммы с поддержкой темы и интерактивности.

#### Особенности:

- **Тематизация**: Использует цвета из темы (danger для расходов, positive для сбережений, accent для остатка)
- **Clamping**: Остаток зажимается на 0 для визуализации, но отображается отрицательным текстом при превышении бюджета
- **Tap Handler**: Поддержка нажатия для перехода на экран деталей
- **Настраиваемый размер**: Параметры `size` и `strokeWidth`

#### Props:

```typescript
type Props = {
  spent: number;
  saved: number;
  remaining: number;
  size?: number;           // Размер диаграммы (по умолчанию 180)
  strokeWidth?: number;    // Толщина линии (по умолчанию 18)
  onPress?: () => void;    // Обработчик нажатия
  showLabels?: boolean;    // Показывать ли метки
  style?: ViewStyle;       // Дополнительные стили
};
```

#### Пример использования:

```typescript
<DonutChart
  spent={totals.expenses}
  saved={totals.saved}
  remaining={totals.chartRemaining}
  size={200}
  onPress={() => navigation.navigate('Details')}
/>
```

### 2. FloatingActionButton (`src/components/FloatingActionButton.tsx`)

Плавающая кнопка действия с тематизацией.

#### Особенности:

- **Тематизация**: Использует accent цвет из темы
- **Настраиваемый размер**: Параметр `size` (по умолчанию 64)
- **Тени**: Использует shadows из темы
- **Позиционирование**: Абсолютное позиционирование для плавающего эффекта

#### Props:

```typescript
type Props = {
  onPress: () => void;
  style?: ViewStyle;
  size?: number;  // Размер кнопки (по умолчанию 64)
};
```

### 3. SummaryCard (`src/components/SummaryCard.tsx`)

Карточка для отображения статистики.

#### Особенности:

- **Варианты**: `default`, `positive` (зеленый), `negative` (красный), `neutral` (серый)
- **Тематизация**: Полная интеграция с темой
- **Использует Card**: Основан на компоненте Card из Phase 1

#### Props:

```typescript
type SummaryCardProps = {
  label: string;
  value: string;
  variant?: 'default' | 'positive' | 'negative' | 'neutral';
  style?: ViewStyle;
};
```

#### Пример использования:

```typescript
<SummaryCard
  label="Remaining"
  value={formatCurrency(totals.remaining, currency)}
  variant={totals.remaining < 0 ? 'negative' : 'positive'}
/>
```

### 4. LastTransactionPreview (`src/components/LastTransactionPreview.tsx`)

Компонент для отображения последней транзакции.

#### Особенности:

- **Empty State**: Показывает сообщение, если транзакций нет
- **Цветовая кодировка**: Разные цвета для expense/income/saved
- **Форматирование**: Красивое отображение суммы и даты
- **Интерактивность**: Опциональный обработчик нажатия

#### Props:

```typescript
type LastTransactionPreviewProps = {
  transaction: Transaction | null;
  currency: string;
  onPress?: () => void;
  style?: ViewStyle;
};
```

### 5. TransactionTypeModal (`src/components/TransactionTypeModal.tsx`)

Модальное окно для выбора типа транзакции (заглушка для Phase 5).

#### Особенности:

- **Три типа**: Expense, Income, Saved
- **Визуальная индикация**: Эмодзи и цвета для каждого типа
- **Bottom Sheet**: Модальное окно снизу экрана
- **Placeholder**: Полный flow будет реализован в Phase 5

## HomeScreen

### Структура экрана:

1. **Header Section**
   - Overline "Monthly balance"
   - Большой баланс (красный, если отрицательный)
   - Подпись "Of $X monthly income"

2. **Donut Chart Section**
   - Интерактивная диаграмма (tap → Details)
   - Предупреждение при превышении бюджета

3. **Summary Stats Section**
   - Три карточки: Remaining, Spent, Saved
   - Цветовая индикация (красный/зеленый/серый)

4. **Last Transaction Section**
   - Превью последней транзакции текущего месяца
   - Empty state, если транзакций нет

5. **Floating Action Button**
   - Плавающая кнопка "+" в правом нижнем углу
   - Открывает модальное окно выбора типа транзакции

### Использование селекторов:

```typescript
const totals = useMonthlyTotals(transactions, settings.monthlyIncome);
const lastTransaction = useLastTransaction(currentMonthTransactions);
const currentMonthTransactions = useCurrentMonthTransactions(transactions);
```

Все селекторы мемоизированы для оптимальной производительности.

### Обработка превышения бюджета:

- Диаграмма зажимает остаток на 0 для визуализации
- Текст баланса становится красным
- Показывается предупреждение "Over budget by $X"

## Визуальный дизайн

### Цветовая схема:

- **Expenses (Spent)**: Красный (`theme.colors.danger`)
- **Saved**: Зеленый (`theme.colors.positive`)
- **Remaining**: Синий (`theme.colors.accent`) или красный (если отрицательный)

### Типографика:

- **Balance**: Display size (40px), bold
- **Labels**: Small, medium weight, secondary color
- **Values**: Large, semibold, primary color

### Spacing:

- Используются токены из темы (`theme.spacing`)
- Консистентные отступы между секциями (24px)

## Интерактивность

### Навигация:

- **Chart Tap**: Переход на Details screen
- **FAB Press**: Открытие модального окна выбора типа транзакции
- **Last Transaction**: Готов к расширению (можно добавить навигацию к деталям)

### Модальные окна:

- **TransactionTypeModal**: Bottom sheet для выбора типа
- Плавная анимация появления
- Backdrop для закрытия

## Производительность

### Оптимизации:

1. **Memoized Selectors**: Все вычисления мемоизированы
2. **ScrollView**: Контент прокручивается для длинных списков
3. **Условный рендеринг**: Компоненты рендерятся только при необходимости

### Best Practices:

- Используйте селекторы вместо прямых вычислений
- Избегайте создания новых объектов в render
- Используйте `useMemo` для сложных вычислений

## Известные ограничения

1. TransactionTypeModal - заглушка, полный flow в Phase 5
2. Нет анимаций переходов (будет в Phase 8)
3. Last Transaction не кликабелен (можно добавить позже)

## Будущие улучшения

1. Анимации для диаграммы при изменении значений
2. Swipe gestures для навигации
3. Pull-to-refresh
4. Расширенная статистика (графики, тренды)
5. Виджеты для быстрого доступа

