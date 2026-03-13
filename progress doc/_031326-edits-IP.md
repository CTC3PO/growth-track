# Implementation Plan - App Improvements (031326)

This plan outlines the improvements and fixes for the Mindful Life (Growth Track) app based on the latest feedback and screenshots.

## Proposed Changes

### [General]
- **AI Label Removal**: Search and remove "AI" from all UI labels (e.g., "AI daily prompt" -> "Daily Prompt", "AI insights" -> "Insights").
- **Navigation Rearrangement**: Reorder and rename tabs in `BottomNav.tsx` to: People, Write, Work, Daily Log, Money, Book, Summary.

### [Branding & UI]
#### [MODIFY] [globals.css](file:///Users/chautran/Documents/projects/_mindful-life-03.2026/growth-track/frontend-next/src/app/globals.css)
- Add a third theme class `.vintage` with beigy/coffee color palette.
- Ensure accessible contrast for text.

#### [MODIFY] [ThemeToggle.tsx](file:///Users/chautran/Documents/projects/_mindful-life-03.2026/growth-track/frontend-next/src/shared/components/ThemeToggle.tsx)
- Update to support cycling through 3 themes: Light, Dark, and Vintage.

### [Journal / Write Tab]
#### [MODIFY] [JournalEntryForm.tsx](file:///Users/chautran/Documents/projects/_mindful-life-03.2026/growth-track/frontend-next/src/features/journal/components/JournalEntryForm.tsx)
- Fix mobile overflow for the Date box.
- Fix "tap to dictate" capitalization issue (prevent auto-capitalizing the first word after a pause if not needed).
- Fix bug where editing text then continuing dictation reverts the manual edits.
- Implement fullscreen pop-up for viewing journal entries when clicking "see more".

#### [MODIFY] [JournalToolTabs.tsx](file:///Users/chautran/Documents/projects/_mindful-life-03.2026/growth-track/frontend-next/src/features/journal/components/JournalToolTabs.tsx)
- Remove the "Mix" tab.
- Reorder tabs to put **Gratitude** first, then **Random**.
- Rename "Daily AI" to "Daily Prompt".
- Enhance prompt generation logic for more specificity (referencing Stoicism, Plum Village practice, and daily life principles).

### [Work Tab]
#### [MODIFY] [WorkPlanner.tsx](file:///Users/chautran/Documents/projects/_mindful-life-03.2026/growth-track/frontend-next/src/features/work/components/WorkPlanner.tsx)
- Redesign task layout to fit on 2 lines instead of 3.
- Replace "Mark as Done" button with a checkbox next to the entry.
- Change Pomodoro input to "estimated time to complete" (e.g., "2 hours").
- Update categories: Add "Projects", "Admin"; rename "Daily Task" to "Daily Life".

#### [MODIFY] [WorkInsights.tsx](file:///Users/chautran/Documents/projects/_mindful-life-03.2026/growth-track/frontend-next/src/features/work/components/WorkInsights.tsx)
- Remove "Generate Work Insights" button and associated logic.

#### [MODIFY] [WorkFocusCard.tsx](file:///Users/chautran/Documents/projects/_mindful-life-03.2026/growth-track/frontend-next/src/features/work/components/WorkFocusCard.tsx)
- Change display from "Icon x Number" to just listing the number of tomato icons based on the estimated time/task weight.

### [Reading / Book Tab]
#### [MODIFY] [BookForm.tsx](file:///Users/chautran/Documents/projects/_mindful-life-03.2026/growth-track/frontend-next/src/features/reading/components/BookForm.tsx)
- Update categories to 10-12 Goodreads-style typical categories (Literary Fiction, Mystery, Sci-Fi, Fantasy, Biography, History, Self-Help, Business, Science, Philosophy, Health, Poetry).

### [Social / People Tab]
#### [MODIFY] [SocialHistoryList.tsx](file:///Users/chautran/Documents/projects/_mindful-life-03.2026/growth-track/frontend-next/src/features/social/components/SocialHistoryList.tsx)
- Ensure all entries (people, events) are displayed in the Social Stats/History.
- Implement edit functionality for existing entries.
- Clearly display Date and Context (where/how you met them).

### [Expense / Money Tab]
#### [MODIFY] [ExpenseSummary.tsx] (Location to be confirmed, likely in `src/features/expense/components`)
- Implement accordion/dropdown logic for category-wise entry viewing.
- Show top 5 most recent entries with a "See More" drop-down.

## Verification Plan

### Automated Tests
- Run `npm run build` to ensure no regressions in TypeScript or styling.

### Manual Verification
- **Theme Check**: Toggle through all 3 themes and verify readability.
- **Nav Check**: Verify tab order and labels match the requirement.
- **Journal Check**:
    - Test dictation and manual edit interleaving.
    - Verify fullscreen entry view.
    - Check mobile layout on a small screen simulator (Chrome DevTools).
- **Work Check**: Verify 2-line layout and estimated time input.
- **Social/Book/Expense**: Verify category updates and dropdown behaviors.
