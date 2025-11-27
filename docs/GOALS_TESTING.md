# Тестирование функции "Цели" (Goals Testing)

Документ описывает стратегию тестирования функции финансовых целей в приложении ExGo.

## Обзор

Функция "Цели" требует тестирования на нескольких уровнях:
- Unit тесты для бизнес-логики
- Интеграционные тесты для взаимодействия с транзакциями
- Компонентные тесты для UI компонентов
- E2E тесты для пользовательских сценариев

## Unit тесты

### GoalsProvider

#### Тестирование создания цели

```typescript
describe('GoalsProvider - createGoal', () => {
  it('should create a new goal with correct initial values', async () => {
    const goal = await createGoal({
      name: 'Buy a car',
      targetAmount: 10000,
      emoji: '🚗',
      note: 'Save for down payment',
    });

    expect(goal.id).toBeDefined();
    expect(goal.name).toBe('Buy a car');
    expect(goal.targetAmount).toBe(10000);
    expect(goal.currentAmount).toBe(0);
    expect(goal.status).toBe('active');
    expect(goal.currency).toBe(settings.currency);
    expect(goal.emoji).toBe('🚗');
    expect(goal.note).toBe('Save for down payment');
  });

  it('should validate goal name is not empty', async () => {
    await expect(
      createGoal({ name: '', targetAmount: 1000 })
    ).rejects.toThrow();
  });

  it('should validate target amount is positive', async () => {
    await expect(
      createGoal({ name: 'Goal', targetAmount: -100 })
    ).rejects.toThrow();
  });
});
```

#### Тестирование пересчета прогресса

```typescript
describe('GoalsProvider - recalculateGoalProgress', () => {
  it('should calculate currentAmount from saved transactions', async () => {
    const goal = await createGoal({ name: 'Goal', targetAmount: 1000 });
    
    // Add saved transactions linked to goal
    await addTransaction({
      type: 'saved',
      amount: 200,
      goalId: goal.id,
    });
    await addTransaction({
      type: 'saved',
      amount: 300,
      goalId: goal.id,
    });

    await recalculateGoalProgress(goal.id);
    
    const updatedGoal = getGoalById(goal.id);
    expect(updatedGoal?.currentAmount).toBe(500);
  });

  it('should not count transactions without goalId', async () => {
    const goal = await createGoal({ name: 'Goal', targetAmount: 1000 });
    
    await addTransaction({
      type: 'saved',
      amount: 200,
      // No goalId
    });

    await recalculateGoalProgress(goal.id);
    
    const updatedGoal = getGoalById(goal.id);
    expect(updatedGoal?.currentAmount).toBe(0);
  });

  it('should not count transactions with different goalId', async () => {
    const goal1 = await createGoal({ name: 'Goal 1', targetAmount: 1000 });
    const goal2 = await createGoal({ name: 'Goal 2', targetAmount: 1000 });
    
    await addTransaction({
      type: 'saved',
      amount: 200,
      goalId: goal2.id,
    });

    await recalculateGoalProgress(goal1.id);
    
    const updatedGoal = getGoalById(goal1.id);
    expect(updatedGoal?.currentAmount).toBe(0);
  });
});
```

#### Тестирование автоматического выполнения цели

```typescript
describe('GoalsProvider - automatic goal completion', () => {
  it('should mark goal as completed when currentAmount >= targetAmount', async () => {
    const goal = await createGoal({ name: 'Goal', targetAmount: 1000 });
    
    await addTransaction({
      type: 'saved',
      amount: 1000,
      goalId: goal.id,
    });

    // Wait for automatic recalculation
    await waitFor(() => {
      const updatedGoal = getGoalById(goal.id);
      expect(updatedGoal?.status).toBe('completed');
      expect(updatedGoal?.completedAt).toBeDefined();
    });
  });

  it('should trigger onGoalCompleted callback when goal is completed', async () => {
    const onGoalCompleted = jest.fn();
    const goal = await createGoal({ name: 'Goal', targetAmount: 1000 });
    
    await addTransaction({
      type: 'saved',
      amount: 1000,
      goalId: goal.id,
    });

    await waitFor(() => {
      expect(onGoalCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          id: goal.id,
          status: 'completed',
        })
      );
    });
  });
});
```

