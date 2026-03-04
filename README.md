# Mindful Life AI

Mindful Life AI is a comprehensive personal life integration platform designed to help you track and align your daily activities with your long-term goals and values. By blending modern performance tracking with contemplative traditions like Stoicism and the teachings of Thich Nhat Hanh (Plum Village), the app provides a unique space for growth across Body, Mind, and Spirit.

## 🚀 General Overview

The app serves as a digital companion for mindful living. It doesn't just track data; it helps you synthesize your experiences through AI-powered periodic reviews and contemplative journaling. Whether you're tracking a run, logging a deep work session, or reflecting on your morning intention, Mindful Life AI ensures your data is accessible and meaningful.

## 📱 Tab Functions

### 🧘 Daily Check-In
Start your day with **Morning Planning** to set a focal intention and schedule specific activities. Use the **Evening Check-In** to log core vitality metrics:
- **Vitality:** Sleep hours, steps, and meditation consistency.
- **Alignment:** 1-10 scores for energy and alignment with your core values.
- **Persistence:** Morning activities automatically persist and can be checked off throughout the day.

### 🏃 Running
Track your fitness journey with ease.
- **Strava Integration:** Minimal, persistent connection bar for automatic syncing.
- **Visual Intensity:** A color-coded calendar that categorizes runs by type (Easy, Tempo, Interval, Long, Recovery, Race).
- **History:** Quick access to recent runs with full edit support.

### ✍️ Journal
A dedicated space for deep reflection.
- **AI-Powered Prompts:** Generate prompts that blend Stoic resilience with Plum Village mindfulness, specifically targeting Body, Mind, Spirit, or your Monthly Checklist.
- **Gratitude & Random:** Quickly switch to gratitude journaling or receive a random contemplative prompt.
- **Expandable History:** Browse through past reflections with a clean, expandable UI.

### 👥 Social
Nurture your relationships mindfully.
- **Connections:** Log interactions with family, friends, and network.
- **Energy Impact:** Track how different social interactions affect your personal energy.

### 💻 Work
Optimize your professional development and productivity.
- **Deep Work:** Log focused work sessions and track total hours invested in specific projects or skills (e.g., AWS, ML, DSA).
- **Focus Tracking:** Monitor your concentration levels over time.

### 📚 Reading
Your companion for intellectual growth.
- **Progress Tracking:** Log pages read to see your progress through current books.
- **Reflection:** Capture notes and key takeaways to ensure active reading and retention.

### 💸 Expenses
Manage your finances across borders.
- **Dual Currency:** Seamlessly track spending in both **USD** and **VND**.
- **Formatted Display:** VND amounts are displayed using intuitive "K" units (e.g., 50K instead of 50,000) for better readability.
- **Categorization:** View monthly spend summaries broken down by category.

### 📊 Review & Summary
The analytical heart of the app.
- **AI Insights:** Generate narrative Weekly, Monthly, and Quarterly reviews that analyze your trends and provide coaching insights.
- **Life Integration Checklists:** Organized by **Body, Mind, Spirit, Social, and Financial** to help you stay consistent with your long-term monthly goals.

---

## 🛠 Tech Stack
- **Backend:** Python + FastAPI
- **AI:** Google Gemini (Generative AI)
- **Database:** Google Cloud Firestore (via `firebase-admin`)
- **Frontend:** Vanilla JS, HTML5, CSS3 (Mobile-first, Dark Mode support)
- **Integrations:** Strava API for fitness data syncing.

## 📦 Local Development

1. **Configure Environment:**
```bash
cd backend
cp .env.template .env
# Add your GOOGLE_API_KEY and FIREBASE_SERVICE_ACCOUNT path
```

2. **Install Dependencies:**
```bash
pip install -r requirements.txt
```

3. **Run Server:**
```bash
python main.py
```
Open `http://localhost:8080` in your browser.
