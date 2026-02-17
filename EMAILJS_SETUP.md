# Настройка EmailJS для восстановления пароля

## Шаг 1: Регистрация на EmailJS

1. Перейдите на [https://www.emailjs.com/](https://www.emailjs.com/)
2. Нажмите "Sign Up" и создайте бесплатный аккаунт
3. Подтвердите email

## Шаг 2: Добавление Email Service

1. В панели управления перейдите в "Email Services"
2. Нажмите "Add New Service"
3. Выберите ваш email провайдер (Gmail, Outlook, Yahoo и т.д.)
4. Следуйте инструкциям для подключения вашего email
5. Скопируйте **Service ID** (например: `service_xvoldata`)

## Шаг 3: Создание Email Template

1. Перейдите в "Email Templates"
2. Нажмите "Create New Template"
3. Используйте следующий шаблон:

**Subject:**
```
Восстановление пароля - xVolData
```

**Content:**
```html
<h2>Восстановление пароля</h2>

<p>Здравствуйте, {{to_name}}!</p>

<p>Вы запросили восстановление пароля для вашего аккаунта в {{app_name}}.</p>

<p>Для создания нового пароля перейдите по ссылке:</p>

<p><a href="{{reset_link}}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px;">Восстановить пароль</a></p>

<p>Или скопируйте эту ссылку в браузер:</p>
<p>{{reset_link}}</p>

<p><strong>Ссылка действительна в течение 1 часа.</strong></p>

<p>Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.</p>

<hr>
<p style="color: #666; font-size: 12px;">
  Это автоматическое письмо от xVolData - Minecraft Mod Search<br>
  <a href="https://xvold.github.io/xVolData/">https://xvold.github.io/xVolData/</a>
</p>
```

4. Сохраните шаблон
5. Скопируйте **Template ID** (например: `template_reset`)

## Шаг 4: Получение Public Key

1. Перейдите в "Account" → "General"
2. Найдите раздел "API Keys"
3. Скопируйте **Public Key**

## Шаг 5: Обновление кода

Откройте файл `src/AuthModal.tsx` и замените следующие значения:

```typescript
await emailjs.send(
  'service_xvoldata',  // ← Замените на ваш Service ID
  'template_reset',    // ← Замените на ваш Template ID
  {
    to_email: result.email,
    to_name: emailOrUsername,
    reset_link: resetLink,
    app_name: 'xVolData',
  },
  'YOUR_PUBLIC_KEY'    // ← Замените на ваш Public Key
);
```

## Шаг 6: Тестирование

1. Соберите проект: `npm run build`
2. Разверните на GitHub Pages: `npx gh-pages -d dist`
3. Попробуйте восстановить пароль через форму

## Лимиты бесплатного плана

- 200 писем в месяц
- Достаточно для небольшого проекта
- При необходимости можно перейти на платный план

## Альтернативы

Если не хотите использовать EmailJS, можно:
1. Показывать ссылку для восстановления прямо в интерфейсе (текущая реализация fallback)
2. Использовать другой сервис (SendGrid, Mailgun, AWS SES)
3. Создать собственный backend для отправки email

## Безопасность

⚠️ **Важно:** Public Key EmailJS безопасно использовать в клиентском коде, так как он предназначен для публичного использования. Однако:

- Настройте домен в EmailJS для защиты от спама
- Включите reCAPTCHA в настройках EmailJS
- Ограничьте количество запросов с одного IP

## Поддержка

Если возникли проблемы:
- Документация EmailJS: https://www.emailjs.com/docs/
- Проверьте спам-папку при тестировании
- Убедитесь, что email service правильно настроен
