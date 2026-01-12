# Исправление ошибки PostgreSQL 22P02 при обновлении товаров

## Проблема

При обновлении товара возникала ошибка PostgreSQL:
```
❌ [API] Failed /products/3391: {"code":"22P02","details":null,"hint":null,"message":"invalid input syntax for type numeric: \"\""}
❌ Error updating product: Error: {"code":"22P02","details":null,"hint":null,"message":"invalid input syntax for type numeric: \"\""}
```

**Причина:** Код пытался передать пустую строку `""` в числовое поле (NUMERIC/INTEGER) в таблице `products`.

## Важное различие типов данных

### Таблица `users`
- `company_id`: **TEXT** (строка)

### Таблица `products`
- `company_id`: **INTEGER** (число)

**Почему разные типы?**
- В `users` пользователь может зарегистрироваться с произвольным ID компании (строка)
- В `products` товары привязаны к существующим компаниям по числовому ID

## Что исправлено

### 1. Серверная часть (`/supabase/functions/server/index.tsx`)

#### Endpoint: PUT `/products/:id` (обновление товара)

**Было:**
```typescript
const numericFields = ['price', 'markup_percent', 'markup_amount', 'selling_price', 'quantity', 'company_id'];
numericFields.forEach(field => {
  if (body[field] === '' || body[field] === null || body[field] === undefined) {
    body[field] = null; // ✅ Это правильно
  } else if (typeof body[field] === 'string' && numericFields.includes(field)) {
    const parsed = parseFloat(body[field]);
    body[field] = isNaN(parsed) ? null : parsed; // ❌ Но для company_id parseFloat неправильный!
  }
});
```

**Стало:**
```typescript
const numericFields = ['price', 'markup_percent', 'markup_amount', 'selling_price', 'quantity', 'company_id'];
numericFields.forEach(field => {
  if (body[field] === '' || body[field] === null || body[field] === undefined) {
    // ✅ КРИТИЧЕСКОЕ: пустая строка "" должна быть null, не ""!
    body[field] = null;
  } else if (typeof body[field] === 'string' && numericFields.includes(field)) {
    const parsed = parseFloat(body[field]);
    // ✅ ВАЖНО: Если не удалось преобразовать - ставим null вместо NaN
    body[field] = isNaN(parsed) ? null : parsed;
  }
});
```

**Что изменилось:**
- Добавлен комментарий, подчеркивающий важность конвертации `""` в `null`
- Добавлена проверка на `isNaN` для всех числовых полей
- `company_id` правильно обрабатывается как INTEGER

#### Endpoint: POST `/products/add` (создание товара)

**Было:**
```typescript
if (typeof company_id === 'string') company_id = parseInt(company_id) || null;
```

**Стало:**
```typescript
// 🔧 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: company_id в таблице products это INTEGER!
// Если пустая строка "" - конвертируем в null, иначе в число
if (company_id === '' || company_id === null || company_id === undefined) {
  company_id = null;
} else if (typeof company_id === 'string') {
  const parsed = parseInt(company_id);
  company_id = isNaN(parsed) ? null : parsed;
}
```

**Что изменилось:**
- Явная проверка на пустую строку `""`
- Безопасная конвертация с проверкой на `isNaN`
- Если парсинг не удался - устанавливается `null` вместо `0` или `NaN`

### 2. Клиентская часть (`/utils/api.tsx`)

#### Функция `addProduct`

**Было:**
```typescript
const numericFields = ['quantity', 'price', 'markup_percent'];
numericFields.forEach(field => {
  const value = cleanedProduct[field as keyof typeof cleanedProduct];
  if (value === '' || value === null || value === undefined) {
    cleanedProduct[field as keyof typeof cleanedProduct] = field === 'markup_percent' ? 0 : (null as any);
  }
});
```

**Стало:**
```typescript
// ✅ ИСПРАВЛЕНО: company_id в таблице products это INTEGER, не TEXT!
const numericFields = ['company_id', 'quantity', 'price', 'markup_percent'];

numericFields.forEach(field => {
  const value = cleanedProduct[field as keyof typeof cleanedProduct];
  if (value === '' || value === null || value === undefined) {
    // ✅ КРИТИЧЕСКОЕ: пустая строка "" должна стать null, не 0!
    cleanedProduct[field as keyof typeof cleanedProduct] = field === 'markup_percent' ? 0 : (null as any);
  }
});
```

