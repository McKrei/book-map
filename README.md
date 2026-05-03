# 📚 BookMap — Интерактивная карта книги

Веб-приложение для визуализации структуры книг в формате FB2. Загрузите книгу, и AI автоматически выделит персонажей, ключевые события и их взаимосвязи, построив интерактивную карту в стиле Miro.

![BookMap](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-6-blue) ![Supabase](https://img.shields.io/badge/Supabase-DB-green) ![React Flow](https://img.shields.io/badge/ReactFlow-Canvas-purple)

## Возможности

- 📖 **Загрузка FB2** — парсинг книг в формате FB2 (XML)
- 🤖 **AI-анализ** — автоматическое выделение персонажей, событий и сюжетных линий через OpenRouter
- 🗺️ **Интерактивная карта** — зум, перемещение, перетаскивание блоков (как в Miro)
- 👤 **Персонажи** — карточки с описанием и цветовой кодировкой
- ⚡ **События** — последовательность ключевых сюжетных событий по главам
- 🔄 **Изменения персонажей** — отслеживание развития, трансформаций, откровений
- 🎙️ **Audio Director** — экстракция действующих лиц через Gemini 3.1 Pro и кастинг голосов TTS (см. [`docs/audio-director/`](docs/audio-director/README.md))
- 💾 **Supabase** — сохранение данных в облачную БД

## Быстрый старт

### 1. Установка

```bash
git clone <repo-url>
cd book-map
npm install
```

### 2. Настройка окружения

Скопируйте `.env.example` в `.env` и заполните:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENROUTER_API_KEY=your-openrouter-api-key
VITE_GEMINI_API_KEY=your-google-ai-studio-key
```

> Все ключи можно ввести и через интерфейс Settings (шестерёнка в шапке) — они попадут в `localStorage`.

### 3. Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com)
2. Перейдите в SQL Editor
3. Выполните скрипт из `supabase/migrations/001_initial_schema.sql`
4. Скопируйте URL и Anon Key из Settings → API

### 4. Получение OpenRouter API ключа

1. Зарегистрируйтесь на [openrouter.ai](https://openrouter.ai)
2. Создайте API ключ в разделе Keys
3. Добавьте ключ в `.env`

### 5. Запуск

```bash
npm run dev
```

Откройте [http://localhost:5173](http://localhost:5173)

## Как использовать

1. Откройте приложение
2. Перетащите FB2 файл в зону загрузки (или нажмите, чтобы выбрать)
3. Нажмите «Анализировать книгу»
4. Дождитесь анализа AI (обычно 20-60 секунд)
5. Исследуйте интерактивную карту:
   - **Колесо мыши** — зум
   - **Перетаскивание** — перемещение по карте
   - **Перетаскивание блоков** — перемещение отдельных элементов
   - **Мини-карта** (правый нижний угол) — навигация

## Структура карты

- 🟣 **Главы** — последовательные блоки с номерами и описаниями
- 🟡 **События** — ключевые сюжетные моменты внутри глав
- 🟢 **Персонажи** — карточки с именем, описанием и цветовой кодировкой
- 🔗 **Изменения** — блоки с описанием изменений персонажей после событий

## Технологии

- **React 19** + TypeScript
- **React Flow** — интерактивный канвас
- **Tailwind CSS 4** — стилизация
- **Supabase** — база данных (PostgreSQL)
- **OpenRouter** — доступ к AI моделям
- **Zustand** — управление состоянием
- **fast-xml-parser** — парсинг FB2

## Структура проекта

```
src/
├── components/
│   ├── BookMap/
│   │   ├── BookMap.tsx          # Главный компонент карты
│   │   └── nodes/
│   │       ├── ChapterNode.tsx   # Блок главы
│   │       ├── EventNode.tsx     # Блок события
│   │       ├── CharacterNode.tsx # Блок персонажа
│   │       └── CharacterChangeNode.tsx # Блок изменения
│   ├── Upload/
│   │   └── UploadPage.tsx       # Страница загрузки
│   ├── Layout/
│   │   └── Header.tsx           # Шапка
│   └── BookList/
│       └── BookList.tsx         # Список книг
├── lib/
│   ├── supabase.ts              # Клиент Supabase
│   ├── fb2Parser.ts             # Парсер FB2
│   ├── aiService.ts             # Интеграция с OpenRouter
│   └── mapBuilder.ts            # Построитель карты
├── store/
│   └── bookStore.ts             # Zustand стор
├── types/
│   └── index.ts                 # TypeScript типы
└── pages/
    └── MapPage.tsx              # Страница карты
```