### calculateGoalCurrentAmount

```typescript
describe('calculateGoalCurrentAmount', () => {
  it('should sum all saved transactions for a goal', () => {
    const transactionsByMonth = {
      '2025-01': [
        { id: '1', type: 'saved', amount: 100, goalId: 'goal1' },
        { id: '2', type: 'saved', amount: 200, goalId: 'goal1' },
      ],
      '2025-02': [
        { id: '3', type: 'saved', amount: 300, goalId: 'goal1' },
      ],
    };

    const result = calculateGoalCurrentAmount('goal1', transactionsByMonth);
    expect(result).toBe(600);
  });

  it('should ignore transactions with different goalId', () => {
    const transactionsByMonth = {
      '2025-01': [
        { id: '1', type: 'saved', amount: 100, goalId: 'goal1' },
        { id: '2', type: 'saved', amount: 200, goalId: 'goal2' },
      ],
    };

    const result = calculateGoalCurrentAmount('goal1', transactionsByMonth);
    expect(result).toBe(100);
  });

  it('should ignore non-saved transactions', () => {
    const transactionsByMonth = {
      '2025-01': [
        { id: '1', type: 'saved', amount: 100, goalId: 'goal1' },
        { id: '2', type: 'expense', amount: 200, goalId: 'goal1' },
      ],
    };

    const result = calculateGoalCurrentAmount('goal1', transactionsByMonth);
    expect(result).toBe(100);
  });
});
```

### updateGoalStatus

```typescript
describe('updateGoalStatus', () => {
  it('should mark goal as completed when currentAmount >= targetAmount', () => {
    const goal: Goal = {
      id: '1',
      name: 'Goal',
      targetAmount: 1000,
      currentAmount: 1000,
      currency: 'USD',
      status: 'active',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    const result = updateGoalStatus(goal);
    
    expect(result.status).toBe('completed');
    expect(result.completedAt).toBeDefined();
  });

  it('should keep goal as active when currentAmount < targetAmount', () => {
    const goal: Goal = {
      id: '1',
      name: 'Goal',
      targetAmount: 1000,
      currentAmount: 500,
      currency: 'USD',
      status: 'active',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    const result = updateGoalStatus(goal);
    
    expect(result.status).toBe('active');
    expect(result.completedAt).toBeUndefined();
  });
});
```

## Интеграционные тесты

### Интеграция с TransactionsProvider

```typescript
describe('GoalsProvider - Transaction Integration', () => {
  it('should automatically recalculate goals when saved transaction is added', async () => {
    const goal = await createGoal({ name: 'Goal', targetAmount: 1000 });
    
    await addTransaction({
      type: 'saved',
      amount: 500,
      goalId: goal.id,
    });

    await waitFor(() => {
      const updatedGoal = getGoalById(goal.id);
      expect(updatedGoal?.currentAmount).toBe(500);
    });
  });

  it('should recalculate goals when saved transaction is updated', async () => {
    const goal = await createGoal({ name: 'Goal', targetAmount: 1000 });
    const transaction = await addTransaction({
      type: 'saved',
      amount: 200,
      goalId: goal.id,
    });

    await updateTransaction(transaction.id, {
      amount: 500,
      type: 'saved',
      goalId: goal.id,
    });

    await waitFor(() => {
      const updatedGoal = getGoalById(goal.id);
      expect(updatedGoal?.currentAmount).toBe(500);
    });
  });

  it('should recalculate goals when saved transaction is deleted', async () => {
    const goal = await createGoal({ name: 'Goal', targetAmount: 1000 });
    const transaction = await addTransaction({
      type: 'saved',
      amount: 500,
      goalId: goal.id,
    });

    await deleteTransaction(transaction.id);

    await waitFor(() => {
      const updatedGoal = getGoalById(goal.id);
      expect(updatedGoal?.currentAmount).toBe(0);
    });
  });
});
```

### Интеграция с NotificationProvider

```typescript
describe('GoalsProvider - Notification Integration', () => {
  it('should create notification when goal is completed', async () => {
    const goal = await createGoal({ name: 'Buy a car', targetAmount: 1000 });
    
    await addTransaction({
      type: 'saved',
      amount: 1000,
      goalId: goal.id,
    });

    await waitFor(() => {
      const notifications = getNotifications();
      const goalNotification = notifications.find(
        n => n.type === 'goal_completed' && n.message.includes('Buy a car')
      );
      expect(goalNotification).toBeDefined();
      expect(goalNotification?.title).toBe('Goal Completed!');
    });
  });
});
```

