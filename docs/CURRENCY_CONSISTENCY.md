# Currency Consistency - Documentation

## Обзор

Валюта, выбранная пользователем в онбординге, должна применяться везде в приложении. Все компоненты используют `settings.currency` из `SettingsProvider` для форматирования и отображения валюты.

## Реализация

### Централизованное хранение

Валюта хранится в `SettingsProvider` в `settings.currency` и сохраняется в AsyncStorage.

### Утилиты форматирования

#### `formatCurrency(value, currency)`
Форматирует число как валюту с использованием `Intl.NumberFormat`.

```typescript
formatCurrency(100, 'GBP') // "£100.00"
formatCurrency(100, 'USD') // "$100.00"
formatCurrency(100, 'EUR') // "€100.00"
```

#### `getCurrencySymbol(currency)`
Получает символ валюты для заданного кода валюты.

```typescript
getCurrencySymbol('GBP') // "£"
getCurrencySymbol('USD') // "$"
getCurrencySymbol('EUR') // "€"
```

### Использование в компонентах

#### HomeScreen
```typescript
const { settings } = useSettings();
formatCurrency(totals.remaining, settings.currency)
formatCurrency(totals.income, settings.currency)
formatCurrency(totals.expenses, settings.currency)
formatCurrency(totals.saved, settings.currency)
```

#### DetailsScreen
```typescript
const { settings } = useSettings();
formatCurrency(totals.remaining, settings.currency)
formatCurrency(stats.amount, settings.currency)
```

#### AddTransactionModal
```typescript
const { settings } = useSettings();
<AmountInputStep currency={settings.currency} />
<ConfirmStep currency={settings.currency} />
```

#### LastTransactionPreview
```typescript
<LastTransactionPreview currency={settings.currency} />
```

#### OnboardingScreen
```typescript
// Использует getCurrencySymbol для отображения символа валюты
{getCurrencySymbol(currency || 'USD')}
```

## Проверка консистентности

### Все места использования валюты:

1. ✅ **HomeScreen** - использует `settings.currency`
2. ✅ **DetailsScreen** - использует `settings.currency`
3. ✅ **AddTransactionModal** - использует `settings.currency`
4. ✅ **AmountInputStep** - получает currency через пропсы
5. ✅ **ConfirmStep** - получает currency через пропсы
6. ✅ **LastTransactionPreview** - получает currency через пропсы
7. ✅ **OnboardingScreen** - использует `getCurrencySymbol()` для символа

### Fallback значения

Fallback на 'USD' используется только в следующих случаях:
- При инициализации, если settings еще не загружены
- При сбросе настроек к дефолтам
- В параметрах функций как дефолтное значение (но всегда переопределяется)

## Важные моменты

1. **Никакого хардкода валют**: Все символы валют получаются через `getCurrencySymbol()`
2. **Единый источник истины**: `settings.currency` из `SettingsProvider`
3. **Автоматическое обновление**: При изменении валюты все компоненты обновляются автоматически через React Context
4. **Правильное форматирование**: Используется `Intl.NumberFormat` для корректного форматирования в зависимости от локали

## Тестирование

Для проверки консистентности валюты:

1. Выберите валюту в онбординге (например, GBP)
2. Проверьте, что везде отображается выбранная валюта:
   - HomeScreen (баланс, доход, расходы, сбережения)
   - DetailsScreen (остаток, суммы по категориям)
   - AddTransactionModal (ввод суммы, подтверждение)
   - LastTransactionPreview (последняя транзакция)
3. Измените валюту в Settings
4. Убедитесь, что все компоненты обновились

## Известные ограничения

- Поддерживаются только валюты, которые поддерживает `Intl.NumberFormat`
- Для нестандартных валют может потребоваться дополнительная настройка

