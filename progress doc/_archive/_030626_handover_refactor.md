# Refactoring Handover — UI/UX Parity Audit

> **Date:** 2026-03-06  
> **Monolith source:** `frontend/index.html` (1293 lines), `frontend/style.css` (2018 lines), `frontend/app.js` (4663 lines)  
> **Next.js target:** `frontend-next/`  
> **Dev server:** `npm run dev -- -p 3001` → localhost:3001  
> **Monolith server:** localhost:8080

---

## ✅ What's Done

### Foundation
- Next.js 16 + Tailwind v4 project in `frontend-next/`
- Feature-Sliced Design: `src/features/`, `src/shared/`, `src/app/`
- `globals.css` ported from monolith's complete `style.css` (CSS vars, card/form/button/nav/pill/toast/progress-bar/metric/converter styles)
- Zustand stores: `authStore`, `toastStore`, `pomodoroStore`
- Shared types: `User`, `CheckIn`, `Run`, `Book`, `JournalEntry`, `WorkTask`, `SocialConnection`, `Expense`
- `fetchWithAuth` API client

### Navigation (7 tabs — exact monolith match)
- BottomNav with exact SVG icon paths from monolith
- Tab order: Running → Journal → Reading → Work → Social → Expense → Summary
- Routes: `/`, `/journal`, `/reading`, `/work`, `/social`, `/expense`, `/summary`
- Active state: neon-green `var(--accent)` background

### Pages Built
| Route | Feature | Components |
|---|---|---|
| `/` | Running + Daily Log (merged) | `DailyLogForm`, `ExerciseList`, `StravaCard`, AI Plan card |
| `/journal` | Journal | `JournalEntryForm`, `AIPromptCard` |
| `/reading` | Reading | `BookForm` |
| `/work` | Work | `WorkPlanner` + `PomodoroStore` |
| `/social` | Social | `SocialForm` |
| `/expense` | Expense | `ExpenseForm`, `CurrencyConverter` |
| `/summary` | Summary | `Scorecards` (Body/Mind/Spirit/Social/Financial), `YearProgress` |

### Build Status
- `npx tsc --noEmit` → **0 errors**
- `npm run build` → **8 routes prerendered**

---

## 🔴 Remaining Parity Gaps

### 1. Components Using React State Instead of Monolith CSS Classes

The React components currently use **Tailwind utility classes** (e.g. `className="grid grid-cols-2 gap-3"`) instead of the monolith's vanilla CSS classes (`.form-row`, `.card`, `.card-header`, `.form-group`, `.btn`, `.btn-primary`). 

**Fix approach:** Refactor each React component to use the monolith's exact CSS class names that are now in `globals.css`. For example:

```tsx
// CURRENT (Tailwind utilities)
<div className="bg-bg-card border border-border rounded-[var(--radius-custom)] p-[32px_24px] mb-6 shadow">

// SHOULD BE (monolith classes)
<div className="card">
```

**Files to update:**
- `src/shared/components/Card.tsx` → use `.card`, `.card-header` classes
- `src/shared/components/Button.tsx` → use `.btn`, `.btn-primary`, `.btn-secondary` classes
- `src/shared/components/Input.tsx` → use `.form-group` wrapper, `.form-row` for grid
- `src/shared/components/Pill.tsx` → use `.pill`, `.pill.active` classes
- `src/shared/components/Toast.tsx` → use `.toast`, `.toast.show`, `.toast-error` classes
- `src/shared/components/ThemeToggle.tsx` → use `.toggle-group`, `.toggle` classes
- All feature components (DailyLogForm, JournalEntryForm, BookForm, etc.)

### 2. Missing Features Per Page

#### Running Page (`/`) — gaps:
- [ ] **Activity Calendar** widget (`.cal-widget`, `.cal-grid`, `.cal-day`, etc.) — monolith lines 216-232
- [ ] **Recent Daily Logs** history list — monolith line 226-231
- [ ] **Strava "Connected" pill** and profile link — monolith lines 242-250
- [ ] **Load more runs** button — monolith line 257-258
- [ ] **Meditation duration** field (appears when checkbox is checked) — monolith lines 196-198
- [ ] **Delete/Cancel edit** buttons on Daily Log form — monolith lines 207-211

#### Journal Page (`/journal`) — gaps:
- [ ] **Journal Tool Tabs** (🎲 Random, 🙏 Gratitude, ✨ Daily AI, 🌀 Mix, 📜 All Prompts) — monolith lines 421-428
- [ ] **Random Prompt** section — monolith lines 515-530
- [ ] **Gratitude Bucket** form — monolith lines 491-513
- [ ] **Mix & Reflect** section — monolith lines 472-489
- [ ] **Prompt List** (100 prompts) — monolith lines 532-547
- [ ] **Voice journaling** mic button — monolith lines 580-591
- [ ] **Journal Calendar** — monolith lines 603-610
- [ ] **Recent Journals** history — monolith lines 612-618
- [ ] **Gratitude history** list — monolith lines 620-629

#### Reading Page (`/reading`) — gaps:
- [ ] **Reading stats / Progress Goal** bar — monolith lines 286-290
- [ ] **Auto-search** (Open Library) on title input — monolith lines 299-303
- [ ] **Cover image** URL/upload and preview — monolith lines 351-367
- [ ] **Reading Calendar** — monolith lines 385-392
- [ ] **My Books** list (with cover thumbnails) — monolith lines 394-404
- [ ] **Reflection Prompts** (on book finish) — monolith lines 406-415