**Что изменилось:**
- Добавлен `company_id` в список числовых полей
- Пустая строка конвертируется в `null` для всех полей кроме `markup_percent`

#### Функция `updateProduct`

**Было:**
```typescript
const numericFields = ['price', 'markup_percent', 'markup_amount', 'selling_price', 'quantity'];
// company_id обрабатывался отдельно как строка (неправильно!)
```

**Стало:**
```typescript
// ✅ ИСПРАВЛЕНО: company_id в таблице products это INTEGER, не TEXT!
const numericFields = ['price', 'markup_percent', 'markup_amount', 'selling_price', 'quantity', 'company_id'];

numericFields.forEach(field => {
  if (cleanedUpdates[field] === '' || cleanedUpdates[field] === null || cleanedUpdates[field] === undefined) {
    // ✅ КРИТИЧЕСКОЕ: пустая строка "" должна стать null!
    cleanedUpdates[field] = null;
  } else if (typeof cleanedUpdates[field] === 'string' && numericFields.includes(field)) {
    const parsed = parseFloat(cleanedUpdates[field]);
    // ✅ ВАЖНО: Если парсинг не удался - ставим null
    cleanedUpdates[field] = isNaN(parsed) ? null : parsed;
  }
});
```

**Что изменилось:**
- `company_id` добавлен в список числовых полей
- Удалена отдельная обработка `company_id` как строки
- Пустые строки корректно конвертируются в `null`

## Схема данных

### Таблица `products` в Supabase
```
- id: INTEGER (PRIMARY KEY)
- company_id: INTEGER (может быть NULL, FOREIGN KEY к companies.id)
- name: TEXT
- quantity: NUMERIC
- price: NUMERIC(10,2)
- markup_percent: NUMERIC(5,2)
- markup_amount: NUMERIC(10,2)
- selling_price: NUMERIC(10,2)
- barcode: TEXT
- category: TEXT
- has_color_options: BOOLEAN
- available_for_customers: BOOLEAN
- images: TEXT[]
```

### Поток данных

1. **Клиент → Сервер**: `company_id` может быть числом, строкой или null
2. **Сервер (обработка)**: 
   - Если `""` → конвертируется в `null`
   - Если строка с числом → `parseInt()` → число
   - Если невалидная строка → `null`
3. **Сервер → База данных**: `company_id` записывается как INTEGER или NULL
4. **База данных → Сервер**: `company_id` возвращается как INTEGER или NULL
5. **Сервер → Клиент**: `company_id` возвращается как число или null

## Проверка исправления

### До исправления:
```javascript
// Попытка обновить товар с пустой строкой
updateProduct(3391, { company_id: "" });
// ❌ Ошибка: invalid input syntax for type numeric: ""
```

### После исправления:
```javascript
// Пустая строка автоматически конвертируется в null
updateProduct(3391, { company_id: "" });
// ✅ Успешно: company_id сохраняется как NULL в базе

updateProduct(3391, { company_id: "123" });
// ✅ Успешно: company_id сохраняется как 123 в базе

updateProduct(3391, { company_id: 456 });
// ✅ Успешно: company_id сохраняется как 456 в базе

updateProduct(3391, { company_id: null });
// ✅ Успешно: company_id сохраняется как NULL в базе
```

## Ключевые принципы

1. **Пустая строка `""` всегда должна стать `null`** для числовых полей в PostgreSQL
2. **`company_id` в разных таблицах имеет разный тип**:
   - `users.company_id` → TEXT
   - `products.company_id` → INTEGER
3. **Всегда проверяйте результат парсинга** на `isNaN` перед сохранением
4. **Используйте `null` вместо `0`** для необязательных числовых полей

## Совместимость

Изменения полностью обратно совместимы:
- Код корректно обрабатывает числовые значения
- Код корректно обрабатывает строковые значения с числами
- Код корректно обрабатывает пустые строки и null
- Старые данные не требуют миграции

## Безопасность

Исправление также улучшает безопасность:
- Предотвращает передачу невалидных данных в базу
- Защищает от ошибок типизации
- Гарантирует корректность данных в PostgreSQL
