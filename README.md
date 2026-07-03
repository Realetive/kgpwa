# KGPWA — Knowledge Graph PWA

Редактор графа знаний в формате PWA (Progressive Web Application).

## Стек

| Слой | Технология |
|------|-----------|
| Сборщик | Vite 6+, TypeScript strict, ESM only |
| UI | React 19 (hooks, functional components) |
| State Machine | xState v5 (`setup()` API) |
| Persistence | IndexedDB via `idb` v8+ |
| PWA | `vite-plugin-pwa` + `injectManifest` (кастомный `sw.ts`) |
| Роутинг | `react-router-dom` v7 (`createBrowserRouter` + data loaders) |
| Граф | `@antv/g6` v5 (canvas, lazy-loaded) |
| Стили | CSS Modules + CSS custom properties |
| Тесты | Vitest + @testing-library/react |

## Установка

```bash
npm install
```

## Скрипты

```bash
npm run dev        # Dev server с HMR
npm run build      # Production сборка (tsc + vite build)
npm run preview    # Превью production сборки
npm run lint       # TypeScript проверка
npm run test       # Vitest (однократный прогон)
npm run test:watch # Vitest в watch-режиме
```

## Архитектура

### Двухфазный старт

1. `main.tsx` → мгновенный рендер `AppShell` (skeleton на месте графа и сайдбара)
2. `queueMicrotask` → запуск `bootMachine`, которая асинхронно открывает IndexedDB и восстанавливает сохранённый граф

### Машины xState v5

- **`bootMachine`** — инициализация: `cold → openingDb → loadingSnapshot → ready | readyFresh | error`
- **`graphMachine`** — операции с графом: `idle → saving → idle`, undo/redo, debounced autosave 500ms
- **`historyMachine`** — circular buffer истории в IndexedDB (max 50 записей)

### IndexedDB

- **DB name:** `kg-app-v1`, version 1
- Stores: `snapshots`, `history`, `meta`
- Graceful degradation: при повреждённом снапшоте — чистый старт с предупреждением

### Service Worker

- `injectManifest` стратегия с кастомным `src/sw.ts`
- Navigation: `NetworkFirst` (3s timeout)
- Assets (JS/CSS/fonts): `CacheFirst` (30d)
- Images: `StaleWhileRevalidate`
- API: `NetworkFirst` (5s timeout)

## Структура проекта

```
src/
├── main.tsx                    # Входная точка: немедленный рендер + boot
├── App.tsx                     # Router + Suspense границы
├── sw.ts                       # Service Worker
├── machines/                   # xState v5 setup() машины
├── persistence/                # IndexedDB слой (db, snapshots, history)
├── graph/                      # G6 визуализация, адаптер, RDF сериализация
├── components/                 # React компоненты
├── hooks/                      # Кастомные хуки
├── types/                      # TypeScript типы
├── styles/                     # CSS tokens, reset, skeleton
└── __tests__/                  # Vitest тесты
```