## Компонентные тесты

### GoalsScreen

```typescript
describe('GoalsScreen', () => {
  it('should display active goals', () => {
    const { getByText } = render(
      <GoalsProvider>
        <GoalsScreen />
      </GoalsProvider>
    );

    expect(getByText('Active Goals')).toBeDefined();
  });

  it('should display empty state when no goals exist', () => {
    const { getByText } = render(
      <GoalsProvider>
        <GoalsScreen />
      </GoalsProvider>
    );

    expect(getByText('No active goals')).toBeDefined();
  });

  it('should display goal progress correctly', () => {
    const goal = { id: '1', name: 'Goal', targetAmount: 1000, currentAmount: 500, status: 'active' };
    
    const { getByText } = render(
      <GoalsProvider initialGoals={[goal]}>
        <GoalsScreen />
      </GoalsProvider>
    );

    expect(getByText('50.0% complete')).toBeDefined();
  });
});
```

### AddGoalModal

```typescript
describe('AddGoalModal', () => {
  it('should validate required fields', async () => {
    const { getByText, getByTestId } = render(
      <AddGoalModal visible={true} onClose={jest.fn()} />
    );

    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => {
      expect(getByText('Please enter a name for the goal')).toBeDefined();
    });
  });

  it('should create goal when form is valid', async () => {
    const onClose = jest.fn();
    const { getByTestId, getByPlaceholderText } = render(
      <AddGoalModal visible={true} onClose={onClose} />
    );

    fireEvent.changeText(getByPlaceholderText('Goal name'), 'Buy a car');
    fireEvent.changeText(getByPlaceholderText('Target amount'), '10000');
    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
```

### GoalSelectionStep

```typescript
describe('GoalSelectionStep', () => {
  it('should display list of active goals', () => {
    const goals = [
      { id: '1', name: 'Goal 1', targetAmount: 1000, currentAmount: 500, status: 'active' },
      { id: '2', name: 'Goal 2', targetAmount: 2000, currentAmount: 1000, status: 'active' },
    ];

    const { getByText } = render(
      <GoalSelectionStep
        selectedGoalId={null}
        onSelect={jest.fn()}
      />
    );

    expect(getByText('Goal 1')).toBeDefined();
    expect(getByText('Goal 2')).toBeDefined();
  });

  it('should call onSelect when goal is selected', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <GoalSelectionStep
        selectedGoalId={null}
        onSelect={onSelect}
      />
    );

    fireEvent.press(getByText('Goal 1'));

    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
```

## E2E тесты

### Сценарий: Создание цели и отслеживание прогресса

```typescript
describe('Goals E2E - Create and Track Goal', () => {
  it('should create goal, add saved transaction, and see progress update', async () => {
    // 1. Navigate to Goals screen
    await element(by.id('goals-button')).tap();

    // 2. Create a new goal
    await element(by.id('create-goal-button')).tap();
    await element(by.id('goal-name-input')).typeText('Buy a car');
    await element(by.id('target-amount-input')).typeText('10000');
    await element(by.id('save-goal-button')).tap();

    // 3. Verify goal is created
    await expect(element(by.text('Buy a car'))).toBeVisible();

    // 4. Add saved transaction linked to goal
    await element(by.id('add-transaction-button')).tap();
    await element(by.text('Saved')).tap();
    await element(by.id('amount-input')).typeText('2000');
    await element(by.id('next-button')).tap();
    await element(by.text('Buy a car')).tap();
    await element(by.id('next-button')).tap();
    await element(by.id('confirm-button')).tap();

    // 5. Verify progress updated
    await expect(element(by.text('20.0% complete'))).toBeVisible();
    await expect(element(by.text('£2,000 / £10,000'))).toBeVisible();
  });
});
```

### Сценарий: Выполнение цели

