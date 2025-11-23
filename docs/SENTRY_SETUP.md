# Sentry Error Tracking Setup

## Обзор

Приложение интегрировано с Sentry для отслеживания ошибок, крашей и мониторинга производительности. Sentry автоматически собирает информацию о сбоях, ошибках JavaScript и нативных крашах.

## Настройка

### 1. Получение DSN

1. Зарегистрируйтесь на [sentry.io](https://sentry.io) или войдите в существующий аккаунт
2. Создайте новый проект (выберите React Native)
3. Скопируйте DSN из настроек проекта: `Settings → Projects → [Your Project] → Client Keys (DSN)`

### 2. Конфигурация

DSN можно настроить двумя способами:

#### Способ 1: Переменная окружения (рекомендуется)

Создайте файл `.env` в корне проекта (не коммитьте его в git):

```bash
EXPO_PUBLIC_SENTRY_DSN=https://your-key@o0.ingest.sentry.io/your-project-id
```

#### Способ 2: app.json

Отредактируйте `app.json`:

```json
{
  "expo": {
    "extra": {
      "sentryDsn": "https://your-key@o0.ingest.sentry.io/your-project-id"
    }
  }
}
```

### 3. Production Builds

Для production билдов через EAS Build:

1. Добавьте DSN в EAS Secrets:
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "your-dsn-here"
   ```

2. Или используйте переменные окружения в `eas.json`:
   ```json
   {
     "build": {
       "production": {
         "env": {
           "EXPO_PUBLIC_SENTRY_DSN": "your-dsn-here"
         }
       }
     }
   }
   ```

## Функциональность

### Автоматическое отслеживание

- **JavaScript ошибки**: Все необработанные исключения автоматически отправляются в Sentry
- **Нативные краши**: iOS/Android краши отслеживаются автоматически
- **React Error Boundary**: Ошибки компонентов перехватываются и логируются
- **Производительность**: Автоматическое отслеживание медленных операций (100% в dev, 10% в prod)

### Ручное логирование

Используйте сервис `src/services/sentry.ts`:

```typescript
import { logError, logWarning, logInfo, addBreadcrumb } from '@/services/sentry';

// Логирование ошибки
logError(new Error('Something went wrong'), {
  component: 'MyComponent',
  userId: '123',
});

// Логирование предупреждения
logWarning('Low balance detected', {
  balance: 100,
});

// Добавление breadcrumb
addBreadcrumb('User clicked button', 'user-action', 'info', {
  buttonId: 'submit',
});
```

### Контекст и теги

```typescript
import { setUser, setTag, setContext } from '@/services/sentry';

// Установка пользователя
setUser({ id: '123', username: 'john' });

// Установка тега для фильтрации
setTag('environment', 'production');

// Установка контекста
setContext('app', {
  version: '1.0.0',
  buildNumber: '123',
});
```

## Интеграция в коде

### Где логируются ошибки

1. **SettingsProvider** (`src/state/SettingsProvider.tsx`):
   - Ошибки загрузки настроек (hydration)
   - Ошибки сохранения настроек

2. **TransactionsProvider** (`src/state/TransactionsProvider.tsx`):
   - Ошибки загрузки транзакций
   - Ошибки сохранения транзакций
   - Ошибки синхронизации при переключении месяцев

3. **AppRoot** (`src/AppRoot.tsx`):
   - Ошибки загрузки данных
   - React Error Boundary для компонентов

### Breadcrumbs

Автоматически добавляются breadcrumbs для:
- Загрузки данных из storage
- Сохранения данных в storage
- Навигации между экранами
- Пользовательских действий (retry, etc.)

## Конфигурация

Основная конфигурация находится в `src/services/sentry.ts`:

- **Environment**: Автоматически определяется (`development` / `production`)
- **Release**: Формат `exgo@{version}` (из app.json)
- **Sample Rate**: 100% в development, 10% в production
- **Screenshots**: Включены для ошибок
- **Native Crash Handling**: Включено

## Безопасность и приватность

- **Фильтрация данных**: Email и другие чувствительные данные автоматически удаляются из отчетов
- **Локальные данные**: Финансовые данные пользователей не отправляются в Sentry
- **Контекст**: Отправляется только техническая информация (компонент, операция, код ошибки)

## Отключение Sentry

Если DSN не настроен, Sentry автоматически отключается. Приложение продолжит работать нормально, но ошибки не будут отслеживаться.

В development режиме вы увидите предупреждение в консоли:
```
[Sentry] DSN not configured. Error tracking disabled.
```

## Тестирование

Для тестирования интеграции:

1. Добавьте тестовую кнопку, которая выбрасывает ошибку:
   ```tsx
   <Button title="Test Error" onPress={() => {
     throw new Error('Test error for Sentry');
   }} />
   ```

2. Проверьте, что ошибка появилась в Sentry dashboard

## Дополнительные ресурсы

- [Sentry React Native Documentation](https://docs.sentry.io/platforms/react-native/)
- [Expo + Sentry Guide](https://docs.expo.dev/guides/using-sentry/)
- [Sentry Dashboard](https://sentry.io)

## Версия

- Дата: 2025-01-XX
- Sentry SDK: @sentry/react-native (latest)
- Expo SDK: 54