#### Work Page (`/work`) — gaps:
- [ ] **Tiimo-style timeline layout** with time column + color bars — monolith CSS lines 1673-1850
- [ ] **Task category colors** (`.cat-school`, `.cat-dsa`, etc.) — monolith CSS lines 1605-1636
- [ ] **Pomodoro timer** with conic-gradient ring — monolith lines 894-908, CSS lines 1926-2017
- [ ] **Daily Summary** bar chart — monolith lines 911-920
- [ ] **Work Calendar** — monolith line 923-930
- [ ] **Today's Focus** stats card — monolith lines 932-950
- [ ] **Work Insights** AI button — monolith lines 952-961
- [ ] **Recent Sessions** with edit form — monolith lines 963-1011

#### Social Page (`/social`) — gaps:
- [ ] **Duration field** (hidden by default, shown conditionally) — monolith line 1054-1057
- [ ] **Social Calendar** — monolith lines 1082-1089
- [ ] **Social Stats** (30 days) — monolith lines 1091-1099
- [ ] **Recent Connections** history — monolith lines 1102-1109

#### Expense Page (`/expense`) — gaps:
- [ ] **Expense Calendar** — monolith lines 1171-1178
- [ ] **Spending Summary** (USD) — monolith lines 1201-1210
- [ ] **Recent Expenses** history — monolith lines 1212-1221

#### Summary Page (`/summary`) — gaps:
- [ ] **Period selector tabs** (This Week / This Month / Quarter) — monolith lines 637-644
- [ ] **Check-in Streak** bar — monolith lines 646-657
- [ ] **AI Summary & Insights** card with Generate button — monolith lines 659-677
- [ ] **Quick metrics grid** (KM Run, Meditation count) — monolith lines 679-690
- [ ] **Year Progress** with "View All Periods" toggle — monolith lines 812-822

### 3. Desktop Responsive Layout

The monolith's `@media (min-width: 768px)` does this (lines 1080-1166):
- `.main` max-width → 1100px
- `.page.active` becomes a **2-column grid** (`grid-template-columns: repeat(auto-fit, minmax(450px, 1fr))`)
- `.nav` moves to **top center** as a floating pill bar (`top: 20px`, `border-radius: 30px`, `max-width: 600px`)
- `.header` gets `margin-top: 80px` to clear the floating nav
- `.span-all` class → `grid-column: 1 / -1`

**Current Next.js doesn't have this 2-column desktop layout.** The BottomNav stays at the bottom on desktop.

### 4. Missing Shared Components

- [ ] **Calendar widget** (`.cal-widget`) — used on Running, Journal, Reading, Work, Social, Expense pages
- [ ] **History list** (`.history-list-container`, `.history-item`) — used for Recent Daily Logs, Recent Journals, My Books, Recent Sessions, Recent Connections, Recent Expenses
- [ ] **Metrics grid** (`.metrics-grid`, `.metric-card`) — used on Summary page
- [ ] **Review period tabs** (`.review-period-tabs`, `.period-tab`) — used on Summary and Journal pages

### 5. Functional JavaScript Parity

The monolith's `app.js` (4663 lines) contains all the business logic. Key functions NOT yet ported:
- API calls + DOM rendering for history lists
- Calendar rendering (`renderCalendar()`)
- Strava OAuth flow
- AI prompt generation (Random, Mix, Daily AI)
- Voice journaling (Web Speech API)
- Pomodoro timer logic
- Work task CRUD + drag-to-reorder
- Expense currency conversion (exchange rate API)
- Summary data aggregation (weekly/monthly/quarterly)
- Check-in streak calculation
- Book search (Open Library API)
- Edit/Delete flows for all forms

---

## 📂 File Map

```
frontend-next/src/
├── app/
│   ├── globals.css          ← PORTED from monolith style.css
│   ├── layout.tsx           ← Root layout with BottomNav + ToastProvider
│   ├── page.tsx             ← Running + Daily Log (merged)
│   ├── journal/page.tsx
│   ├── reading/page.tsx
│   ├── work/page.tsx
│   ├── social/page.tsx
│   ├── expense/page.tsx
│   └── summary/page.tsx
├── features/
│   ├── auth/         (LoginForm, authStore)
│   ├── checkin/      (DailyLogForm, ExerciseList, api)
│   ├── running/      (RunForm, StravaCard, api)
│   ├── journal/      (JournalEntryForm, AIPromptCard, api)
│   ├── reading/      (BookForm, api)
│   ├── work/         (WorkPlanner, pomodoroStore, api)
│   ├── social/       (SocialForm, api)
│   ├── expense/      (ExpenseForm, CurrencyConverter, api)
│   └── summary/      (Scorecards, YearProgress, api)
└── shared/
    ├── api/client.ts
    ├── components/   (BottomNav, Card, Button, Input, Pill, Toast, ThemeToggle)
    ├── lib/          (toastStore, authStore)
    └── types/        (User, CheckIn, Run, Book, JournalEntry, WorkTask, SocialConnection)
```

---

## 🎯 Recommended Next Steps (Priority Order)

1. **Refactor all components to use monolith CSS classes** — biggest visual bang for effort
2. **Add desktop responsive layout** — floating top nav pill, 2-column grid
3. **Build Calendar widget** as shared component — used on 6 pages
4. **Build History list** as shared component — used on 6 pages
5. **Wire API calls** to populate data from backend
6. **Add remaining Journal sections** (Gratitude, Random, Mix, Prompt List)
7. **Add Tiimo-style Work planner** timeline view
8. **Port remaining app.js** business logic