```typescript
describe('Goals E2E - Goal Completion', () => {
  it('should complete goal when target is reached', async () => {
    // 1. Create goal with target 1000
    await createGoalViaUI('Test Goal', '1000');

    // 2. Add saved transaction for 1000
    await addSavedTransactionViaUI('1000', 'Test Goal');

    // 3. Verify goal is completed
    await expect(element(by.text('Goal Completed!'))).toBeVisible();
    await expect(element(by.id('confetti-animation'))).toBeVisible();

    // 4. Verify goal appears in completed section
    await expect(element(by.text('Completed Goals'))).toBeVisible();
    await expect(element(by.text('Test Goal')).withAncestor(by.id('completed-goals-section'))).toBeVisible();
  });
});
```

## Тестирование производительности

### Пересчет прогресса при большом количестве транзакций

```typescript
describe('GoalsProvider - Performance', () => {
  it('should efficiently recalculate progress with many transactions', async () => {
    const goal = await createGoal({ name: 'Goal', targetAmount: 10000 });
    
    // Create 100 saved transactions
    const transactions = [];
    for (let i = 0; i < 100; i++) {
      transactions.push(
        addTransaction({
          type: 'saved',
          amount: 100,
          goalId: goal.id,
        })
      );
    }
    await Promise.all(transactions);

    const startTime = Date.now();
    await recalculateGoalProgress(goal.id);
    const endTime = Date.now();

    // Should complete in reasonable time (< 1 second)
    expect(endTime - startTime).toBeLessThan(1000);

    const updatedGoal = getGoalById(goal.id);
    expect(updatedGoal?.currentAmount).toBe(10000);
  });
});
```

## Edge Cases

### Тестирование граничных случаев

```typescript
describe('GoalsProvider - Edge Cases', () => {
  it('should handle goal with zero target amount', async () => {
    const goal = await createGoal({ name: 'Goal', targetAmount: 0 });
    expect(goal.status).toBe('active');
  });

  it('should handle goal completion when currentAmount exactly equals targetAmount', async () => {
    const goal = await createGoal({ name: 'Goal', targetAmount: 1000 });
    
    await addTransaction({
      type: 'saved',
      amount: 1000,
      goalId: goal.id,
    });

    await waitFor(() => {
      const updatedGoal = getGoalById(goal.id);
      expect(updatedGoal?.status).toBe('completed');
    });
  });

  it('should handle goal completion when currentAmount exceeds targetAmount', async () => {
    const goal = await createGoal({ name: 'Goal', targetAmount: 1000 });
    
    await addTransaction({
      type: 'saved',
      amount: 1500,
      goalId: goal.id,
    });

    await waitFor(() => {
      const updatedGoal = getGoalById(goal.id);
      expect(updatedGoal?.status).toBe('completed');
      expect(updatedGoal?.currentAmount).toBe(1500);
    });
  });

  it('should handle transaction update that removes goal link', async () => {
    const goal = await createGoal({ name: 'Goal', targetAmount: 1000 });
    const transaction = await addTransaction({
      type: 'saved',
      amount: 500,
      goalId: goal.id,
    });

    await updateTransaction(transaction.id, {
      amount: 500,
      type: 'saved',
      // Remove goalId
    });

    await waitFor(() => {
      const updatedGoal = getGoalById(goal.id);
      expect(updatedGoal?.currentAmount).toBe(0);
    });
  });
});
```

## Запуск тестов

```bash
# Запуск всех тестов
npm test

# Запуск тестов для Goals
npm test GoalsProvider.test.tsx
npm test GoalsScreen.test.tsx

# Запуск с покрытием
npm test -- --coverage

# Запуск E2E тестов (требует настройки Detox)
npm run test:e2e
```

## Покрытие тестами

Целевое покрытие для функции "Цели":
- **GoalsProvider**: 90%+
- **Компоненты UI**: 80%+
- **Утилиты**: 95%+
- **Интеграционные тесты**: Все основные сценарии

## Известные ограничения тестирования

1. **Confetti анимация**: Трудно тестировать визуально, требуется мокирование или скриншот-тесты
2. **Уведомления**: Требуется мокирование Alert API для unit тестов
3. **AsyncStorage**: Требуется мокирование для изоляции тестов
4. **E2E тесты**: Требуют настройки Detox или Expo E2E framework

## Версия документа

- **Дата создания:** 2025-01-27
- **Последнее обновление:** 2025-01-27
- **Версия:** 1.0.0

