# Кредитные продукты (Credit Products) - Полная документация

Документ описывает полную реализацию функции кредитных продуктов, которая позволяет пользователям отслеживать и управлять своими долгами и кредитными обязательствами, включая кредитные карты, личные займы и рассрочки.

**Версия:** 2.0.0  
**Дата обновления:** 2025-11-25  
**Статус:** ✅ Реализовано

---

## Содержание

1. [Обзор и цели](#обзор-и-цели)
2. [Основные функции](#основные-функции)
3. [UX и пользовательские потоки](#ux-и-пользовательские-потоки)
4. [Модели данных](#модели-данных)
5. [Бизнес-логика](#бизнес-логика)
6. [API и интерфейсы](#api-и-интерфейсы)
7. [Хранилище и состояние](#хранилище-и-состояние)
8. [Интеграция с транзакциями](#интеграция-с-транзакциями)
9. [UI компоненты](#ui-компоненты)
10. [Тестирование](#тестирование)
11. [Известные ограничения](#известные-ограничения)
12. [План развития](#план-развития)

---

## Обзор и цели

### Ценность для пользователя

- ✅ Отслеживание всех кредитных обязательств в одном месте
- ✅ Автоматический расчет остатка долга при платежах
- ✅ Отслеживание использования кредитных карт для расходов
- ✅ Визуализация прогресса погашения долга
- ✅ Автоматическое начисление процентов (подготовлено к реализации)
- ✅ Единая категория "Credits" для всех кредитных операций

### Типы кредитных продуктов

1. **Credit Card (Кредитная карта)** - возобновляемый кредит
2. **Fixed Loan (Фиксированный займ)** - займ с фиксированным сроком
3. **Installment Plan (Рассрочка)** - рассрочка/BNPL

---

## Основные функции

### 1. Создание и управление кредитными продуктами

Пользователь может создавать, редактировать и удалять кредитные продукты через модальное окно `AddCreditProductModal`.

**Поля:**
- **Name** (обязательно) - название кредитного продукта
- **Initial Debt Amount (principal)** - начальная сумма долга
- **APR (%)** (обязательно) - годовая процентная ставка
- **Credit Type** - тип кредита (credit_card, fixed_loan, installment)
- **Monthly Minimum Payment** (опционально) - минимальный ежемесячный платеж
- **Payment Due Date** (опционально) - день месяца для платежа (1-31)
- **Loan Term (months)** (опционально) - срок займа в месяцах
- **Notes** (опционально) - заметки

### 2. Платежи по кредиту

При добавлении транзакции типа "Credit":
- Пользователь выбирает кредитный продукт
- Вводит сумму платежа
- Система автоматически применяет платеж к выбранному продукту
- `remainingBalance` уменьшается
- `totalPaid` пересчитывается автоматически

### 3. Использование кредитной карты для расходов

При добавлении транзакции типа "Expense":
- Пользователь может выбрать кредитную карту в качестве способа оплаты
- Система автоматически увеличивает `remainingBalance` карты
- `totalPaid` автоматически уменьшается (так как долг увеличился)
- В транзакции отображается пометка "Paid by [имя карты]"

### 4. Отображение кредитных продуктов

- Карточки кредитных продуктов в разделе "Spending Breakdown"
- Прогресс-бар погашения долга
- Текущий остаток и общая сумма выплат
- Статус продукта (active, paid_off, overdue)

---

## UX и пользовательские потоки

### Поток 1: Создание кредитного продукта

1. Пользователь открывает "Add Transaction"
2. Выбирает тип "Credit"
3. На шаге выбора категории видит кнопку "Create New Credit Product" (пунктирная рамка)
4. Нажимает кнопку → открывается модальное окно `AddCreditProductModal`
5. Заполняет поля:
   - Название (обязательно)
   - Начальная сумма долга
   - APR (%)
   - Тип кредита
   - Опциональные поля
6. Сохраняет → продукт создан и автоматически выбран
7. Продолжает добавление транзакции

### Поток 2: Платеж по кредиту

1. Пользователь открывает "Add Transaction"
2. Выбирает тип "Credit"
3. На шаге выбора категории видит список активных кредитных продуктов
4. Выбирает продукт
5. Вводит сумму платежа
6. Подтверждает транзакцию
7. Система автоматически:
   - Применяет платеж к продукту (уменьшает `remainingBalance`)
   - Пересчитывает `totalPaid`
   - Обновляет статус (если долг погашен)

### Поток 3: Использование кредитной карты для покупки

1. Пользователь открывает "Add Transaction"
2. Выбирает тип "Expense"
3. Выбирает категорию расхода
4. Вводит сумму
5. На шаге подтверждения видит раздел "Payment Method"
6. Нажимает на селектор → открывается выпадающий список
7. Выбирает кредитную карту из списка (или "Cash / Debit Card")
8. Подтверждает транзакцию
9. Система автоматически:
   - Увеличивает `remainingBalance` выбранной карты
   - Уменьшает `totalPaid` (так как долг увеличился)
   - Сохраняет транзакцию с пометкой `paidByCreditProductId`
10. В списке транзакций отображается "Paid by [имя карты]"

### Поток 4: Просмотр кредитных продуктов

1. Пользователь открывает "Spending Breakdown" (DetailsScreen)
2. Прокручивает вниз до раздела "Credit Products"
3. Видит карточки всех активных кредитных продуктов
4. На каждой карточке:
   - Название продукта
   - Прогресс-бар погашения
   - Текущий остаток (`remainingBalance`)
   - Общая сумма выплат (`totalPaid`)
   - Статус
5. Может нажать на карточку для редактирования
6. Может удалить продукт (с подтверждением)

---

## Модели данных

### CreditProduct

```typescript
export interface CreditProduct {
  id: string;                        // UUID
  name: string;                      // Название продукта
  principal: number;                 // Начальная сумма долга
  remainingBalance: number;           // Текущий остаток долга
  apr: number;                       // Годовая процентная ставка (%)
  dailyInterestRate: number;         // Дневная ставка (apr / 100 / 365)
  creditType: CreditProductType;      // Тип кредита
  loanTermMonths?: number;           // Срок займа в месяцах
  monthlyMinimumPayment?: number;    // Минимальный ежемесячный платеж
  dueDate?: number;                  // День месяца для платежа (1-31)
  accruedInterest: number;           // Накопленные проценты
  totalPaid: number;                 // Общая сумма выплат (principal - remainingBalance)
  status: CreditProductStatus;       // Статус продукта
  startDate: string;                  // Дата начала (ISO string)
  createdAt: string;                 // Дата создания (ISO string)
  updatedAt: string;                  // Дата обновления (ISO string)
  lastInterestCalculationDate: string; // Дата последнего расчета процентов (ISO string)
  note?: string;                      // Опциональные заметки
}

export type CreditProductType = 'credit_card' | 'fixed_loan' | 'installment';
export type CreditProductStatus = 'active' | 'paid_off' | 'overdue' | 'below_minimum';
```

### Transaction (расширенная)

```typescript
export interface Transaction {
  id: string;
  type: 'expense' | 'income' | 'saved' | 'credit';
  amount: number;
  category?: string;
  creditProductId?: string;           // Для транзакций типа 'credit' (платежи)
  paidByCreditProductId?: string;     // Для транзакций типа 'expense' (оплата картой)
  createdAt: string;                 // ISO string
}
```

**Важно:**
- `creditProductId` используется для транзакций типа 'credit' (платежи по кредиту)
- `paidByCreditProductId` используется для транзакций типа 'expense' (расходы, оплаченные кредитной картой)

---

## Бизнес-логика

### Расчет totalPaid

**Ключевое изменение:** `totalPaid` теперь рассчитывается автоматически на основе `principal` и `remainingBalance`.

**Формула:**
```
totalPaid = principal - remainingBalance
```

**Логика:**
- При создании продукта: `totalPaid = 0` (principal = remainingBalance)
- При платеже: `remainingBalance` уменьшается → `totalPaid` увеличивается
- При использовании карты: `remainingBalance` увеличивается → `totalPaid` уменьшается

**Пример:**
- Principal = 550
- Платеж 100: remainingBalance = 450, totalPaid = 100
- Использование карты на 50: remainingBalance = 500, totalPaid = 50

### Применение платежа (applyPayment)

**Для кредитных карт:**
1. Платеж сначала идет на погашение процентов (`accruedInterest`)
2. Остаток идет на уменьшение основного долга (`remainingBalance`)
3. `totalPaid` пересчитывается: `principal - remainingBalance`

**Для фиксированных займов и рассрочек:**
1. Платеж напрямую уменьшает `remainingBalance`
2. `totalPaid` пересчитывается: `principal - remainingBalance`

### Добавление расхода на карту (addCharge)

**Только для кредитных карт:**
1. `remainingBalance` увеличивается на сумму расхода
2. `totalPaid` пересчитывается: `principal - remainingBalance` (уменьшается)
3. Если статус был `paid_off`, меняется на `active`

**Важно:** `addCharge` может использоваться только для кредитных карт (`creditType === 'credit_card'`).

### Расчет процентов ✅ **Реализовано**

**Ежедневное начисление для всех типов кредитов:**
```
dailyInterestRate = APR / 100 / 365
daysBetween = количество дней между lastInterestCalculationDate и текущей датой
dailyInterest = remainingBalance * dailyInterestRate * daysBetween
accruedInterest += dailyInterest
```

**Когда начисляются проценты:**
1. При открытии приложения (в `hydrate`) - автоматически начисляются проценты за период с последнего расчета
2. При платеже (`applyPayment`) - проценты начисляются до момента платежа
3. При использовании карты (`addCharge`) - проценты начисляются до момента использования

**Особенности:**
- Проценты начисляются только на активные кредиты с ненулевым балансом
- Если APR = 0, проценты не начисляются
- Если кредит полностью погашен (`status === 'paid_off'`), проценты не начисляются
- При платеже сначала погашаются проценты (`accruedInterest`), затем основной долг (`remainingBalance`)
- Поле `lastInterestCalculationDate` отслеживает последнюю дату расчета процентов

### Статусы кредитных продуктов

- **active** - активный кредит (есть остаток долга)
- **paid_off** - полностью погашен (`remainingBalance === 0` и `accruedInterest === 0`)
- **overdue** - просрочен (платеж не внесен до `dueDate`) - будущее расширение
- **below_minimum** - платеж ниже минимального - будущее расширение

### Автоматическое добавление категории "Credits"

При создании первого кредитного продукта автоматически добавляется категория "Credits" в список категорий расходов (`settings.customCategories`).

---

## API и интерфейсы

### CreditProductsProvider

```typescript
type CreditProductsContextValue = {
  creditProducts: CreditProduct[];
  hydrated: boolean;
  loading: boolean;
  error: CreditProductsError | null;
  
  // Получение продуктов
  getActiveCreditProducts: () => CreditProduct[];
  getCreditProductById: (id: string) => CreditProduct | null;
  
  // CRUD операции
  createCreditProduct: (input: {
    name: string;
    principal: number;
    apr: number;
    creditType: CreditProductType;
    loanTermMonths?: number;
    monthlyMinimumPayment?: number;
    dueDate?: number;
    note?: string;
  }) => Promise<CreditProduct>;
  
  updateCreditProduct: (id: string, input: {
    name?: string;
    principal?: number;
    apr?: number;
    creditType?: CreditProductType;
    loanTermMonths?: number;
    monthlyMinimumPayment?: number;
    dueDate?: number;
    note?: string;
  }) => Promise<void>;
  
  deleteCreditProduct: (id: string) => Promise<void>;
  
  // Операции с балансом
  applyPayment: (productId: string, amount: number) => Promise<void>;
  addCharge: (productId: string, amount: number) => Promise<void>;
  
  // Утилиты
  retryHydration: () => Promise<void>;
};
```

### Использование

```typescript
import { useCreditProducts } from '../state/CreditProductsProvider';

const MyComponent = () => {
  const {
    creditProducts,
    getActiveCreditProducts,
    getCreditProductById,
    createCreditProduct,
    applyPayment,
    addCharge,
  } = useCreditProducts();
  
  // Создание продукта
  const product = await createCreditProduct({
    name: 'Visa Card',
    principal: 1000,
    apr: 18.5,
    creditType: 'credit_card',
  });
  
  // Применение платежа
  await applyPayment(product.id, 100);
  
  // Добавление расхода на карту
  await addCharge(product.id, 50);
};
```

---

## Хранилище и состояние

### AsyncStorage

**Ключ:** `creditProducts`

**Формат:**
```typescript
CreditProduct[]
```

**Функции:**
- `loadCreditProducts(): Promise<CreditProduct[] | null>`
- `saveCreditProducts(products: CreditProduct[]): Promise<void>`
- `validateCreditProducts(data: unknown): data is CreditProduct[]`

### Валидация

Все кредитные продукты валидируются при загрузке:
- Проверка структуры объекта
- Проверка типов полей
- Проверка обязательных полей
- Проверка диапазонов значений (APR >= 0, principal > 0)

### Персистентность

- Автоматическое сохранение при каждом изменении
- Оптимистичные обновления UI
- Обработка ошибок сохранения с возможностью повтора

---

## Интеграция с транзакциями

### TransactionsProvider

**Расширенный интерфейс:**

```typescript
addTransaction: (input: {
  amount: number;
  type: TransactionType;
  category?: string;
  creditProductId?: string;        // Для типа 'credit'
  paidByCreditProductId?: string;  // Для типа 'expense'
  createdAt?: string;
}) => Promise<void>;
```

### Автоматические действия

**При добавлении транзакции типа 'credit':**
1. Транзакция сохраняется с `creditProductId`
2. Автоматически вызывается `applyPayment(creditProductId, amount)`
3. `remainingBalance` уменьшается
4. `totalPaid` пересчитывается

**При добавлении транзакции типа 'expense' с `paidByCreditProductId`:**
1. Транзакция сохраняется с `paidByCreditProductId`
2. Автоматически вызывается `addCharge(paidByCreditProductId, amount)`
3. `remainingBalance` увеличивается
4. `totalPaid` пересчитывается (уменьшается)

### Отображение в списке транзакций

**Транзакции типа 'credit':**
- Тип отображается желтым цветом
- Название категории = название кредитного продукта
- Первая транзакция (создание продукта) отображается без знака
- Последующие платежи отображаются с минусом

**Транзакции типа 'expense' с `paidByCreditProductId`:**
- Отображается пометка "Paid by [имя карты]" под названием категории
- Обычное отображение суммы с минусом

---

## UI компоненты

### AddCreditProductModal

**Расположение:** `src/components/AddTransaction/AddCreditProductModal.tsx`

**Функции:**
- Создание нового кредитного продукта
- Редактирование существующего продукта
- Валидация полей
- Автоматический расчет `dailyInterestRate`

**Поля:**
- Name (обязательно)
- Initial Debt Amount (обязательно, > 0)
- APR % (обязательно, >= 0)
- Credit Type (выбор из 3 типов)
- Monthly Minimum Payment (опционально)
- Payment Due Date (опционально, 1-31)
- Loan Term Months (опционально, для fixed_loan и installment)
- Notes (опционально)

### CreditProductCard

**Расположение:** `src/components/CreditProductCard.tsx`

**Отображает:**
- Название продукта
- Тип кредита
- Прогресс-бар погашения (на основе `totalPaid / principal`)
- Текущий остаток (`remainingBalance`)
- Общая сумма выплат (`totalPaid`)
- Статус продукта
- Кнопки редактирования и удаления

### CategorySelectionStep

**Расположение:** `src/components/AddTransaction/CategorySelectionStep.tsx`

**Для типа 'credit':**
- Отображает список активных кредитных продуктов
- Кнопка "Create New Credit Product" в пунктирной рамке
- При выборе продукта автоматически устанавливается категория "Credits"

### ConfirmStep

**Расположение:** `src/components/AddTransaction/ConfirmStep.tsx`

**Для типа 'expense':**
- Раздел "Payment Method" с выпадающим списком
- Список активных кредитных карт (только `creditType === 'credit_card'`)
- Опция "Cash / Debit Card"
- При выборе карты отображается ее название

**Для типа 'credit':**
- Отображается название выбранного кредитного продукта
- Отображается текущий остаток долга

### TransactionsList

**Расположение:** `src/components/TransactionsList.tsx`

**Особенности:**
- Транзакции типа 'credit' отображаются с желтым типом
- Название категории = название кредитного продукта
- Для транзакций с `paidByCreditProductId` отображается "Paid by [имя карты]"

---

## Тестирование

### Ручное тестирование

**Сценарий 1: Создание кредитного продукта**
1. Открыть "Add Transaction" → "Credit"
2. Нажать "Create New Credit Product"
3. Заполнить все поля
4. Сохранить
5. Проверить, что продукт появился в списке
6. Проверить, что продукт появился в "Spending Breakdown"

**Сценарий 2: Платеж по кредиту**
1. Создать кредитный продукт (principal = 550)
2. Добавить транзакцию типа "Credit" на 100
3. Проверить, что `remainingBalance` = 450
4. Проверить, что `totalPaid` = 100
5. Проверить отображение транзакции в списке

**Сценарий 3: Использование кредитной карты**
1. Создать кредитную карту (principal = 550, remainingBalance = 450, totalPaid = 100)
2. Добавить транзакцию типа "Expense" на 50
3. Выбрать кредитную карту в "Payment Method"
4. Сохранить
5. Проверить, что `remainingBalance` = 500
6. Проверить, что `totalPaid` = 50 (уменьшилась)
7. Проверить, что в транзакции отображается "Paid by [имя карты]"

**Сценарий 4: Просмотр кредитных продуктов**
1. Открыть "Spending Breakdown"
2. Прокрутить до раздела "Credit Products"
3. Проверить отображение всех продуктов
4. Проверить прогресс-бары
5. Проверить корректность сумм

### Автоматическое тестирование (будущее)

- Unit тесты для `applyPayment` и `addCharge`
- Unit тесты для расчета `totalPaid`
- Интеграционные тесты для полного flow
- E2E тесты для создания продукта и платежей

---

## Известные ограничения

1. **Начисление процентов:** ✅ **Реализовано** - Ежедневное начисление процентов работает автоматически при открытии приложения
2. **Уведомления:** Уведомления о минимальных платежах и просрочках не реализованы
3. **Редактирование транзакций:** Редактирование транзакций типа 'credit' не откатывает платеж автоматически
4. **Удаление транзакций:** Удаление транзакций типа 'credit' не откатывает платеж автоматически
5. **Миграция данных:** ✅ Автоматическая миграция старых данных реализована (добавление `lastInterestCalculationDate`)

---

## План развития

### Версия 2.1 (Ближайшие улучшения)

- [ ] Ежедневное начисление процентов при открытии приложения
- [ ] Откат платежей при редактировании/удалении транзакций
- [ ] Улучшенная валидация при создании продукта
- [ ] Поддержка изменения `principal` после создания

### Версия 2.2 (Средний приоритет)

- [ ] Уведомления о минимальных платежах
- [ ] Автоматическое определение просроченных платежей
- [ ] График погашения долга
- [ ] Экспорт данных о кредитных продуктах

### Версия 3.0 (Долгосрочные цели)

- [ ] Интеграция с банковскими API (автоматическая синхронизация)
- [ ] Множественные валюты для кредитных продуктов
- [ ] Группировка кредитных продуктов по категориям
- [ ] Аналитика и рекомендации по погашению долга

---

## Changelog

### [2025-11-25] - Версия 2.0.0

**Добавлено:**
- ✅ Оплата расходов кредитной картой (`paidByCreditProductId`)
- ✅ Автоматический расчет `totalPaid` на основе `principal - remainingBalance`
- ✅ Отображение "Paid by [имя карты]" в транзакциях
- ✅ Выпадающий список выбора кредитной карты в ConfirmStep
- ✅ Автоматическое добавление категории "Credits" при создании первого продукта
- ✅ Улучшенная валидация транзакций

**Исправлено:**
- ✅ Расчет `totalPaid` теперь корректно уменьшается при использовании карты
- ✅ Отображение транзакций типа 'credit' с правильными цветами и знаками
- ✅ Сохранение `paidByCreditProductId` в транзакциях

**Изменено:**
- ✅ `totalPaid` теперь рассчитывается автоматически, а не накапливается
- ✅ Логика `applyPayment` и `addCharge` обновлена для корректного расчета `totalPaid`

### [2025-01-XX] - Версия 1.0.0

**Добавлено:**
- ✅ Базовая поддержка кредитных продуктов
- ✅ Тип транзакции "Credit"
- ✅ CreditProductsProvider
- ✅ Интеграция с AddTransaction flow
- ✅ Автоматическое применение платежей

---

## Контакты и поддержка

При возникновении вопросов или проблем:
1. Проверьте эту документацию
2. Проверьте логи в консоли разработчика
3. Создайте issue в репозитории проекта

---

**Последнее обновление:** 2025-11-25  
**Автор документации:** AI Assistant  
**Версия документа:** 2.0.0
