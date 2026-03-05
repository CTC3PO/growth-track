/**
 * Mindful Life AI — Frontend Application
 * POC: Tracker forms + AI-powered journaling prompts + review dashboard
 */

const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8080' : '';

// ─── Navigation ────────────────────────────────────────────────

function navigateToPage(page) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const btn = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (btn) btn.classList.add('active');
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    // Persist active tab
    localStorage.setItem('activeTab', page);

    // Load data for each page on switch
    if (page === 'review') loadReviewData();
    if (page === 'reading') { loadReadingStats(); loadBooks(); loadCalendar('reading'); }
    if (page === 'journal') { loadJournalPrompt(); loadJournalHistory(); loadCalendar('journal'); }
    if (page === 'checkin') { loadCheckinHistory(); loadCalendar('checkin'); }
    if (page === 'running') { loadRunHistory(); loadCalendar('running'); }
    if (page === 'work') { loadWorkData(); loadCalendar('work'); }
    if (page === 'travel') { initCurrencySelectors(); loadExpenses(); loadCalendar('travel'); }
    if (page === 'social') { loadSocialData(); loadCalendar('social'); }
}

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        navigateToPage(btn.dataset.page);
    });
});

// ─── Helpers ───────────────────────────────────────────────────

let currentUser = null; // Store conceptual logged in user Name

function today() {
    return new Date().toISOString().split('T')[0];
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = msg;
        toast.className = 'toast';
        if (type === 'error') toast.classList.add('toast-error');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2800);
    }
}

async function apiGet(endpoint) {
    console.log(`[API GET] ${endpoint}`);
    const headers = {};
    try {
        const res = await fetch(`${API}${endpoint}`, { headers });
        if (!res.ok) {
            const text = await res.text();
            console.error(`[API GET ERROR] ${endpoint}: ${res.status} ${text}`);
            throw new Error(text);
        }
        const data = await res.json();
        console.log(`[API GET SUCCESS] ${endpoint}`, data);
        return data;
    } catch (err) {
        console.error(`[API GET FAIL] ${endpoint}: ${err.message}`);
        throw err;
    }
}

async function apiPost(endpoint, data) {
    console.log(`[API POST] ${endpoint}`, data);
    const headers = { 'Content-Type': 'application/json' };
    try {
        const res = await fetch(`${API}${endpoint}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const text = await res.text();
            console.error(`[API POST ERROR] ${endpoint}: ${res.status} ${text}`);
            throw new Error(text);
        }
        const result = await res.json();
        console.log(`[API POST SUCCESS] ${endpoint}`, result);
        return result;
    } catch (err) {
        console.error(`[API POST FAIL] ${endpoint}: ${err.message}`);
        throw err;
    }
}


async function apiPut(endpoint, data) {
    console.log(`[API PUT] ${endpoint}`, data);
    const headers = { 'Content-Type': 'application/json' };
    try {
        const res = await fetch(`${API}${endpoint}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const text = await res.text();
            console.error(`[API PUT ERROR] ${endpoint}: ${res.status} ${text}`);
            throw new Error(text);
        }
        const result = await res.json();
        console.log(`[API PUT SUCCESS] ${endpoint}`, result);
        return result;
    } catch (err) {
        console.error(`[API PUT FAIL] ${endpoint}: ${err.message}`);
        throw err;
    }
}


// ─── Calendar Widget ──────────────────────────────────────────

const _calState = {};  // store month offsets per calendar

function renderCalendar(containerId, dataSets, monthOffset = 0) {
    const container = document.getElementById(containerId);
    if (!container) return;

    _calState[containerId] = monthOffset;

    const now = new Date();
    const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const todayStr = today();

    const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const firstDay = new Date(year, month, 1).getDay();  // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Build a map of dates → entries
    const dateMap = {};
    dataSets.forEach(item => {
        const d = item.date;
        if (!d) return;
        if (!dateMap[d]) dateMap[d] = [];
        dateMap[d].push(item);
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = `
        <div class="cal-widget">
            <div class="cal-nav">
                <button onclick="renderCalendar('${containerId}', window._calData['${containerId}'], ${monthOffset - 1})">‹</button>
                <span class="cal-title">${monthName}</span>
                <button onclick="renderCalendar('${containerId}', window._calData['${containerId}'], ${monthOffset + 1})" ${monthOffset >= 0 ? 'disabled style="opacity:0.3;cursor:default"' : ''}>›</button>
            </div>
            <div class="cal-grid">
    `;

    // Header row
    dayNames.forEach(d => {
        html += `<div class="cal-header-cell">${d}</div>`;
    });

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="cal-day empty"></div>`;
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasData = dateMap[dateStr] && dateMap[dateStr].length > 0;
        const isToday = dateStr === todayStr;
        const classes = ['cal-day'];
        if (isToday) classes.push('today');
        if (hasData) classes.push('has-data');

        // Determine Custom Badge Rendering
        let badgeHtml = '';
        if (hasData) {
            if (containerId === 'run-calendar' && dateMap[dateStr][0].distance_km !== undefined) {
                const topRun = dateMap[dateStr].sort((a, b) => b.distance_km - a.distance_km)[0];
                const type = topRun.run_type || 'easy';
                let color = 'var(--accent-teal, #2dd4bf)'; // Easy
                if (type === 'long') color = 'var(--accent-blue, #3b82f6)';
                if (type === 'tempo') color = 'var(--accent-orange, #f97316)';
                if (type === 'interval') color = 'var(--accent-rose, #f43f5e)';
                if (type === 'recovery') color = 'var(--text-muted, #94a3b8)';
                if (type === 'race') color = '#eab308'; // Gold
                if (type === 'cross_train' || type === 'cross-train') color = 'var(--accent-purple, #a855f7)';
                badgeHtml = `<div class="cal-val-bubble" style="background:${color};">${topRun.distance_km}</div>`;
            } else if (containerId === 'journal-calendar' && dateMap[dateStr][0].word_count !== undefined) {
                const totalWords = dateMap[dateStr].reduce((sum, j) => sum + (j.word_count || 0), 0);
                badgeHtml = `<div class="cal-val-capsule" style="background:var(--accent); color:#0f172a;">${totalWords}</div>`;
            } else if (containerId === 'work-calendar' && dateMap[dateStr][0].duration_minutes !== undefined) {
                const totalMins = dateMap[dateStr].reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
                const hrs = (totalMins / 60).toFixed(1).replace('.0', '');
                badgeHtml = `<div class="cal-val-capsule" style="background:#8b5cf6;">${hrs}h</div>`;
            } else if (containerId === 'expense-calendar' && dateMap[dateStr][0].amount_usd !== undefined) {
                const totalVnd = dateMap[dateStr].reduce((sum, e) => sum + (e.amount_vnd || 0), 0);
                const formatVnd = (v) => v >= 1000 ? `${Math.round(v / 1000)}K` : Math.round(v);
                badgeHtml = `<div class="cal-val-bubble" style="background:var(--accent-rose); border-radius:4px; padding:2px 4px; font-size:9px;">${formatVnd(totalVnd)}</div>`;
            } else if (containerId === 'social-calendar' && dateMap[dateStr][0].name !== undefined) {
                badgeHtml = `<div class="cal-val-bubble" style="background:var(--accent-orange); border-radius:4px; padding:2px 4px; font-size:9px;">${dateMap[dateStr].length}</div>`;
            } else if (containerId === 'reading-calendar' && dateMap[dateStr][0].title !== undefined) {
                badgeHtml = `<div class="cal-val-capsule" style="background:var(--accent-amber);">📚</div>`;
            } else {
                badgeHtml = '<div class="cal-dot"></div>';
            }
        }

        html += `<div class="${classes.join(' ')}" ${hasData ? `onclick="showCalDetail('${containerId}', '${dateStr}')"` : ''}>
                <span>${day}</span>
                ${badgeHtml}
            </div>`;
    }

    html += `</div><div id="${containerId}-detail"></div></div>`;
    container.innerHTML = html;

    // Store data globally for onclick navigation
    if (!window._calData) window._calData = {};
    window._calData[containerId] = dataSets;
}

function showCalDetail(containerId, dateStr) {
    const detailEl = document.getElementById(`${containerId}-detail`);
    if (!detailEl) return;
    const items = (window._calData[containerId] || []).filter(i => i.date === dateStr);
    if (!items.length) { detailEl.innerHTML = ''; return; }

    const lines = items.map(item => {
        // Format depending on data type
        if (item.distance_km !== undefined) {
            return `🏃 ${item.distance_km} km${item.duration_minutes ? ` · ${item.duration_minutes} min` : ''} (${item.run_type || 'easy'})`;
        }
        if (item.amount !== undefined) {
            return `💰 ${item.amount} ${item.currency || ''} — ${item.description || item.category || ''}`;
        }
        if (item.duration_minutes !== undefined && item.category !== undefined && containerId === 'work-calendar') {
            return `💻 ${item.duration_minutes} min — ${item.category} ${item.notes ? `(${item.notes})` : ''}`;
        }
        if (item.name !== undefined && containerId === 'social-calendar') {
            return `🤝 ${item.name} — ${item.category} ${item.context ? `(${item.context})` : ''}`;
        }
        if (item.title !== undefined && containerId === 'reading-calendar') {
            return `📚 ${item.title} — ${item.author} ${item.rating ? `(${item.rating}/10)` : ''}`;
        }
        if (item.energy !== undefined) {
            return `✨ Energy: ${item.energy}/10${item.alignment ? ` · Alignment: ${item.alignment}/10` : ''}${item.meditation ? ' · 🧘 Meditated' : ''}`;
        }
        if (item.content) {
            return `📝 ${item.content.substring(0, 80)}${item.content.length > 80 ? '...' : ''}`;
        }
        return JSON.stringify(item).substring(0, 80);
    });

    detailEl.innerHTML = `
        <div class="cal-day-detail">
            <strong>${dateStr}</strong><br>
            ${lines.join('<br>')}
        </div>
    `;
}

async function loadCalendar(type) {
    try {
        let data = [];
        let containerId = '';
        if (type === 'running') {
            data = await apiGet('/api/runs?limit=100');
            containerId = 'run-calendar';
        } else if (type === 'travel') {
            const res = await apiGet('/api/travel/expenses?limit=100');
            data = res.expenses || [];
            containerId = 'expense-calendar';
        } else if (type === 'checkin') {
            data = await apiGet('/api/checkins?limit=100');
            containerId = 'checkin-calendar';
        } else if (type === 'journal') {
            data = await apiGet('/api/journal?limit=100');
            containerId = 'journal-calendar';
        } else if (type === 'work') {
            data = await apiGet('/api/work?limit=100');
            containerId = 'work-calendar';
        } else if (type === 'social') {
            data = await apiGet('/api/social?limit=100');
            containerId = 'social-calendar';
        } else if (type === 'reading') {
            data = await apiGet('/api/books?limit=100');
            containerId = 'reading-calendar';
            // Books use date_finished or date_started, we need to map it to 'date' for the calendar
            data = data.map(b => ({ ...b, date: b.date_finished || b.date_started || '' })).filter(b => b.date);
        }
        renderCalendar(containerId, data, _calState[containerId] || 0);
    } catch (err) {
        // silently fail for calendars
    }
}

// ─── Initialize ────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {

    // Restore active tab from localStorage (persist across reloads)
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab) {
        navigateToPage(savedTab);
    }

    // Simple routing to the auth page
    const authTrigger = document.getElementById('auth-trigger');
    const authStatus = document.getElementById('auth-status');
    const pageAuth = document.getElementById('page-auth');

    // Since Auth is disabled, we just mock the user as Chau
    currentUser = 'Chau';
    if (authStatus) {
        authStatus.innerHTML = `Signed in locally as <strong>Chau</strong>`;
    }
    const greetingEl = document.getElementById('greeting');
    if (greetingEl) {
        greetingEl.textContent = `Hello, Chau 👋`;
    }

    // Load setup data for Travel tab
    initCurrencySelectors();

    // Currency converter live update
    document.getElementById('convert-amount')?.addEventListener('input', runConversion);
    document.getElementById('convert-from')?.addEventListener('change', runConversion);
    document.getElementById('convert-to')?.addEventListener('change', runConversion);

    if (authTrigger) {
        authTrigger.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById('page-auth').classList.add('active');
        });
    }

    // Toggle Tab Logic in Auth Form
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const nameGroup = document.getElementById('name-group');
    const submitBtn = document.getElementById('auth-submit-btn');
    const subtitle = document.getElementById('auth-subtitle');
    const authName = document.getElementById('auth-name');

    if (tabLogin && tabSignup) {
        tabLogin.addEventListener('click', () => {
            tabLogin.classList.add('active');
            tabLogin.style.background = 'var(--bg-card)';
            tabLogin.style.color = 'var(--text-primary)';
            tabLogin.style.boxShadow = 'var(--shadow-sm)';

            tabSignup.classList.remove('active');
            tabSignup.style.background = 'transparent';
            tabSignup.style.color = 'var(--text-secondary)';
            tabSignup.style.boxShadow = 'none';

            nameGroup.style.display = 'none';
            authName.required = false;
            submitBtn.innerHTML = 'Log In ✨';
            subtitle.innerHTML = 'Welcome back. Please log in to continue.';
        });

        tabSignup.addEventListener('click', () => {
            tabSignup.classList.add('active');
            tabSignup.style.background = 'var(--bg-card)';
            tabSignup.style.color = 'var(--text-primary)';
            tabSignup.style.boxShadow = 'var(--shadow-sm)';

            tabLogin.classList.remove('active');
            tabLogin.style.background = 'transparent';
            tabLogin.style.color = 'var(--text-secondary)';
            tabLogin.style.boxShadow = 'none';

            nameGroup.style.display = 'block';
            authName.required = true;
            submitBtn.innerHTML = 'Create Account ✨';
            subtitle.innerHTML = 'Join us to track and integrate your personal life.';
        });
    }

    // Auth Form Submit
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showToast('Authentication is currently disabled.', 'error');
        });
    }

    // Theme initialization
    const themeToggle = document.getElementById('theme-toggle');
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

    // Check localStorage or system preference
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme == 'dark') {
        document.body.classList.toggle('dark-mode');
        themeToggle.checked = true;
    } else if (currentTheme == 'light') {
        document.body.classList.remove('dark-mode');
    } else if (prefersDarkScheme.matches) {
        document.body.classList.toggle('dark-mode');
        themeToggle.checked = true;
    }

    // Listen for toggle switch
    themeToggle.addEventListener('change', function () {
        if (this.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    });

    // Set default dates to today
    const checkinDate = document.getElementById('checkin-date');
    if (checkinDate) {
        checkinDate.value = today();
        checkinDate.addEventListener('change', (e) => loadMorningPlanningForDate(e.target.value));
        // Also initial load
        loadMorningPlanningForDate(checkinDate.value);
    }
    const runDate = document.getElementById('run-date');
    if (runDate) runDate.value = today();
    const journalDate = document.getElementById('journal-date');
    if (journalDate) journalDate.value = today();
    const workDate = document.getElementById('work-date');
    if (workDate) workDate.value = today();
    const expenseDate = document.getElementById('expense-date');
    if (expenseDate) expenseDate.value = today();
    const socialDate = document.getElementById('social-date');
    if (socialDate) socialDate.value = today();

    // Range slider displays
    const energySlider = document.getElementById('checkin-energy');
    if (energySlider) {
        energySlider.addEventListener('input', e => {
            const energyVal = document.getElementById('energy-val');
            if (energyVal) energyVal.textContent = e.target.value;
        });
    }
    const alignmentSlider = document.getElementById('checkin-alignment');
    if (alignmentSlider) {
        alignmentSlider.addEventListener('input', e => {
            const alignmentVal = document.getElementById('alignment-val');
            if (alignmentVal) alignmentVal.textContent = e.target.value;
        });
    }

    // Journal word count
    const journalContent = document.getElementById('journal-content');
    if (journalContent) {
        journalContent.addEventListener('input', e => {
            const wc = e.target.value.trim().split(/\s+/).filter(w => w).length;
            const journalWc = document.getElementById('journal-wc');
            if (journalWc) journalWc.textContent = `${wc} words`;
        });
    }

    // Currency converter live update
    const convertAmount = document.getElementById('convert-amount');
    if (convertAmount) convertAmount.addEventListener('input', runConversion);
    const convertFrom = document.getElementById('convert-from');
    if (convertFrom) convertFrom.addEventListener('change', runConversion);
    const convertTo = document.getElementById('convert-to');
    if (convertTo) convertTo.addEventListener('change', runConversion);

    // Initial load
    loadCheckinHistory();
    loadCalendar('checkin');

    // Attempt global load for default routing setup
    initCurrencySelectors();
    loadJournalPrompt(); loadJournalHistory(); loadCalendar('journal');
    loadRunHistory(); loadCalendar('running');
    loadReadingStats(); loadBooks(); loadCalendar('reading');
    loadWorkData(); loadCalendar('work');
    loadExpenses(); loadCalendar('travel');
    loadSocialData(); loadCalendar('social');

    // Check for Strava token in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('strava_token')) {
        const token = urlParams.get('strava_token');
        localStorage.setItem('strava_token', token);
        // Set expiry to 7 days from now
        localStorage.setItem('strava_token_expiry', Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Clean up URL without refreshing
        const newUrl = window.location.pathname + (window.location.hash || '');
        window.history.replaceState({}, document.title, newUrl);

        showToast('Strava connection successful! 🏃');

        // If they were redirected back to the running page, make sure it activates
        if (window.location.hash === '#page-running') {
            document.querySelector('[data-page="running"]').click();
        }
    }

    // Update Strava UI state
    const stravaBtn = document.getElementById('connect-strava-btn');
    const stravaStatusText = document.getElementById('strava-status-text');
    const stravaProfileLink = document.getElementById('strava-profile-link');
    const stravaRunsCard = document.getElementById('strava-runs-card');

    const activeToken = localStorage.getItem('strava_token');
    const tokenExpiry = localStorage.getItem('strava_token_expiry');
    const isStravaValid = activeToken && tokenExpiry && Date.now() < parseInt(tokenExpiry);

    if (!isStravaValid && activeToken) {
        // Token expired
        localStorage.removeItem('strava_token');
        localStorage.removeItem('strava_token_expiry');
    }

    if (stravaBtn && stravaStatusText) {
        if (isStravaValid) {
            stravaStatusText.innerHTML = '✅ Connected to Strava';
            stravaBtn.style.display = 'none';
            if (stravaProfileLink) stravaProfileLink.style.display = 'inline-block';
            if (stravaRunsCard) stravaRunsCard.style.display = 'block';

            // Auto-fetch runs
            fetchStravaRuns(activeToken);
        } else {
            stravaStatusText.innerHTML = 'Connect Strava';
            stravaBtn.style.display = 'inline-block';
            if (stravaProfileLink) stravaProfileLink.style.display = 'none';
            if (stravaRunsCard) stravaRunsCard.style.display = 'none';

            stravaBtn.addEventListener('click', async () => {
                try {
                    stravaBtn.textContent = 'Connecting...';
                    stravaBtn.disabled = true;
                    // Reset coach plan UI
                    const aiContainer = document.getElementById('ai-plan-container');
                    if (aiContainer) aiContainer.innerHTML = '<div class="loading-text">Connect Strava to generate plan.</div>';

                    const data = await apiGet('/api/strava/login');
                    if (data.url) {
                        window.location.href = data.url;
                    } else {
                        showToast('Could not get Strava login URL');
                        stravaBtn.textContent = 'Connect';
                        stravaBtn.disabled = false;
                    }
                } catch (err) {
                    showToast('Strava connection error: ' + err.message);
                    stravaBtn.textContent = 'Connect';
                    stravaBtn.disabled = false;
                }
            });
        }
    }
});


// ─── Check-In ──────────────────────────────────────────────────

// Morning activity builder state
let morningActivities = [];

function renderMorningActivities() {
    const list = document.getElementById('morning-activity-list');
    if (!list) return;
    list.innerHTML = morningActivities.map((a, i) => `
        <div style="display:flex; align-items:center; gap:6px; padding:6px 8px; background:var(--bg-input); border-radius:8px;">
            <input type="checkbox" ${a.completed ? 'checked' : ''} onchange="toggleMorningActivity(${i})" style="cursor:pointer; width:16px; height:16px; accent-color:var(--accent);">
            <span style="font-size:12px; color:var(--text-secondary); min-width:50px; ${a.completed ? 'text-decoration:line-through; opacity:0.6;' : ''}">${a.time || '—'}</span>
            <span style="flex:1; font-size:13px; color:var(--text-primary); ${a.completed ? 'text-decoration:line-through; opacity:0.6;' : ''}">${a.activity}</span>
            <button type="button" onclick="morningActivities.splice(${i},1); renderMorningActivities(); autoSaveMorningPlanning();" style="background:none; border:none; color:var(--accent-rose); cursor:pointer; font-size:14px;">✕</button>
        </div>
    `).join('');
}

function toggleMorningActivity(index) {
    if (morningActivities[index]) {
        morningActivities[index].completed = !morningActivities[index].completed;
        renderMorningActivities();
        autoSaveMorningPlanning();
    }
}

async function autoSaveMorningPlanning() {
    const date = document.getElementById('checkin-date')?.value || today();
    const intention = document.getElementById('checkin-intention')?.value || null;

    // We only auto-save if there's an intention or activities
    if (!intention && morningActivities.length === 0) return;

    // Fetch existing checkin for this date to avoid overwriting other fields (sleep, steps, etc)
    let existingData = {};
    try {
        const checkin = await apiGet(`/api/checkin/${date}`);
        if (checkin) existingData = checkin;
    } catch (err) {
        // Not found is fine, we'll create a new one
    }

    const data = {
        ...existingData,
        date,
        intention,
        morning_activities: morningActivities.length > 0 ? morningActivities : null,
    };

    // Remove ID if it's in the body, the backend uses the URL date to determine ID or auto-generates
    delete data.id;

    try {
        await apiPost('/api/checkin', data);
        console.log('Morning plan auto-saved');
        // Refresh history to show the new data point
        loadCheckinHistory();
    } catch (err) {
        console.error('Auto-save failed:', err);
    }
}

const addMorningBtn = document.getElementById('add-morning-activity-btn');
if (addMorningBtn) {
    addMorningBtn.addEventListener('click', () => {
        const time = document.getElementById('morning-activity-time')?.value || '';
        const text = document.getElementById('morning-activity-text')?.value?.trim();
        if (!text) return;
        morningActivities.push({ time, activity: text, completed: false });
        renderMorningActivities();
        autoSaveMorningPlanning();
        const timeInput = document.getElementById('morning-activity-time');
        const textInput = document.getElementById('morning-activity-text');
        if (timeInput) timeInput.value = '';
        if (textInput) textInput.value = '';
    });
}

const intentionInput = document.getElementById('checkin-intention');
if (intentionInput) {
    intentionInput.addEventListener('blur', autoSaveMorningPlanning);
}

async function loadMorningPlanningForDate(dateStr) {
    try {
        const checkin = await apiGet(`/api/checkin/${dateStr}`);
        if (checkin) {
            morningActivities = checkin.morning_activities || [];
            const intentionEl = document.getElementById('checkin-intention');
            if (intentionEl) intentionEl.value = checkin.intention || '';
            renderMorningActivities();
        } else {
            // Refresh/Reset for new day
            morningActivities = [];
            const intentionEl = document.getElementById('checkin-intention');
            if (intentionEl) intentionEl.value = '';
            renderMorningActivities();
        }
    } catch (err) {
        console.error('Failed to load morning plan:', err);
    }
}

const checkinForm = document.getElementById('checkin-form');
if (checkinForm) {
    checkinForm.addEventListener('submit', async e => {
        e.preventDefault();
        const editId = document.getElementById('checkin-edit-id')?.value;
        const data = {
            date: document.getElementById('checkin-date')?.value,
            sleep_hours: parseFloat(document.getElementById('checkin-sleep')?.value) || null,
            steps: parseInt(document.getElementById('checkin-steps')?.value) || null,
            deep_work_hours: parseFloat(document.getElementById('checkin-deepwork')?.value) || null,
            journal_words: parseInt(document.getElementById('checkin-journal-words')?.value) || null,
            energy: parseInt(document.getElementById('checkin-energy')?.value),
            alignment: parseInt(document.getElementById('checkin-alignment')?.value),
            meditation: document.getElementById('checkin-meditation')?.checked,
            notes: document.getElementById('checkin-notes')?.value || null,
            morning_activities: morningActivities.length > 0 ? morningActivities : null,
            intention: document.getElementById('checkin-intention')?.value || null,
        };

        try {
            if (editId) {
                await fetch(`${API}/api/checkins/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                showToast('✓ Check-in updated');
            } else {
                await apiPost('/api/checkin', data);
                showToast('✓ Check-in saved');
            }
            cancelCheckinEdit();
            loadCheckinHistory();
            loadCalendar('checkin');
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    });
}

async function loadCheckinHistory() {
    try {
        const data = await apiGet('/api/checkins?limit=7');
        const container = document.getElementById('checkin-history');
        if (!container) return;
        if (!data.length) {
            container.innerHTML = '<div class="loading-text">No check-ins yet. Start tracking!</div>';
            return;
        }
        // Store for editing
        window._checkinData = {};
        data.forEach(c => { window._checkinData[c.id] = c; });

        container.innerHTML = data.map(c => {
            const notesHtml = c.notes ? `<div style="font-size:12px;color:var(--text-primary);margin-top:4px;line-height:1.4;font-style:italic;">📝 ${c.notes}</div>` : '';
            const intentionHtml = c.intention ? `<div style="font-size:12px;color:var(--accent-amber);margin-top:2px;">🎯 ${c.intention}</div>` : '';
            const activitiesHtml = (c.morning_activities && c.morning_activities.length) ?
                `<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">🌅 ${c.morning_activities.length} planned activities</div>` : '';
            return `
            <div class="history-item" style="position:relative;" onmouseover="this.querySelector('.checkin-edit-btn').style.opacity='1'" onmouseout="this.querySelector('.checkin-edit-btn').style.opacity='0'">
                <button class="checkin-edit-btn" data-checkin-id="${c.id}" title="Edit"
                    style="position:absolute; top:8px; right:8px; width:24px; height:24px; border-radius:4px; border:1px solid var(--border); background:var(--bg-card); color:var(--text-primary); font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s;">✏️</button>
                <div>
                    <div class="history-date">${c.date || 'N/A'}</div>
                    <div style="font-size:12px;color:var(--text-secondary)">
                        ${c.meditation ? '🧘' : ''}
                        ${c.sleep_hours ? `😴${c.sleep_hours}h` : ''}
                        ${c.steps ? `👟${c.steps.toLocaleString()}` : ''}
                    </div>
                    ${intentionHtml}
                    ${activitiesHtml}
                    ${notesHtml}
                </div>
                <div style="text-align:right">
                    <div class="history-value">⚡${c.energy || '-'}/10</div>
                    <div style="font-size:11px;color:var(--text-secondary)">🎯${c.alignment || '-'}/10</div>
                </div>
            </div>
            `;
        }).join('');

        // Add edit listeners
        container.querySelectorAll('.checkin-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const checkin = window._checkinData[btn.dataset.checkinId];
                if (checkin) openCheckinEdit(checkin);
            });
        });
    } catch (err) {
        const container = document.getElementById('checkin-history');
        if (container) container.innerHTML =
            '<div class="loading-text">Could not load history</div>';
    }
}

// ─── Check-In Edit Helpers ──────────────────────────────────────
function openCheckinEdit(c) {
    const editId = document.getElementById('checkin-edit-id');
    if (editId) editId.value = c.id;
    const cDate = document.getElementById('checkin-date');
    if (cDate) cDate.value = c.date || today();
    const cSleep = document.getElementById('checkin-sleep');
    if (cSleep) cSleep.value = c.sleep_hours || '';
    const cSteps = document.getElementById('checkin-steps');
    if (cSteps) cSteps.value = c.steps || '';
    const cDeepwork = document.getElementById('checkin-deepwork');
    if (cDeepwork) cDeepwork.value = c.deep_work_hours || '';
    const cJournal = document.getElementById('checkin-journal-words');
    if (cJournal) cJournal.value = c.journal_words || '';
    const cEnergy = document.getElementById('checkin-energy');
    if (cEnergy) { cEnergy.value = c.energy || 5; document.getElementById('energy-val').textContent = c.energy || 5; }
    const cAlign = document.getElementById('checkin-alignment');
    if (cAlign) { cAlign.value = c.alignment || 5; document.getElementById('alignment-val').textContent = c.alignment || 5; }
    const cMed = document.getElementById('checkin-meditation');
    if (cMed) cMed.checked = c.meditation || false;
    const cNotes = document.getElementById('checkin-notes');
    if (cNotes) cNotes.value = c.notes || '';
    const cIntention = document.getElementById('checkin-intention');
    if (cIntention) cIntention.value = c.intention || '';

    // Restore morning activities
    morningActivities = c.morning_activities || [];
    renderMorningActivities();

    const btn = document.getElementById('checkin-submit-btn');
    if (btn) btn.textContent = 'Update Check-In 🔄';
    const cancelBtn = document.getElementById('checkin-cancel-edit-btn');
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
    const delBtn = document.getElementById('checkin-delete-btn');
    if (delBtn) delBtn.style.display = 'inline-flex';

    document.getElementById('page-checkin')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelCheckinEdit() {
    const form = document.getElementById('checkin-form');
    if (form) form.reset();
    const editId = document.getElementById('checkin-edit-id');
    if (editId) editId.value = '';
    const cDate = document.getElementById('checkin-date');
    if (cDate) cDate.value = today();
    const cIntention = document.getElementById('checkin-intention');
    if (cIntention) cIntention.value = '';
    morningActivities = [];
    renderMorningActivities();

    const btn = document.getElementById('checkin-submit-btn');
    if (btn) btn.textContent = 'Save Check-In ✓';
    const cancelBtn = document.getElementById('checkin-cancel-edit-btn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    const delBtn = document.getElementById('checkin-delete-btn');
    if (delBtn) delBtn.style.display = 'none';
}

const checkinCancelBtn = document.getElementById('checkin-cancel-edit-btn');
if (checkinCancelBtn) checkinCancelBtn.addEventListener('click', cancelCheckinEdit);

const checkinDeleteBtn = document.getElementById('checkin-delete-btn');
if (checkinDeleteBtn) {
    checkinDeleteBtn.addEventListener('click', async () => {
        const editId = document.getElementById('checkin-edit-id')?.value;
        if (!editId) return;
        if (confirm('Delete this check-in?')) {
            try {
                await fetch(`${API}/api/checkins/${editId}`, { method: 'DELETE' });
                showToast('✓ Check-in deleted');
                cancelCheckinEdit();
                loadCheckinHistory();
                loadCalendar('checkin');
            } catch (err) {
                showToast('Error: ' + err.message, 'error');
            }
        }
    });
}


// ─── Running ───────────────────────────────────────────────────

const runForm = document.getElementById('run-form');
if (runForm) {
    runForm.addEventListener('submit', async e => {
        e.preventDefault();
        const editId = document.getElementById('run-edit-id')?.value;
        const data = {
            date: document.getElementById('run-date')?.value,
            distance_km: parseFloat(document.getElementById('run-distance')?.value),
            duration_minutes: parseFloat(document.getElementById('run-duration')?.value) || null,
            run_type: document.getElementById('run-type')?.value,
            notes: document.getElementById('run-notes')?.value || null,
        };

        try {
            if (editId) {
                await fetch(`${API}/api/runs/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                showToast('✓ Run updated');
            } else {
                await apiPost('/api/runs', data);
                showToast('✓ Run saved');
            }

            cancelRunEdit();
            loadRunHistory();
            loadCalendar('running');
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    });
}

async function loadRunHistory() {
    try {
        const data = await apiGet('/api/runs?limit=10');
        const container = document.getElementById('run-history');
        if (!container) return;
        if (!data.length) {
            container.innerHTML = '<div class="loading-text">No runs logged yet. Lace up! 🏃</div>';
            return;
        }
        container.innerHTML = data.map(r => `
            <div class="history-item" style="position:relative;" onmouseover="this.querySelector('.run-edit-btn').style.opacity='1'" onmouseout="this.querySelector('.run-edit-btn').style.opacity='0'">
                <button class="run-edit-btn" data-run-id="${r.id}" title="Edit"
                    style="position:absolute; top:8px; right:8px; width:24px; height:24px; border-radius:4px; border:1px solid var(--border); background:var(--bg-card); color:var(--text-primary); font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s;">✏️</button>
                <div class="history-item-left" style="padding-right: 32px;">
                    <strong>${r.date || 'N/A'}</strong>
                    <div class="item-meta">${r.duration_minutes ? r.duration_minutes + ' min' : ''}</div>
                    <span class="category-badge">${r.run_type || 'easy'}</span>
                </div>
                <div class="history-item-right">
                    <div class="amount">${r.distance_km} km</div>
                </div>
            </div>
        `).join('');

        // Store data and add edit listeners
        window._runData = {};
        data.forEach(r => { window._runData[r.id] = r; });
        container.querySelectorAll('.run-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const run = window._runData[btn.dataset.runId];
                if (run) openRunEdit(run);
            });
        });
    } catch (err) {
        const container = document.getElementById('run-history');
        if (container) container.innerHTML =
            '<div class="loading-text">Could not load runs</div>';
    }
}

let stravaRuns = [];
let showingAllStrava = false;

async function fetchStravaRuns(token) {
    const listContainer = document.getElementById('strava-runs-list');
    const loadMoreBtn = document.getElementById('load-more-strava-btn');
    if (!listContainer) return;

    try {
        // Try getting cached runs first for fast render
        const cachedRuns = localStorage.getItem('strava_runs_cache');
        if (cachedRuns) {
            stravaRuns = JSON.parse(cachedRuns);
            renderStravaRuns(listContainer, loadMoreBtn);
            mergeStravaIntoCalendar();
        }

        // Fetch fresh runs
        const data = await apiGet(`/api/strava/activities?access_token=${token}`);
        if (data && data.runs) {
            stravaRuns = data.runs;
            localStorage.setItem('strava_runs_cache', JSON.stringify(stravaRuns));
            renderStravaRuns(listContainer, loadMoreBtn);
            mergeStravaIntoCalendar();
        } else {
            if (!cachedRuns) listContainer.innerHTML = '<div class="loading-text">No Strava runs found.</div>';
        }
    } catch (err) {
        if (!stravaRuns.length) {
            listContainer.innerHTML = '<div class="loading-text">Failed to load Strava runs.</div>';
        }
        console.error('Strava fetch error:', err);
    }
}

function renderStravaRuns(container, loadMoreBtn) {
    if (!stravaRuns.length) {
        container.innerHTML = '<div class="loading-text">No Strava runs found.</div>';
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        return;
    }

    // Default to showing only recent month (roughly last 30 days) or top 3 for UI compactness
    const displayCount = showingAllStrava ? stravaRuns.length : Math.min(3, stravaRuns.length);
    const runsToShow = stravaRuns.slice(0, displayCount);

    container.innerHTML = runsToShow.map(r => `
        <div class="history-item" style="border-left: 3px solid #fc4c02; border-radius: 4px;">
            <div class="history-item-left" style="padding-right: 32px;">
                <strong>${r.date || 'N/A'}</strong>
                <div class="item-meta" style="font-weight: 500;">${r.name || 'Strava Run'}</div>
                <div class="item-meta">${r.moving_time_str ? r.moving_time_str : ''} • Pace: ${r.pace}/km</div>
            </div>
            <div class="history-item-right">
                <div class="amount" style="color:#fc4c02">${r.distance_km} km</div>
            </div>
        </div>
    `).join('');

    if (loadMoreBtn) {
        if (stravaRuns.length > 3 && !showingAllStrava) {
            loadMoreBtn.style.display = 'block';
            loadMoreBtn.onclick = () => {
                showingAllStrava = true;
                renderStravaRuns(container, loadMoreBtn);
            };
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }
}

function mergeStravaIntoCalendar() {
    if (!window._calData || !window._calData['run-calendar']) return;

    // Convert strava runs into the format run calendar expects
    const stravaCalItems = stravaRuns.map(sr => ({
        id: 'strava_' + sr.id,
        date: sr.date,
        distance_km: sr.distance_km,
        duration_minutes: parseInt(sr.moving_time_str) || 0,
        run_type: sr.name && sr.name.toLowerCase().includes('long') ? 'long' :
            sr.name && sr.name.toLowerCase().includes('tempo') ? 'tempo' :
                sr.name && sr.name.toLowerCase().includes('interval') ? 'interval' : 'easy',
        notes: sr.name
    }));

    // Remove old strava items before merging to avoid duplication on refresh
    window._calData['run-calendar'] = window._calData['run-calendar'].filter(r => !r.id.toString().startsWith('strava_'));

    // Append strava items
    window._calData['run-calendar'].push(...stravaCalItems);

    // Re-render calendar
    renderCalendar('run-calendar', window._calData['run-calendar'], _calState['run-calendar'] || 0);
}

// ─── Run Edit Helpers ──────────────────────────────────────────
function openRunEdit(r) {
    const editId = document.getElementById('run-edit-id');
    if (editId) editId.value = r.id;
    const rDate = document.getElementById('run-date');
    if (rDate) rDate.value = r.date || today();
    const rDistance = document.getElementById('run-distance');
    if (rDistance) rDistance.value = r.distance_km || '';
    const rDuration = document.getElementById('run-duration');
    if (rDuration) rDuration.value = r.duration_minutes || '';
    const rType = document.getElementById('run-type');
    if (rType) rType.value = r.run_type || 'easy';
    const rNotes = document.getElementById('run-notes');
    if (rNotes) rNotes.value = r.notes || '';

    const btn = document.getElementById('run-submit-btn');
    if (btn) btn.textContent = 'Update Run 🔄';
    const cancelBtn = document.getElementById('run-cancel-edit-btn');
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
    const delBtn = document.getElementById('run-delete-btn');
    if (delBtn) delBtn.style.display = 'inline-flex';

    document.getElementById('page-run')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelRunEdit() {
    const form = document.getElementById('run-form');
    if (form) form.reset();
    const editId = document.getElementById('run-edit-id');
    if (editId) editId.value = '';
    const rDate = document.getElementById('run-date');
    if (rDate) rDate.value = today();

    const btn = document.getElementById('run-submit-btn');
    if (btn) btn.textContent = 'Log Run 🏃';
    const cancelBtn = document.getElementById('run-cancel-edit-btn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    const delBtn = document.getElementById('run-delete-btn');
    if (delBtn) delBtn.style.display = 'none';
}

const runCancelBtn = document.getElementById('run-cancel-edit-btn');
if (runCancelBtn) runCancelBtn.addEventListener('click', cancelRunEdit);

const runDeleteBtn = document.getElementById('run-delete-btn');
if (runDeleteBtn) {
    runDeleteBtn.addEventListener('click', async () => {
        const editId = document.getElementById('run-edit-id')?.value;
        if (!editId) return;
        if (confirm('Delete this run?')) {
            try {
                await fetch(`${API}/api/runs/${editId}`, { method: 'DELETE' });
                showToast('✓ Run deleted');
                cancelRunEdit();
                loadRunHistory();
                loadCalendar('running');
            } catch (err) {
                showToast('Error: ' + err.message, 'error');
            }
        }
    });
}

// Running Coach Logic
const getCoachPlanBtn = document.getElementById('get-coach-plan-btn');
if (getCoachPlanBtn) {
    getCoachPlanBtn.addEventListener('click', async () => {
        const container = document.getElementById('ai-plan-container');
        if (!container) return;
        container.innerHTML = '<div class="loading-text"><div class="spinner"></div> Analyzing your runs & generating AI plan...</div>';

        // Check localStorage. If missing, use mock_token to not catastrophically break
        const token = localStorage.getItem('strava_token') || 'mock_token';

        try {
            const response = await apiGet(`/api/running_coach/plan?access_token=${token}`);

            if (response.error) {
                container.innerHTML = `<div class="loading-text" style="color:var(--accent-rose)">${response.error}</div>`;
                return;
            }

            const plan = response.adjusted_plan || {};
            const adjustments = response.adjustments_made || [];
            const runs = response.runs || [];

            container.innerHTML = `
                <p style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">Goal: Half Marathon in 6 Weeks (Sub 2:00)</p>

                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">
                        <span>Week 2</span>
                        <span>5 weeks to go</span>
                    </div>
                    <div style="width: 100%; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden;">
                        <div style="width: 33%; height: 100%; background: var(--accent); border-radius: 3px;"></div>
                    </div>
                </div>

                ${runs.length > 0 ? `
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">📊 Recent Strava Runs Analyzed</div>
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            ${runs.map(r => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: var(--bg-secondary); border-radius: 6px; font-size: 12px;">
                                    <div>
                                        <div style="font-weight: 500; color: var(--text-primary);">${r.name}</div>
                                        <div style="color: var(--text-muted); font-size: 11px;">${r.date}</div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-weight: 600; color: var(--text-primary);">${r.distance_km} km</div>
                                        <div style="color: var(--text-muted); font-size: 11px;">${r.pace} min/km · ${r.moving_time_str}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div style="background: linear-gradient(135deg, rgba(42,157,110,0.08), rgba(42,157,110,0.02)); padding: 12px; border-radius: 8px; margin-bottom: 16px; border-left: 3px solid var(--accent);">
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">🤖 AI Coach Assessment</div>
                    <p style="font-size: 13px; color: var(--text-secondary); margin: 0; line-height: 1.5;">${response.assessment || "Taking your recent runs into account..."}</p>
                </div>

                ${adjustments.length > 0 ? `
                    <div style="margin-bottom: 16px; font-size: 12px;">
                        <strong style="color:var(--accent-amber)">⚡ Adjustments Made:</strong>
                        <ul style="padding-left:16px; margin-top:4px; color:var(--text-secondary); line-height: 1.6;">
                            ${adjustments.map(a => `<li>${a}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">📅 This Week's Plan</div>
                <div style="background: var(--bg-secondary); padding: 12px; border-radius: 8px; font-size: 13px;">
                    <ul style="list-style: none; display: flex; flex-direction: column; gap: 10px;">
                        <li><strong style="color: var(--text-muted);">Mon:</strong> Rest 🧘</li>
                        <li><strong style="color: var(--accent-blue);">Tue:</strong> ${plan.tuesday || 'Easy Run'}</li>
                        <li><strong style="color: var(--accent-amber);">Wed:</strong> Lower Body Strength (Legs) 🏋️‍♂️</li>
                        <li><strong style="color: var(--text-primary);">Thu:</strong> ${plan.thursday || 'Speed Work'}</li>
                        <li><strong style="color: var(--accent-rose);">Fri:</strong> Rest</li>
                        <li><strong style="color: var(--text-muted);">Sat:</strong> ${plan.saturday || 'Long Run'}</li>
                        <li><strong style="color: var(--accent-dark);">Sun:</strong> ${plan.sunday || 'Active Recovery'}</li>
                    </ul>
                </div>
            `;
        } catch (err) {
            container.innerHTML = `<div class="loading-text" style="color:var(--accent-rose)">Could not generate plan. Ensure GOOGLE_API_KEY is configured.</div>`;
        }
    });
}


// ─── Reading ───────────────────────────────────────────────────

let bookSearchTimeout;
const bookTitleInput = document.getElementById('book-title');
if (bookTitleInput) {
    bookTitleInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        const resultsContainer = document.getElementById('book-search-results');
        if (!resultsContainer) return;

        // Only search if length > 2 and editing is not active
        const bookEditId = document.getElementById('book-edit-id');
        if (!query || query.length <= 2 || (bookEditId && bookEditId.value)) {
            resultsContainer.innerHTML = '';
            return;
        }

        clearTimeout(bookSearchTimeout);
        bookSearchTimeout = setTimeout(async () => {
            resultsContainer.innerHTML = '<div class="loading-text" style="font-size: 11px; padding: 4px;">Searching...</div>';

            try {
                const res = await apiGet(`/api/books/search?q=${encodeURIComponent(query)}`);
                if (res.status === 'success' && res.results.length > 0) {
                    resultsContainer.innerHTML = res.results.slice(0, 3).map((book) => `
                        <div class="book-result-item" style="padding: 6px; background: var(--bg-secondary); border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px;" data-title="${book.title.replace(/"/g, '&quot;')}"  data-author="${book.author.replace(/"/g, '&quot;')}" data-cover="${book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : ''}">
                            ${book.cover_i ? `<img src="https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg" style="width: 24px; height: 36px; object-fit: cover; border-radius: 4px;">` : '<div style="width: 24px; height: 36px; background: var(--border); border-radius: 4px;"></div>'}
                            <div>
                                <div style="font-size: 13px; font-weight: 500; color: var(--text-primary); line-height: 1.2;">${book.title}</div>
                                <div style="font-size: 11px; color: var(--text-secondary);">${book.author}</div>
                            </div>
                        </div>
                    `).join('');

                    resultsContainer.querySelectorAll('.book-result-item').forEach(item => {
                        item.addEventListener('click', () => {
                            const bookTitle = document.getElementById('book-title');
                            if (bookTitle) bookTitle.value = item.dataset.title;
                            const bookAuthor = document.getElementById('book-author');
                            if (bookAuthor) bookAuthor.value = item.dataset.author;
                            const coverUrl = item.dataset.cover || '';
                            const bookCoverInput = document.getElementById('book-cover-input');
                            if (bookCoverInput) bookCoverInput.value = coverUrl;
                            if (coverUrl) showCoverPreview(coverUrl);
                            resultsContainer.innerHTML = '';
                        });
                    });
                } else {
                    resultsContainer.innerHTML = '<div class="loading-text" style="font-size: 11px; padding: 4px;">No results found.</div>';
                }
            } catch (err) {
                resultsContainer.innerHTML = `<div class="loading-text" style="color: var(--accent-rose); font-size: 11px; padding: 4px;">Search failed.</div>`;
            }
        }, 500);
    });
}

// ─── Cover image handling ──────────────────────────────────────
const coverInput = document.getElementById('book-cover-input');
const coverFile = document.getElementById('book-cover-file');
const coverPreview = document.getElementById('book-cover-preview');
const coverPreviewImg = document.getElementById('book-cover-preview-img');
const coverRemove = document.getElementById('book-cover-remove');
const coverHidden = document.getElementById('book-cover-url');

function showCoverPreview(url) {
    if (coverHidden) coverHidden.value = url;
    if (coverPreviewImg) coverPreviewImg.src = url;
    if (coverPreview) coverPreview.style.display = 'flex';
}
function hideCoverPreview() {
    if (coverHidden) coverHidden.value = '';
    if (coverInput) coverInput.value = '';
    if (coverPreview) coverPreview.style.display = 'none';
}

if (coverInput) coverInput.addEventListener('input', () => {
    const url = coverInput.value.trim();
    if (url) showCoverPreview(url);
    else hideCoverPreview();
});

if (coverFile) coverFile.addEventListener('change', () => {
    const file = coverFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        if (coverInput) coverInput.value = '';
        showCoverPreview(e.target.result);   // base64 data URL
    };
    reader.readAsDataURL(file);
});

if (coverRemove) coverRemove.addEventListener('click', hideCoverPreview);

// ─── Book form (create + edit) ─────────────────────────────────
const bookForm = document.getElementById('book-form');
if (bookForm) {
    bookForm.addEventListener('submit', async e => {
        e.preventDefault();
        const editId = document.getElementById('book-edit-id')?.value;
        const statusVal = document.getElementById('book-status')?.value;
        const data = {
            title: document.getElementById('book-title')?.value,
            author: document.getElementById('book-author')?.value,
            genre: document.getElementById('book-genre')?.value,
            rating: parseInt(document.getElementById('book-rating')?.value) || null,
            is_finished: statusVal === 'read',
            status: statusVal,
            cover_url: document.getElementById('book-cover-url')?.value || null,
            reaction: document.getElementById('book-reaction')?.value || null,
        };

        try {
            if (editId) {
                // UPDATE existing book
                await fetch(`${API}/api/books/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                showToast('✓ Book updated');
            } else {
                // CREATE new book
                const result = await apiPost('/api/books', data);
                showToast('✓ Book saved');

                // Show reflection prompts if available
                if (result.reflection_prompts && result.reflection_prompts.length) {
                    const container = document.getElementById('reflection-prompts');
                    if (container) {
                        container.innerHTML = result.reflection_prompts.map(p => `
                        <div class="prompt-card" style="margin-bottom:10px">
                            <p class="prompt-text">${p.prompt}</p>
                            <div class="prompt-source">${p.tradition} · ${p.connection || ''}</div>
                        </div>
                    `).join('');
                    }
                    const reflectionPromptsContainer = document.getElementById('reflection-prompts-container');
                    if (reflectionPromptsContainer) reflectionPromptsContainer.style.display = 'block';
                }
            }

            cancelBookEdit();
            loadReadingStats();
            loadBooks();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    });
}

// ─── Edit helpers ──────────────────────────────────────────────
function openBookEdit(book) {
    const bookEditId = document.getElementById('book-edit-id');
    if (bookEditId) bookEditId.value = book.id;
    const bookTitle = document.getElementById('book-title');
    if (bookTitle) bookTitle.value = book.title || '';
    const bookAuthor = document.getElementById('book-author');
    if (bookAuthor) bookAuthor.value = book.author || '';
    const bookGenre = document.getElementById('book-genre');
    if (bookGenre) bookGenre.value = book.genre || 'other';
    const bookRating = document.getElementById('book-rating');
    if (bookRating) bookRating.value = book.rating || '';
    const bookStatus = document.getElementById('book-status');
    if (bookStatus) bookStatus.value = book.status || 'to read';
    const bookReaction = document.getElementById('book-reaction');
    if (bookReaction) bookReaction.value = book.reaction || '';

    if (book.cover_url) {
        if (coverInput) coverInput.value = book.cover_url.startsWith('data:') ? '' : book.cover_url;
        showCoverPreview(book.cover_url);
    } else {
        hideCoverPreview();
    }

    const bookSubmitBtn = document.getElementById('book-submit-btn');
    if (bookSubmitBtn) bookSubmitBtn.textContent = 'Update Book 🔄';
    const bookCancelEditBtn = document.getElementById('book-cancel-edit-btn');
    if (bookCancelEditBtn) bookCancelEditBtn.style.display = 'inline-flex';
    const bookDeleteBtn = document.getElementById('book-delete-btn');
    if (bookDeleteBtn) bookDeleteBtn.style.display = 'inline-flex';

    // Scroll to form
    const pageReading = document.getElementById('page-reading');
    if (pageReading) pageReading.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelBookEdit() {
    const bookForm = document.getElementById('book-form');
    if (bookForm) bookForm.reset();
    const bookEditId = document.getElementById('book-edit-id');
    if (bookEditId) bookEditId.value = '';
    hideCoverPreview();
    const bookSubmitBtn = document.getElementById('book-submit-btn');
    if (bookSubmitBtn) bookSubmitBtn.textContent = 'Save Book 📚';
    const bookCancelEditBtn = document.getElementById('book-cancel-edit-btn');
    if (bookCancelEditBtn) bookCancelEditBtn.style.display = 'none';
    const bookDeleteBtn = document.getElementById('book-delete-btn');
    if (bookDeleteBtn) bookDeleteBtn.style.display = 'none';
}

const bookCancelEditBtn = document.getElementById('book-cancel-edit-btn');
if (bookCancelEditBtn) bookCancelEditBtn.addEventListener('click', cancelBookEdit);

async function loadReadingStats() {
    try {
        const stats = await apiGet('/api/books/stats');
        const container = document.getElementById('reading-stats');
        if (!container) return;
        const pct = stats.pace_pct || 0;
        const barColor = stats.on_track ? 'var(--accent)' : 'var(--accent-amber)';

        container.innerHTML = `
            <div style="display:flex;justify-content:space-between; align-items:flex-end; margin-bottom:6px">
                <span style="font-size:15px;font-weight:700;color:var(--text-primary)">2026 Reading Goal</span>
                <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${stats.books_finished} / ${stats.yearly_goal}</span>
            </div>
            <div class="progress-bar-wrap" style="height:8px; border-radius:4px; margin-bottom:4px; position:relative; overflow:visible;">
                <div class="progress-bar" style="width:${Math.min(pct, 100)}%;background:${barColor}; border-radius:4px;"></div>
                <!-- Current Pace Marker -->
                <div style="position:absolute; top:-4px; bottom:-4px; width:2px; background:var(--text-primary); left:${Math.min((stats.expected_by_now || 0) / stats.yearly_goal * 100, 100)}%; z-index:1; border-radius:1px;" title="Expected Pace"></div>
            </div>
            <div style="display:flex;justify-content:space-between; align-items:center;">
                <span style="font-size:11px;color:var(--text-secondary)">
                    Pace marker: ${stats.expected_by_now || 0} books
                </span>
                <span style="font-size:12px;font-weight:500;color:${stats.on_track ? 'var(--accent)' : 'var(--accent-amber)'}">
                    ${stats.on_track ? '✓ On track' : '⚠ Behind'}
                </span>
            </div>
        `;
    } catch (err) {
        const container = document.getElementById('reading-stats');
        if (container) container.innerHTML =
            '<div class="loading-text">Add your first book to see tracking!</div>';
    }
}

const bookDeleteBtn = document.getElementById('book-delete-btn');
if (bookDeleteBtn) {
    bookDeleteBtn.addEventListener('click', async () => {
        const editId = document.getElementById('book-edit-id')?.value;
        if (!editId) return;
        if (confirm('Are you sure you want to delete this book?')) {
            try {
                await fetch(`${API}/api/books/${editId}`, { method: 'DELETE' });
                showToast('✓ Book deleted');
                cancelBookEdit();
                loadReadingStats();
                loadBooks();
            } catch (err) {
                showToast('Error: ' + err.message, 'error');
            }
        }
    });
}


async function loadBooks() {
    try {
        const data = await apiGet('/api/books?limit=100');
        const container = document.getElementById('books-list');
        if (!container) return;
        if (!data || !data.length) {
            container.innerHTML = '<div class="loading-text">No books yet. Add your first book!</div>';
            return;
        }

        // Store for edit lookup
        window._booksData = {};
        data.forEach(b => { window._booksData[b.id] = b; });

        const groups = { 'reading': [], 'to read': [], 'read': [] };
        data.forEach(b => {
            const st = b.status || (b.is_finished ? 'read' : 'to read');
            if (!groups[st]) groups[st] = [];
            groups[st].push(b);
        });

        const statusIcons = { 'reading': '📖', 'to read': '📋', 'read': '✅' };
        const statusOrder = ['reading', 'to read', 'read'];

        container.innerHTML = statusOrder.map(status => {
            const books = groups[status] || [];
            if (!books.length) return '';
            return `
                <div>
                    <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); margin-bottom: 10px;">
                        ${statusIcons[status] || ''} ${status} (${books.length})
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                        ${books.map(b => `
                            <div class="book-card" data-book-id="${b.id}" data-status="${status}" style="width: 110px; cursor: pointer; transition: transform 0.2s; position:relative;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='none'">
                                <button class="book-edit-btn" data-book-id="${b.id}" title="Edit book"
                                    style="position:absolute; top:4px; right:4px; z-index:2; width:24px; height:24px; border-radius:50%; border:none; background:rgba(0,0,0,0.6); color:#fff; font-size:11px; cursor:pointer; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s;"
                                    onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">✏️</button>
                                <div style="width: 110px; height: 160px; border-radius: 8px; overflow: hidden; box-shadow: var(--shadow-sm); margin-bottom: 6px; background: var(--bg-input);"
                                    onmouseover="this.parentElement.querySelector('.book-edit-btn').style.opacity='0.7'" onmouseout="this.parentElement.querySelector('.book-edit-btn').style.opacity='0'">
                                    ${b.cover_url ?
                    `<img src="${b.cover_url}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:28px;">📚</div>` :
                    `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:28px;">📚</div>`
                }
                                </div>
                                <div style="font-size: 12px; font-weight: 600; color: var(--text-primary); line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${b.title}</div>
                                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${b.author}</div>
                                ${b.rating ? `<div style="font-size: 10px; color: var(--accent-amber); margin-top: 2px;">★ ${b.rating}/10</div>` : ''}
                                ${status !== 'read' ? `<button class="book-status-btn" data-book-id="${b.id}" data-next-status="${status === 'to read' ? 'reading' : 'read'}" style="margin-top: 6px; width: 100%; padding: 4px 6px; font-size: 10px; border: 1px solid var(--border); background: var(--bg-input); border-radius: 6px; cursor: pointer; color: var(--text-primary); font-weight: 500;">${status === 'to read' ? '📖 Start Reading' : '✅ Mark Read'}</button>` : ''}
                                
                                ${status === 'reading' ? `
                                    <div style="margin-top:8px; display:flex; gap:4px; align-items:center;" onclick="event.stopPropagation()">
                                        <input type="number" class="book-progress-input" placeholder="Pages..." data-book-id="${b.id}" style="width:100%; padding:4px; font-size:10px; border-radius:4px; border:1px solid var(--border); background:var(--bg-card); color:var(--text-primary)">
                                        <button class="book-log-btn" data-book-id="${b.id}" style="padding:4px; font-size:10px; border-radius:4px; border:none; background:var(--accent); color:#fff; cursor:pointer;" title="Log progress">➕</button>
                                    </div>
                                ` : ''}
                                ${status !== 'to read' ? `<button class="book-notes-toggle-btn" data-book-id="${b.id}" style="margin-top:4px; width:100%; padding:4px; font-size:10px; border-radius:4px; border:1px dashed var(--border); background:transparent; color:var(--text-secondary); cursor:pointer;">📝 Notes</button>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        // Edit buttons
        container.querySelectorAll('.book-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const book = window._booksData[btn.dataset.bookId];
                if (book) openBookEdit(book);
            });
        });

        // Status change buttons
        container.querySelectorAll('.book-status-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const bookId = btn.dataset.bookId;
                const nextStatus = btn.dataset.nextStatus;
                try {
                    await fetch(`${API}/api/books/${bookId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: nextStatus, is_finished: nextStatus === 'read' })
                    });
                    showToast(`Book moved to "${nextStatus}"`);
                    loadBooks();
                    loadReadingStats();
                } catch (err) {
                    showToast('Error updating book', 'error');
                }
            });
        });

        // Log Progress buttons
        container.querySelectorAll('.book-log-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const bookId = btn.dataset.bookId;
                const input = document.querySelector(`.book-progress-input[data-book-id="${bookId}"]`);
                if (!input || !input.value) return;
                const pages = parseInt(input.value);
                if (pages <= 0) return;

                try {
                    await apiPost(`/api/books/${bookId}/progress`, {
                        date: today(),
                        pages_read: pages
                    });
                    showToast(`Logged ${pages} pages read`);
                    input.value = '';
                    loadCalendar('reading'); // refresh calendar showing the read activity
                } catch (err) {
                    showToast('Error logging progress: ' + err.message, 'error');
                }
            });
        });

        // Notes toggle buttons
        container.querySelectorAll('.book-notes-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const bookId = btn.dataset.bookId;
                const book = window._booksData[bookId];
                if (!book) return;

                // simple prompt for notes for now
                const newNote = prompt(`Notes for ${book.title}\nCurrent notes: ${book.reaction || 'None'}\n\nEnter new note to append:`);
                if (newNote) {
                    const updatedReaction = book.reaction ? book.reaction + '\n\n' + newNote : newNote;
                    fetch(`${API}/api/books/${bookId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reaction: updatedReaction })
                    }).then(() => {
                        showToast('Note saved');
                        loadBooks(); // refresh
                    }).catch(err => {
                        showToast('Failed to save note', 'error');
                    });
                }
            });
        });
    } catch (err) {
        const container = document.getElementById('books-list');
        if (container) container.innerHTML =
            '<div class="loading-text">Could not load books</div>';
    }
}


// ─── Journaling ────────────────────────────────────────────────

const templatePrompts = [
    // Original Prompts
    "What is something you need to let go of?",
    "What are you most grateful for today?",
    "How have you grown in the last year?",
    "What would you do if you knew you couldn't fail?",
    "What boundary do you need to set or enforce?",
    "Describe your ideal day from morning to night.",
    "What is a belief you hold that is no longer serving you?",
    "What are three things you love about yourself?",
    "Write a letter to your younger self.",
    "Write a letter to your future self.",
    "What is your biggest fear, and why?",
    "What brings you the most joy right now?",
    "What is a challenge you recently overcame?",
    "How can you be kinder to yourself?",
    "What does success look like to you?",
    "What is a habit you want to start or stop?",
    "Describe a moment when you felt truly alive.",
    "What are you avoiding right now?",
    "Who is someone you admire, and what qualities do they have?",
    "What would make today great?",
    "What did you learn today?",
    "How are you feeling physically, emotionally, and mentally?",
    "What is a goal you have for this month?",
    "What is a memory that makes you smile?",
    "What do you need more of in your life?",
    "What do you need less of in your life?",

    // Prompts from Reddit (/r/Journaling)
    "Are you taking enough risks in your life? Would you like to change your relationship to risk? If so, how?",
    "At what point in your life have you had the highest self-esteem?",
    "Consider and reflect on what might be your \u201cfavorite failure.\u201d",
    "Draw 25 circles on a page (5x5 grid of circles). Now set a timer for 3 minutes and try to turn each one into something unique. Could be a ball, hand cuffs, a logo, or an eye for instance.",
    "Draw a small scribble on the page then use your imagination to turn that scribble into a full drawing.",
    "Find two unrelated objects near you and think of a clever way they might be used together.",
    "How can you reframe one of your biggest regrets in life?",
    "How did you bond with one of the best friends you\u2019ve ever had?",
    "How did your parents or caregivers try to influence or control your behavior when you were growing up?",
    "How do the opinions of others affect you?",
    "How do you feel about asking for help?",
    "How much do your current goals reflect your desires vs someone else\u2019s?",
    "If you could eliminate any one disease or illness from the world, what would you choose and why?",
    "Imagine that you have arrived at a closed door. What does it look like and what\u2019s on the other side?",
    "In what ways are you currently self-sabotaging or holding yourself back?",
    "Invent your own planet. Draw a rough sketch of the planet and its inhabitants. How is it different than Earth?",
    "React to the following quote from Ana\u00efs Nin: \u201cWe don't see things as they are, we see them as we are.\u201d",
    "React to the following quote from We All Looked Up by Tommy Wallach: \u201cDo you think it is better to fail at something worthwhile, or to succeed at something meaningless?\u201d",
    "Take a task that you\u2019ve been dreading and break it up into the smallest possible steps.",
    "Talk about a time that you are proud to have told someone \u201cno.\u201d",
    "The world would be a lot better if\u2026",
    "Think about a \u201cwhat if?\u201d or worst-case scenario and work your way through the problem, identifying your options to get through it if it were to happen.",
    "Think about the last time you cried. If those tears could talk, what would they have said?",
    "What are some small things that other people have done that really make your day?",
    "What are some things that frustrate you? Can you find any values that explain why they bug you so much?",
    "What are some things that you could invest more money in to make life smoother and easier for yourself?",
    "What biases do you need to work on?",
    "What could you do to make your life more meaningful?",
    "What did you learn from your last relationship? If you haven\u2019t had one, what could you learn from a relationship that you\u2019ve observed?",
    "What do you need to give yourself more credit for?",
    "What do you wish you could do more quickly? What do you wish you could do more slowly?",
    "What does \u201cready\u201d feel like to you? How did you know you were ready for a major step that you have taken in your life?",
    "What happens when you are angry?",
    "What is a boundary that you need to draw in your life?",
    "What is a made-up rule about your life that you are applying to yourself? How has this held you back and how might you change it?",
    "What is a positive habit that you would really like to cultivate? Why and how could you get started?",
    "What is a question that you are really scared to know the answer to?",
    "What is a reminder that you would like to tell yourself next time you are in a downward spiral?",
    "What is a view about the world that has changed for you as you\u2019ve gotten older?",
    "What is holding you back from being more productive at the moment? What can you do about that?",
    "What is something that you grew out of that meant a lot to you at the time?",
    "What is something that you have a hard time being honest about, even to those you trust the most? Why?",
    "What life lessons, advice, or habits have you picked up from fiction books?",
    "What made you feel most alive when you were young?",
    "What part of your work do you most enjoy? What part do you least enjoy? Why?",
    "What pet peeves do you have? Any idea why they drive you so crazy?",
    "What sensations or experience do you tend to avoid in your life? Why?",
    "What was a seemingly inconsequential decision that made a big impact in your life?",
    "What would you do if you could stop time for two months?",
    "When was the last time you had to hold your tongue? What would you have said if you didn't have to?",
    "Which emotions in others do you have a difficult time being around? Why?",
    "Which quotes or pieces of advice do you have committed to memory? Why have those stuck with you?",
    "Which songs have vivid memories for you?",
    "Who has been your greatest teacher?",
    "Who is somebody that you miss? Why?",
    "Who is the most difficult person in your life and why?",
    "Why do you dress the way that you do?",
    "Write a complete story with just six words. For example: Turns out the pain was temporary.",
    "Write a letter to someone you miss dearly.",
    "Write a letter to your own body, thanking it for something amazing it has done.",
    "Write a thank you note to someone. Sending is optional.",
    "Write about a mistake that taught you something about yourself.",
    "Write about an aspect of your personality that you appreciate in other people as well.",
    "Write about something (or someone) that is currently tempting you.",
    "Write about something that you would like to let go of.",
    "Write an apology to yourself for a time you treated yourself poorly.",
    "You have been temporarily blinded by a bright light. When your vision clears, what do you see?",

    // Decide Your Legacy Prompts
    "What is something unexpected that happened to you recently? How did it impact you?",
    "What does love mean to you? How would you describe it to someone else?",
    "What was one of the best days of your life, and why? Also, what was one of the worst?",
    "What are five small moments that you were grateful for in the past week?",
    "What was one of the scariest moments of your life, and why was it scary?",
    "How did you come to live at your current residence, and why are you living here?",
    "How do you define personal success, and how do you plan to achieve it?",
    "How will you enjoy retirement when you no longer want to work?",
    "How has the past year treated you? What can you do to make this year better?",
    "How have your current habits been serving you? Are there any that need to change?",
    "Why are you hesitating to take the next step on a personal project? What do you need to move forward?",
    "Why is your current lifestyle satisfactory? If it isn't, why not?",
    "Why are you working at your job? How can you make your job better serve your needs?",
    "Why should someone invest in you today? What do you want to accomplish?",
    "Why haven't you taken a risk recently? What do you need to take a calculated risk?",
    "Who has had the greatest influence on your life? What did they do?",
    "Who is pushing you to be the best version of yourself? Who is sabotaging your efforts?",
    "Who has done a recent act of kindness for you? Who can you do a random act of kindness to today?",
    "Who is your personal role model? Why are they your role model?",
    "Who has invested in your well-being recently? Who could you invest in?",
    "When life gets overwhelming, what do you do to regain composure?",
    "When was the last time you did an activity for only yourself? When can you do so again?",
    "When did you last take a significant risk? What was it and why did you do it?",
    "When was the last time you were genuinely curious?",
    "When do you reflect on your life? Do you regularly schedule a time to reflect?",
    "What is your favorite time of the day and why?",
    "How did you meet your first best friend? What are they up to now?",
    "When have you exceeded your expectations? What did you do?",
    "Of all living people, who would you most like to have a three-hour dinner with?",
    "Are you a spender or a saver? Why?",
    "Life is too short to tolerate __________________.",
    "If you could get rid of any one bad habit, what would it be?",
    "Describe a fear you overcame and how you did so.",
    "What is the most valuable lesson you have learned? Who taught it to you?",
    "If you could have any career, what would it be and why?",
    "What do you wish you were the best at?",
    "How has fear held you back?",
    "What would you do if you were 10 times more confident?",
    "Write down an interesting, insightful, or inspiring insight that changed your mind.",
    "List down three goals you want to achieve within the next three months.",
    "What is something unique about you that no one knows? Why haven't you shared it?",
    "Have you ever had a nickname? What is it and how did you earn the name?",
    "What is your biggest regret?",
    "What is your greatest accomplishment?",
    "Journal about your favorite artist, author, or creator. Why do you enjoy their work?",
    "How would you behave if you didn't care about other people's expectations?",
    "Other than money, what have you gained from your current job?",
    "Who has made you laugh recently? What did they do to make you laugh?",
    "List your favorite foods, drinks, snacks, desserts, and more. When was the last time you got to enjoy one of them with a friend?",
    "Create a motto for your life.",
    "When was the last time you overcame a difficult obstacle? How did you beat it?",
    "Have you taken a day to disconnect from responsibilities? When was the last time you did so?",
    "If you had a magic wand to solve any one problem, what would it be and how would your life change?",
    "If you were unapologetically loved and accepted by yourself, what would change moving forward?",
    "What are you the best at? What do you love doing the most? How could you spend more time engaging in both activities?",
    "What makes your heart happy? What gives you the greatest thrills?",
    "What do you believe is holding you back in your life? What could you do to change it to serve you?",
    "Where do you see yourself in three months, six months, nine months, and twelve months? Be specific.",
    "What are your top five memories? Why do they hold a special place in your mind?",
    "How would your life change if you woke up and stopped worrying about your past and your future?",
    "What scares you the most and why? How can you tackle this fear so it controls less of your life?",
    "If you could go back in time and tell yourself one piece of advice, what would it be?",
    "What are three things you are looking forward to doing this week? Why?",
    "Who do you need to forgive? What's stopping you from doing so today?",
    "What opportunities do you have in front of you right now? What's making you hesitate to decide?",
    "How would you like to be remembered when you are gone?",
    "What energizes you? What drains you? How can you maximize your energizers and limit your drainers?",
    "What is an assumption about yourself or the world that has been holding you back?",
    "What is something that is worrying you at the moment? How have you tried to address it?",
    "What was the last book you read? What about it was interesting or useful?",
    "If you were happier, how would people know?",
    "List five people you spend the most time with in your day-to-day life. How are these people helping you grow or live a fulfilling life?",
    "What do you like about yourself? Why do you like these aspects?",
    "What advice would you give to a random stranger?",
    "When did you last spend time with your family or a close friend?",
    "If there were no limits or obstacles in your way, journal about where would you be in 10 years.",
    "When was the last time you were seriously sick? How did you heal yourself?",
    "When was the last time you tried something you were not good at? How did it go?",
    "What are you settling for in your life right now? How could you change that?",
    "Journal about one controversial belief you hold and why you hold firm to it.",
    "What is something you don't want anyone to know about you and why?",
    "List your favorite activities as a child. When did you engage one of those activities? If not now, then when?",
    "What is the last thing you've done that is worth remembering?",
    "When you are 80 years old what will matter to you most?",
    "Write about your last intense encounter and why was it fulfilling or nerve-wracking.",
    "Would you break the law to hold to a personal value? What value and why?",
    "If you could brainwash someone into believing something what would it be and why?",
    "What would you require to be taught in schools if you were in charge of national education?",
    "Which is worse, never making an attempt or failing while trying?",
    "When was the last time you meditated or took a moment to focus on your surroundings?",
    "What does the American Dream mean to you and how are you achieving it?",
    "What is the most desirable trait that another person can possess?",
    "How would you describe a good leader? How would you describe the good follower?",
    "Are you more worried about doing things right or doing the right things? Journal about it.",
    "What is one lie you believed for most of your life?",
    "How would you describe yourself to a stranger?",
    "Reflect on a moment when you stood up for yourself. What was the result?",
    "What were you like as a 7-year-old?",
    "List 3 counterintuitive truths. \"Most people think ______________, but the truth is ________________.\"",
    "Describe your ideal vacation in detail. If you could give a gift to anyone, what gift would you give and why?",

    // Camille Styles Prompts
    "What are three great things that happened yesterday?",
    "What are 10 things that bring you joy?",
    "What are you looking forward to right now? If you can\u2019t think of anything, what can you do to change that?",
    "What is one totally-free thing that\u2019s transformed your life?",
    "What things in your life would you describe as priceless?",
    "What are 10 things you\u2019re actively enjoying about life right now?",
    "Write about the most fun you had recently. What were you doing and who were you with?",
    "Write about an act of kindness that someone did for you that took you by surprise.",
    "What are some of your favorite ways to show the people in your life that you love them?",
    "Reflect on a moment of profound beauty that you recently experienced. What about it surprised you and drew you in?",
    "In this moment, what are three things in your life that you feel the most grateful for?",
    "Write five guilty pleasures you don\u2019t feel guilty about.",
    "In what ways have you felt supported by friends, family, or you community recently?",
    "Name three healthy habits you started within the last year that have changed your life for the better.",
    "Describe your space. What do you love about it?",
    "What are your favorite things to eat?",
    "What are three small, seemingly insignificant moments from the past week that brought you joy?",
    "Write about someone who inspires you. What qualities do they have that you admire?",
    "What are five things your younger self would be amazed by or proud of in your life now?",
    "Describe a recent challenge you overcame. What did it teach you, and how are you stronger because of it?",
    "Name the top three emotions you are feeling at the moment. What are the emotions you want to feel today?",
    "What is the one thing you would tell your teenage self if you could?",
    "What is your body craving at the moment?",
    "What are 10 questions you wish you had the answers to right now?",
    "What do you know to be true today that you didn\u2019t know a year ago?",
    "What are you scared of right now?",
    "What\u2019s not working in your life right now?",
    "Write about someone you miss. What do you miss about them? How do they make you feel?",
    "Picture someone who you\u2019ve experienced a conflict with in the past and try to drop into their perspective. What were they feeling at the time of your conflict? If it\u2019s available to you, how can you express sympathy for their experience?",
    "What areas of your life are causing you stress? What areas of your life are bringing you joy?",
    "What would you describe as being the greatest accomplishment of your life so far?",
    "If someone was to describe your life story back to you, which three events would you want them to highlight the most?",
    "What has been the most transformative year in your life so far?",
    "What is your earliest childhood memory?",
    "How has your relationship to self-love grown and strengthened over the past five years?",
    "What have you learned to forgive yourself for?",
    "What does your ideal day look like, from start to finish? What steps can you take today to make it feel more like that?",
    "When was the last time you felt truly at peace with yourself? What made that moment possible?",
    "What is one fear you\u2019ve faced in the past that you are proud of overcoming?",
    "If you could change one thing about the way you show up in the world, what would it be, and why?",
    "Describe your perfect home. Where is it, what does it look like, and who do you share it with?",
    "When you were younger, what did you want to be when you grew up and why?",
    "If failure wasn\u2019t possible, what would you be doing right now?",
    "If you only had one year left of life, what would you do?",
    "In another life, who would you want to be? Write out this character, what they do for a living, their personality traits, etc.",
    "Reflect on your career and personal goals. Are there parallels and consistencies between the two? How do you keep these two areas of your life separate? How are they the same?",
    "If you could master one skill, what would it be?",
    "What are new ways you can measure progress this year?",
    "What is standing in your way of reaching your goals?",
    "Who are the people you trust the most to help you create the life you\u2019ve always dreamed of?",
    "What habits and actions can you incorporate into your daily routine to help you prioritize your time in 2025?",
    "What would it feel like to step out of your comfort zone? How can you step out of your comfort zone more this year?",
    "What talents or skills do you want to build and strengthen?",
    "What challenges have you overcome in the past? How has doing so made your life more vibrant and full?",
    "What\u2019s a commitment you can make to yourself every day to grow more this year?",
    "What is the one thing you\u2019ve always wanted to achieve but haven\u2019t yet? What steps can you take today to move closer to it?",
    "What does success look like to you right now? How has your definition of success evolved over the years?",
    "What are three specific goals you\u2019d like to accomplish this year, and how can you break them down into manageable steps?",
    "What would you do if you felt completely fearless? How can you embrace that boldness in your current life?",
    "What\u2019s one big dream you\u2019ve been putting off? What\u2019s the first step you can take today to move closer to making it a reality?",
    "What top three qualities do you value most in life?",
    "In what ways are you acting outside of those values?",
    "In what ways are you acting in alignment with them?",
    "What do you want to invite more of into 2025?",
    "What do you want to leave behind?",
    "What\u2019s something you wish others knew about you?",
    "Who is someone you admire? What qualities do you love about them?",
    "What are you looking forward to this week?",
    "Who is someone you envy and why?",
    "What distracts you from what\u2019s truly important each day?",
    "If you decided right now that you had enough money, and that you would always have enough, what would you do with your life?",
    "When you picture yourself 10 years from now, what do you want to have achieved and experienced?",
    "How do you want to contribute your talents and passions to the world? Who could be touched by you and how would it affect them?",
    "What role does love play in your life?",
    "What does friendship mean to you?",
    "How did you prioritize your time today?",
    "What does living authentically look like to you, and how can you bring more of that into your daily life?",
    "What are the core beliefs that guide your decisions? How do they shape your relationships and goals?",
    "In what ways can you practice kindness, both toward yourself and others, more intentionally",
    "How do you define balance in your life, and what actions can you take to bring more of it into your routine?",

    // Stoicism Quotes
    "It\u2019s not what happens to you, but how you react to it that matters.",
    "He who laughs at himself never runs out of things to laugh at.",
    "Only the educated are free.",
    "Some things are in our control and others not. Things in our control are opinion, pursuit, desire, aversion, and, in a word, whatever are our own actions. Things not in our control are body, property, reputation, command, and, in one word, whatever are not our actions.",
    "The greater the difficulty, the more glory in surmounting it. Skillful pilots gain their reputation from storms and tempests.",
    "He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has.",
    "Seek not the good in external things; seek it in yourselves.",
    "People are not disturbed by things, but by the views they take of them.",
    "If anyone tells you that a certain person speaks ill of you, do not make excuses about what is said of you but answer, \u201cHe was ignorant of my other faults, else he would not have mentioned these alone.\u201d",
    "Any person capable of angering you becomes your master; he can anger you only when you permit yourself to be disturbed by him.",
    "Wealth consists not in having great possessions, but in having few wants.",
    "Don\u2019t explain your philosophy. Embody it.",
    "To accuse others for one\u2019s own misfortune is a sign of want of education. To accuse oneself shows that one\u2019s education has begun. To accuse neither oneself nor others shows that one\u2019s education is complete.",
    "There is only one way to happiness and that is to cease worrying about things which are beyond the power or our will.",
    "If you want to improve, be content to be thought foolish and stupid.",
    "The key is to keep company only with people who uplift you, whose presence calls forth your best.",
    "If you would be a reader, read; if a writer, write.",
    "God has entrusted me with myself. No man is free who is not master of himself. A man should so live that his happiness shall depend as little as possible on external things. The world turns aside to let any man pass who knows where he is going.",
    "Remember, it is not enough to be hit or insulted to be harmed, you must believe that you are being harmed. If someone succeeds in provoking you, realize that your mind is complicit in the provocation. Which is why it is essential that we not respond impulsively to impressions; take a moment before reacting, and you will find it easier to maintain control.",
    "A ship should not ride on a single anchor, nor life on a single hope.",
    "Demand not that things happen as you wish, but wish them to happen as they do, and you will go on well.",
    "Remember that you ought to behave in life as you would at a banquet. As something is being passed around it comes to you; stretch out your hand, take a portion of it politely. It passes on; do not detain it. Or it has not come to you yet; do not project your desire to meet it, but wait until it comes in front of you. So act toward children, so toward a wife, so toward office, so toward wealth.",
    "Events do not just happen, but arrive by appointment.",
    "Either God wants to abolish evil, and cannot; or he can, but does not want to.",
    "It is unrealistic to expect people to see you as you see yourself.",
    "You have power over your mind \u2014 not outside events. Realize this, and you will find strength.",
    "The soul becomes dyed with the colour of its thoughts.",
    "Do not act as if you were going to live ten thousand years. Death hangs over you. While you live, while it is in your power, be good.",
    "Dwell on the beauty of life. Watch the stars, and see yourself running with them. Think constantly on the changes of the elements into each other, for such thoughts wash away the dust of earthly life.",
    "The impediment to action advances action. What stands in the way becomes the way.",
    "If it is not right do not do it; if it is not true do not say it.",
    "If any man despises me, that is his problem. My only concern is not doing or saying anything deserving of contempt.",
    "The first rule is to keep an untroubled spirit. The second is to look things in the face and know them for what they are.",
    "Never let the future disturb you. You will meet it, if you have to, with the same weapons of reason which today arm you against the present.",
    "How much time he gains who does not look to see what his neighbour says or does or thinks, but only at what he does himself, to make it just and holy.",
    "Very little is needed to make a happy life; it is all within yourself in your way of thinking.",
    "Whenever you are about to find fault with someone, ask yourself the following question: What fault of mine most nearly resembles the one I am about to criticize?",
    "If you are distressed by anything external, the pain is not due to the thing itself, but to your estimate of it; and this you have the power to revoke at any moment.",
    "The happiness of your life depends upon the quality of your thoughts.",
    "Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth.",
    "If someone is able to show me that what I think or do is not right, I will happily change, for I seek the truth, by which no one was ever truly harmed. It is the person who continues in his self-deception and ignorance who is harmed.",
    "I have often wondered how it is that every man loves himself more than all the rest of men, but yet sets less value on his own opinion of himself than on the opinion of others.",
    "Begin each day by telling yourself: Today I shall be meeting with interference, ingratitude, insolence, disloyalty, ill-will, and selfishness \u2013 all of them due to the offenders\u2019 ignorance of what is good or evil.",
    "Perfection of character is this: to live each day as if it were your last, without frenzy, without apathy, without pretence.",
    "A person\u2019s worth is measured by the worth of what he values.",
    "Observe always that everything is the result of change, and get used to thinking that there is nothing Nature loves so well as to change existing forms and make new ones like them.",
    "Or is it your reputation that\u2019s bothering you? But look at how soon we\u2019re all forgotten. The abyss of endless time that swallows it all. The emptiness of those applauding hands. The people who praise us; how capricious they are, how arbitrary. And the tiny region it takes place. The whole earth a point in space \u2013 and most of it uninhabited.",
    "Be like the cliff against which the waves continually break; but it stands firm and tames the fury of the water around it.",
    "A man must stand erect, not be kept erect by others.",
    "We suffer more often in imagination than in reality.",
    "If you really want to escape the things that harass you, what you\u2019re needing is not to be in a different place but to be a different person.",
    "Sometimes even to live is an act of courage.",
    "Fire tests gold, suffering tests brave men.",
    "Enjoy present pleasures in such a way as not to injure future ones.",
    "They lose the day in expectation of the night, and the night in fear of the dawn.",
    "It is not that we have so little time but that we lose so much. The life we receive is not short but we make it so; we are not ill provided but use what we have wastefully.",
    "Luck is what happens when preparation meets opportunity.",
    "The greatest obstacle to living is expectancy, which hangs upon tomorrow and loses today. You are arranging what lies in Fortune\u2019s control, and abandoning what lies in yours. What are you looking at? To what goal are you straining? The whole future lies in uncertainty: live immediately.",
    "If a man knows not to which port he sails, no wind is favorable.",
    "Anger, if not restrained, is frequently more hurtful to us than the injury that provokes it.",
    "True happiness is to enjoy the present, without anxious dependence upon the future, not to amuse ourselves with either hopes or fears but to rest satisfied with what we have, which is sufficient, for he that is so wants nothing.",
    "The greatest blessings of mankind are within us and within our reach. A wise man is content with his lot, whatever it may be, without wishing for what he has not.",
    "All cruelty springs from weakness.",
    "Difficulties strengthen the mind, as labor does the body.",
    "Withdraw into yourself, as far as you can. Associate with those who will make a better man of you. Welcome those whom you yourself can improve. The process is mutual; for men learn while they teach.",
    "He who spares the wicked injures the good.",
    "You act like mortals in all that you fear, and like immortals in all that you desire.",
    "He suffers more than necessary, who suffers before it is necessary.",
    "A gift consists not in what is done or given, but in the intention of the giver or doer.",
    "People are frugal in guarding their personal property; but as soon as it comes to squandering time they are most wasteful of the one thing in which it is right to be stingy.",
    "Every new beginning comes from some other beginning\u2019s end.",
    "To win true freedom you must be a slave to philosophy.",
    "It is a rough road that leads to the heights of greatness.",
    "Often a very old man has no other proof of his long life than his age.",
    "No man is crushed by misfortune unless he has first been deceived by prosperity.",
    "Man conquers the world by conquering himself.",
    "Better to trip with the feet than with the tongue.",
    "Well-being is realized by small steps, but is truly no small thing.",
    "Nothing is more hostile to a firm grasp on knowledge than self-deception.",
    "The goal of life is living in agreement with Nature.",
    "We have two ears and one mouth, so we should listen more than we say.",
    "If you lay violent hands on me, you\u2019ll have my body, but my mind will remain with Stilpo.",
    "Happiness is a good flow of life.",
    "A bad feeling is a commotion of the mind repugnant to reason, and against nature.",
    "No loss should be more regrettable to us than losing our time, for it\u2019s irretrievable.",
    "Wealth is able to buy the pleasures of eating, drinking and other sensual pursuits-yet can never afford a cheerful spirit or freedom from sorrow.",
    "In our control is the most beautiful and important thing, the thing because of which even the god himself is happy\u2014 namely, the proper use of our impressions. We must concern ourselves absolutely with the things that are under our control and entrust the things not in our control to the universe.",
    "If you accomplish something good with hard work, the labor passes quickly, but the good endures; if you do something shameful in pursuit of pleasure, the pleasure passes quickly, but the shame endures.",
    "Choose to die well while you can; wait too long, and it might become impossible to do so.",
    "If we were to measure what is good by how much pleasure it brings, nothing would be better than self-control- if we were to measure what is to be avoided by its pain, nothing would be more painful than lack of self-control.",
    "From good people you\u2019ll learn good, but if you mingle with the bad you\u2019ll destroy such soul as you had.",
    "You will earn the respect of all if you begin by earning the respect of yourself. Don\u2019t expect to encourage good deeds in people conscious of your own misdeeds.",
    "Since every man dies, it is better to die with distinction than to live long.",
    "To accept injury without a spirit of savage resentment-to show ourselves merciful toward those who wrong us-being a source of good hope to them-is characteristic of a benevolent and civilized way of life.",
    "We will train both soul and body when we accustom ourselves to cold, heat, thirst, hunger, scarcity of food, hardness of bed, abstaining from pleasures, and enduring pains.",
    "What good are gilded rooms or precious stones-fitted on the floor, inlaid in the walls, carried from great distances at the greatest expense? These things are pointless and unnecessary-without them isn\u2019t it possible to live healthy? Aren\u2019t they the source of constant trouble? Don\u2019t they cost vast sums of money that, through public and private charity, may have benefited many?",
    "Being good is the same as being a philosopher. If you obey your father, you will follow the will of a man; if you choose the philosopher\u2019s life, the will of the universe. It is plain, therefore, that your duty lies in the pursuit of philosophy.",
    "For mankind, evil is injustice and cruelty and indifference to a neighbour\u2019s trouble, while virtue is brotherly love and goodness and justice and beneficence and concern for the welfare of your neighbour\u2014with.",
    "Husband and wife should come together to craft a shared life, procreating children, seeing all things as shared between them-with nothing withheld or private to one another-not even their bodies.",
    "To accept injury without a spirit of savage resentment-to show ourselves merciful toward those who wrong us-being a source of good hope to them-is characteristic of a benevolent and civilized way of life.",

    // Thich Nhat Hanh Prompts
    "As you breathe in and out right now, what sensations do you notice?",
    "Where did you find a moment of true peace and stillness today?",
    "How can you look deeply into the suffering of a person you encountered today to cultivate compassion?",
    "What is a beautiful, simple thing in the present moment that you might be overlooking?",
    "How can you apply mindful awareness to a task you usually rush through?"
];

let currentTradition = 'blended';

document.querySelectorAll('.pill[data-tradition]').forEach(pill => {
    pill.addEventListener('click', () => {
        document.querySelectorAll('.pill[data-tradition]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentTradition = pill.dataset.tradition;
        loadJournalPrompt();
    });
});

const newPromptBtn = document.getElementById('new-prompt-btn');
if (newPromptBtn) {
    newPromptBtn.addEventListener('click', () => {
        loadJournalPrompt();
    });
}

// Journal Sub-Tabs
document.querySelectorAll('.j-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.j-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.j-section').forEach(s => s.style.display = 'none');
        tab.classList.add('active');
        const target = `j-sec-${tab.dataset.jtab}`;
        const targetElement = document.getElementById(target);
        if (targetElement) targetElement.style.display = 'block';

        if (tab.dataset.jtab === 'prompt-list') loadPromptList();
        if (tab.dataset.jtab === 'random-prompt') {
            const randomPromptArea = document.getElementById('random-prompt-area');
            if (randomPromptArea && randomPromptArea.innerHTML.includes('Click \'Draw Another\'')) {
                generateRandomPrompt();
            }
        }
    });
});

// Random Prompt Logic
function generateRandomPrompt() {
    const area = document.getElementById('random-prompt-area');
    if (!area) return;
    const randomPrompt = templatePrompts[Math.floor(Math.random() * templatePrompts.length)];
    area.innerHTML = `
        <div class="prompt-card">
            <p class="prompt-text">"${randomPrompt}"</p>
        </div>
        <div style="margin-top: 12px; display: flex; gap: 8px;">
            <button class="btn btn-secondary use-prompt-btn" data-prompt="${randomPrompt.replace(/"/g, '&quot;')}" style="flex: 1; font-size: 13px;">📝 Use This Prompt</button>
            <button class="btn btn-secondary copy-prompt-btn" data-prompt="${randomPrompt.replace(/"/g, '&quot;')}" style="flex: 1; font-size: 13px;">📋 Copy</button>
        </div>
    `;

    // Re-bind listeners
    const usePromptBtn = area.querySelector('.use-prompt-btn');
    if (usePromptBtn) {
        usePromptBtn.addEventListener('click', (e) => {
            const journalContent = document.getElementById('journal-content');
            if (journalContent) {
                journalContent.value = '"' + e.target.dataset.prompt + '"\n\n';
                journalContent.focus();
            }
        });
    }
    const copyPromptBtn = area.querySelector('.copy-prompt-btn');
    if (copyPromptBtn) {
        copyPromptBtn.addEventListener('click', (e) => {
            navigator.clipboard.writeText(e.target.dataset.prompt);
            showToast('Prompt copied to clipboard!');
        });
    }
}

const generateRandomPromptBtn = document.getElementById('generate-random-prompt-btn');
if (generateRandomPromptBtn) generateRandomPromptBtn.addEventListener('click', generateRandomPrompt);

// Prompt List Logic
let promptListLoaded = false;
function loadPromptList() {
    if (promptListLoaded) return;
    const area = document.getElementById('prompt-list-area');
    if (!area) return;
    area.innerHTML = templatePrompts.map(p => `
        <div class="prompt-inline-item" style="padding: 10px; background: var(--bg-secondary); border-radius: 6px; cursor: pointer; transition: background 0.2s;" data-prompt="${p.replace(/"/g, '&quot;')}">
            <p style="font-size: 14px; margin: 0; color: var(--text-primary); line-height: 1.4;">${p}</p>
        </div>
    `).join('');

    // Click to use
    area.querySelectorAll('.prompt-inline-item').forEach(item => {
        item.addEventListener('click', () => {
            const text = item.dataset.prompt;
            const journalContent = document.getElementById('journal-content');
            if (journalContent) {
                journalContent.value = '"' + text + '"\n\n';
                journalContent.focus();
            }
            showToast('Prompt loaded into journal entry');
        });
        item.addEventListener('mouseover', () => item.style.background = 'var(--border)');
        item.addEventListener('mouseout', () => item.style.background = 'var(--bg-secondary)');
    });
    promptListLoaded = true;
}

async function loadJournalPrompt() {
    const area = document.getElementById('journal-prompt-area');
    if (!area) return;
    area.innerHTML = '<div class="spinner"></div> Generating your prompt...';

    try {
        const prompt = await apiGet(`/api/journal/prompt?tradition=${currentTradition}`);
        area.innerHTML = `
            <div class="prompt-card">
                <p class="prompt-text">"${prompt.prompt}"</p>
                ${prompt.related_quote ? `
                    <div class="prompt-quote">
                        "${prompt.related_quote}"
                        <div class="prompt-source">— ${prompt.quote_source || 'Unknown'}</div>
                    </div>
                ` : ''}
                <div class="prompt-context">${prompt.context_reason || ''}</div>
            </div>
        `;
    } catch (err) {
        area.innerHTML = `
            <div class="prompt-card">
                <p class="prompt-text">"Take three conscious breaths. With each exhale, release one thing you're holding onto. What remains when you let go?"</p>
                <div class="prompt-quote">
                    "Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor."
                    <div class="prompt-source">— Thich Nhat Hanh</div>
                </div>
                <div class="prompt-context">Fallback prompt — set up your GOOGLE_API_KEY for AI-generated prompts</div>
            </div>
        `;
    }
}

// Journal Themes Selection
let selectedThemes = [];
document.addEventListener('click', e => {
    const pill = e.target.closest('.theme-pill');
    if (!pill) return;

    // Ignore clicks on static themes in the history view
    if (pill.hasAttribute('data-static')) return;

    const theme = pill.dataset.theme;
    if (!theme) return;

    if (selectedThemes.includes(theme)) {
        selectedThemes = selectedThemes.filter(t => t !== theme);
        pill.classList.remove('active');
    } else {
        if (selectedThemes.length >= 3) {
            showToast('You can only select up to 3 themes.');
            return;
        }
        selectedThemes.push(theme);
        pill.classList.add('active');
    }
});

const journalForm = document.getElementById('journal-form');
if (journalForm) {
    journalForm.addEventListener('submit', async e => {
        e.preventDefault();
        const editId = document.getElementById('journal-edit-id')?.value;
        const content = document.getElementById('journal-content')?.value;
        const data = {
            date: document.getElementById('journal-date')?.value,
            content: content,
            word_count: content?.trim().split(/\s+/).filter(w => w).length || 0,
            tradition: currentTradition,
            themes: selectedThemes
        };

        try {
            if (editId) {
                await fetch(`${API}/api/journal/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                showToast('✓ Entry updated');
                // Reset edit state
                document.getElementById('journal-edit-id').value = '';
                const submitBtn = document.querySelector('#journal-form button[type="submit"]');
                if (submitBtn) submitBtn.textContent = 'Save Entry 📝';
            } else {
                const result = await apiPost('/api/journal', data);
                showToast(`✓ Entry saved (${result.word_count} words)`);
            }
            journalForm.reset();
            const journalDate = document.getElementById('journal-date');
            if (journalDate) journalDate.value = today();
            const journalWc = document.getElementById('journal-wc');
            if (journalWc) journalWc.textContent = '0 words';

            loadJournalHistory();

            // Reset themes
            selectedThemes = [];
            document.querySelectorAll('.theme-pill').forEach(p => p.classList.remove('active'));
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    });
}

async function loadJournalHistory() {
    try {
        const data = await apiGet('/api/journal?limit=10');
        const container = document.getElementById('journal-history');
        if (!container) return;
        if (!data.length) {
            container.innerHTML = '<div class="loading-text">No entries yet. Start writing!</div>';
            return;
        }
        // Store for editing
        window._journalData = {};
        data.forEach(j => { window._journalData[j.id] = j; });

        container.innerHTML = data.map(j => {
            const themesHtml = (j.themes && j.themes.length) ?
                j.themes.map(t => `<span class="pill theme-pill" data-static="true" style="font-size:10px; padding:2px 6px; margin-left:6px; background:var(--accent-light); color:var(--accent-dark); border:none; display:inline-block; vertical-align:middle; cursor:default;">${t}</span>`).join('') : '';

            const isLong = j.content.length > 200;
            const shortContent = isLong ? j.content.substring(0, 200) : j.content;

            return `
            <div class="history-item" style="display:flex; justify-content:space-between; align-items:flex-start; position:relative;" onmouseover="this.querySelector('.journal-edit-btn').style.opacity='1'" onmouseout="this.querySelector('.journal-edit-btn').style.opacity='0'">
                <button class="journal-edit-btn" data-journal-id="${j.id}" title="Edit"
                    style="position:absolute; top:8px; right:8px; width:24px; height:24px; border-radius:4px; border:1px solid var(--border); background:var(--bg-card); color:var(--text-primary); font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s;">✏️</button>
                <div class="history-item-left" style="width: 100%; padding-right:32px;">
                    <div style="display:flex; align-items:center; flex-wrap:wrap;">
                        <strong>${j.date || 'N/A'}</strong>
                        ${themesHtml}
                    </div>
                    <div class="item-meta journal-content-preview" data-journal-id="${j.id}" style="margin-top:4px;color:var(--text-primary);line-height:1.5;">
                        <span class="journal-short-text">${shortContent}${isLong ? '...' : ''}</span>
                        ${isLong ? `<span class="journal-full-text" style="display:none;">${j.content}</span>` : ''}
                        ${isLong ? `<button class="journal-expand-btn" data-journal-id="${j.id}" style="background:none; border:none; color:var(--accent); cursor:pointer; font-size:12px; font-weight:600; margin-left:4px;">see more</button>` : ''}
                    </div>
                </div>
                <div class="history-item-right" style="min-width:60px">
                    <div class="amount">${j.word_count || 0} w</div>
                </div>
            </div>
            `;
        }).join('');

        // Expand/collapse listeners
        container.querySelectorAll('.journal-expand-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const preview = btn.closest('.journal-content-preview');
                const shortText = preview.querySelector('.journal-short-text');
                const fullText = preview.querySelector('.journal-full-text');
                if (fullText.style.display === 'none') {
                    shortText.style.display = 'none';
                    fullText.style.display = 'inline';
                    btn.textContent = 'see less';
                } else {
                    shortText.style.display = 'inline';
                    fullText.style.display = 'none';
                    btn.textContent = 'see more';
                }
            });
        });

        // Edit listeners
        container.querySelectorAll('.journal-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const journal = window._journalData[btn.dataset.journalId];
                if (journal) openJournalEdit(journal);
            });
        });
    } catch (err) {
        const container = document.getElementById('journal-history');
        if (container) container.innerHTML =
            '<div class="loading-text">Could not load journals</div>';
    }

    // Also load gratitude alongside journals
    loadGratitudeHistory();
}

// ─── Journal Edit Helpers ──────────────────────────────────────
function openJournalEdit(j) {
    // Create hidden field if not present
    let editId = document.getElementById('journal-edit-id');
    if (!editId) {
        editId = document.createElement('input');
        editId.type = 'hidden';
        editId.id = 'journal-edit-id';
        document.getElementById('journal-form').prepend(editId);
    }
    editId.value = j.id;
    const jDate = document.getElementById('journal-date');
    if (jDate) jDate.value = j.date || today();
    const jContent = document.getElementById('journal-content');
    if (jContent) jContent.value = j.content || '';
    const journalWc = document.getElementById('journal-wc');
    if (journalWc) journalWc.textContent = `${j.word_count || 0} words`;

    // Set themes
    selectedThemes = j.themes || [];
    document.querySelectorAll('.theme-pill').forEach(p => {
        p.classList.toggle('active', selectedThemes.includes(p.dataset.theme));
    });

    const submitBtn = document.querySelector('#journal-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Update Entry 🔄';

    document.querySelector('.journal-col-entry')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Gratitude ─────────────────────────────────────────────────

const gratitudeForm = document.getElementById('gratitude-form');
if (gratitudeForm) {
    gratitudeForm.addEventListener('submit', async e => {
        e.preventDefault();
        const content = document.getElementById('gratitude-list')?.value;
        const data = {
            date: document.getElementById('journal-date')?.value || today(),
            content: content
        };

        try {
            await apiPost('/api/gratitude', data);
            showToast(`✓ Gratitude saved`);
            gratitudeForm.reset();
            loadGratitudeHistory();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    });
}

async function loadGratitudeHistory() {
    try {
        const data = await apiGet('/api/gratitude?limit=10');
        const container = document.getElementById('gratitude-history-list');
        if (!container) return;
        if (!data.length) {
            container.innerHTML = '<div class="loading-text">No gratitude logged yet.</div>';
            return;
        }
        // Store for editing
        window._gratitudeData = {};
        data.forEach(g => { window._gratitudeData[g.id] = g; });

        // Group by user typed list or bullet points
        container.innerHTML = data.map(g => {
            const listItems = (g.content || '').split('\n').filter(l => l.trim()).map(l => `<li style="margin-bottom: 4px;">${l.replace(/^- /, '')}</li>`).join('');
            return `
            <div class="history-item" style="display:block; padding: 12px 16px; border-bottom: 1px solid var(--border); position:relative;" onmouseover="this.querySelector('.gratitude-edit-btn').style.opacity='1'" onmouseout="this.querySelector('.gratitude-edit-btn').style.opacity='0'">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <span style="font-size:12px; color:var(--text-secondary);">${g.date || ''}</span>
                    <div style="display:flex; gap:4px;">
                        <button class="gratitude-edit-btn" data-gratitude-id="${g.id}" title="Edit"
                            style="width:24px; height:24px; border-radius:4px; border:1px solid var(--border); background:var(--bg-card); color:var(--text-primary); font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s;">✏️</button>
                        <button class="gratitude-delete-btn" data-gratitude-id="${g.id}" title="Delete"
                            style="width:24px; height:24px; border-radius:4px; border:1px solid var(--border); background:var(--bg-card); color:var(--accent-rose); font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s;">🗑</button>
                    </div>
                </div>
                <ul style="margin: 0; padding-left: 20px; color: var(--text-primary); line-height: 1.6;">
                    ${listItems}
                </ul>
            </div>
            `;
        }).join('');

        // Edit listeners
        container.querySelectorAll('.gratitude-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const g = window._gratitudeData[btn.dataset.gratitudeId];
                if (g) {
                    document.getElementById('gratitude-list').value = g.content || '';
                    // Switch to gratitude tab
                    document.querySelectorAll('.j-tab').forEach(t => t.classList.remove('active'));
                    document.querySelector('[data-jtab="gratitude"]')?.classList.add('active');
                    document.querySelectorAll('.j-section').forEach(s => s.style.display = 'none');
                    document.getElementById('j-sec-gratitude').style.display = 'block';
                }
            });
        });
        container.querySelectorAll('.gratitude-delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Delete this gratitude entry?')) {
                    try {
                        await fetch(`${API}/api/gratitude/${btn.dataset.gratitudeId}`, { method: 'DELETE' });
                        showToast('✓ Gratitude deleted');
                        loadGratitudeHistory();
                    } catch (err) {
                        showToast('Error: ' + err.message, 'error');
                    }
                }
            });
        });
    } catch (err) {
        const container = document.getElementById('gratitude-history-list');
        if (container) container.innerHTML =
            '<div class="loading-text">Could not load gratitude</div>';
    }
}

// ─── Reviews ───────────────────────────────────────────────────

let currentPeriod = 'weekly';

// Period tab switching
document.querySelectorAll('.period-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentPeriod = tab.dataset.period;
        loadReviewData();
    });
});

// Generate review button
const genReviewBtn = document.getElementById('generate-insights-btn');
if (genReviewBtn) {
    genReviewBtn.addEventListener('click', () => {
        loadReview(currentPeriod);
    });
}

async function loadReviewData() {
    try {
        const review = await apiGet(`/api/review/${currentPeriod}?generate=false`);
        const m = review.metrics || {};

        // Top metrics (Guarded)
        const mKm = document.getElementById('m-km');
        if (mKm) mKm.textContent = m.total_km || 0;
        const mMed = document.getElementById('m-meditation');
        if (mMed) mMed.textContent = `${m.meditation_pct || 0}%`;
        const mEnergy = document.getElementById('m-energy');
        if (mEnergy) mEnergy.textContent = m.avg_energy || '--';
        const mBooks = document.getElementById('m-books');
        if (mBooks) mBooks.textContent = m.books_finished || 0;

        // Body category (Guarded)
        const catRunKm = document.getElementById('cat-run-km');
        if (catRunKm) catRunKm.textContent = `${m.total_km || 0} km`;
        const runGoalKm = currentPeriod === 'weekly' ? 40 : currentPeriod === 'monthly' ? 160 : 480;
        setProgressBar('cat-run-bar', m.total_km || 0, runGoalKm);
        const catSleepAvg = document.getElementById('cat-sleep-avg');
        if (catSleepAvg) catSleepAvg.textContent = `${m.avg_sleep || '--'} hrs`;
        const catStepsPct = document.getElementById('cat-steps-pct');
        if (catStepsPct) catStepsPct.textContent = `${m.steps_pct || 0}%`;
        const catStepsStreak = document.getElementById('cat-steps-streak');
        if (catStepsStreak) {
            catStepsStreak.textContent = `${m.current_steps_streak || 0} 🔥`;
        }

        // Mind category (Guarded)
        const catDeepwork = document.getElementById('cat-deepwork');
        if (catDeepwork) catDeepwork.textContent = `${m.deep_work_hours || 0} hrs`;
        const catBooks = document.getElementById('cat-books');
        if (catBooks) catBooks.textContent = m.books_finished || 0;

        // Reading pace (Guarded)
        try {
            const stats = await apiGet('/api/books/stats');
            const catBooksPace = document.getElementById('cat-books-pace');
            if (catBooksPace) catBooksPace.textContent = `${stats.books_finished}/${stats.yearly_goal}`;
            setProgressBar('cat-books-bar', stats.books_finished, stats.yearly_goal);
        } catch (e) {
            const catBooksPace = document.getElementById('cat-books-pace');
            if (catBooksPace) catBooksPace.textContent = '--';
        }

        // Spirit category (Guarded)
        const catMedPct = document.getElementById('cat-meditation-pct');
        if (catMedPct) catMedPct.textContent = `${m.meditation_pct || 0}%`;
        setProgressBar('cat-meditation-bar', m.meditation_pct || 0, 100);
        const catMeditationStreak = document.getElementById('cat-meditation-streak');
        if (catMeditationStreak) {
            catMeditationStreak.textContent = `${m.current_meditation_streak || 0} 🔥`;
        }
        const catJournalCount = document.getElementById('cat-journal-count');
        if (catJournalCount) catJournalCount.textContent = m.journal_entries || 0;
        const catAlignment = document.getElementById('cat-alignment');
        if (catAlignment) catAlignment.textContent = `${m.avg_alignment || '--'}/10`;

        // Tracking Streak (Global)
        const globalCheckinStreak = document.getElementById('global-checkin-streak');
        if (globalCheckinStreak) {
            globalCheckinStreak.textContent = `${m.current_checkin_streak || 0} days`;
        }

        // Social category in review
        try {
            const socialStats = await apiGet('/api/social/stats');
            const catSocialInteractions = document.getElementById('cat-social-interactions');
            if (catSocialInteractions) catSocialInteractions.textContent = socialStats.total_interactions || 0;
            const catSocialPeople = document.getElementById('cat-social-people');
            if (catSocialPeople) catSocialPeople.textContent = socialStats.unique_people || 0;
            const topCat = Object.entries(socialStats.by_category || {}).sort((a, b) => b[1] - a[1])[0];
            const catSocialTop = document.getElementById('cat-social-top');
            if (catSocialTop) catSocialTop.textContent = topCat ? topCat[0].replace('_', ' ') : '--';
        } catch (e) { /* no social data yet */ }

        // Financial category in review
        try {
            const expenseData = await apiGet('/api/travel/expenses');
            if (expenseData && expenseData.total_usd !== undefined) {
                const catFinancialSpend = document.getElementById('cat-financial-spend');
                if (catFinancialSpend) catFinancialSpend.textContent = `$${expenseData.total_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
                // VND total
                const totalVnd = (expenseData.expenses || []).reduce((sum, e) => sum + (e.amount_vnd || 0), 0);
                const formatVnd = (v) => v >= 1000 ? `${Math.round(v / 1000)}K` : Math.round(v);
                const catFinancialSpendVnd = document.getElementById('cat-financial-spend-vnd');
                if (catFinancialSpendVnd) catFinancialSpendVnd.textContent = `${formatVnd(totalVnd)} VND`;
                const topExpCat = Object.entries(expenseData.by_category || {}).sort((a, b) => b[1] - a[1])[0];
                const catFinancialTop = document.getElementById('cat-financial-top');
                if (catFinancialTop) catFinancialTop.textContent = topExpCat ? topExpCat[0] : '--';
            }
        } catch (e) { /* no financial data yet */ }

        // Five Non-Negotiables with bars (UI removed for now)

    } catch (err) {
        console.log('Could not load review data:', err);
    }
}

function setProgressBar(barId, value, max) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    const bar = document.getElementById(barId);
    if (bar) bar.style.width = `${pct}%`;
}

function setNNWithBar(valueId, barId, value, suffix = '') {
    const el = document.getElementById(valueId);
    const bar = document.getElementById(barId);
    const v = value || 0;
    if (el) el.textContent = `${v}${suffix}`;
    if (el) el.className = `nn-value ${v >= 70 ? 'good' : v >= 40 ? 'warn' : 'bad'}`;
    if (bar) {
        bar.style.width = `${Math.min(v, 100)}%`;
        bar.style.background = v >= 70 ? 'var(--accent)' : v >= 40 ? 'var(--accent-amber)' : 'var(--accent-rose)';
    }
}

async function loadReview(period) {
    const bodyDiv = document.getElementById('ai-insights-content');
    if (!bodyDiv) return;

    bodyDiv.innerHTML = '<div class="loading-text"><div class="spinner" style="display:inline-block; border: 2px solid #ddd; border-top-color: var(--accent); border-radius: 50%; width: 14px; height: 14px; animation: spin 1s linear infinite;"></div> Analyzing your data and generating AI insights...</div>';

    try {
        const review = await apiGet(`/api/review/${period}?generate=true`);
        const ai = review.ai_review || {};

        bodyDiv.innerHTML = `
            <div class="review-narrative">${ai.narrative_summary || 'No data available for this period yet. Start tracking to see your review!'}</div>

            ${ai.wins && ai.wins.length ? `
                <div class="review-section">
                    <h4>🏆 Wins</h4>
                    <ul class="review-list">
                        ${ai.wins.map(w => `<li>${w}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            ${ai.patterns && ai.patterns.length ? `
                <div class="review-section">
                    <h4>🔍 Patterns</h4>
                    <ul class="review-list">
                        ${ai.patterns.map(p => `<li>${p}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            ${ai.course_correction ? `
                <div class="review-section">
                    <h4>🔧 Course Correction</h4>
                    <p style="color:var(--text-secondary);font-size:14px;line-height:1.6">${ai.course_correction}</p>
                </div>
            ` : ''}

            ${ai.integration_question ? `
                <div class="prompt-card" style="margin-top:16px">
                    <p class="prompt-text">${ai.integration_question}</p>
                    <div class="prompt-source">Reflection Question</div>
                </div>
            ` : ''}

            ${ai.theme_of_month ? `
                <div class="review-section">
                    <h4>🌟 Theme</h4>
                    <p style="color:var(--text-secondary);font-size:14px;line-height:1.6">${ai.theme_of_month}</p>
                </div>
            ` : ''}

            ${ai.becoming_reflection ? `
                <div class="review-section">
                    <h4>🦋 Who Am I Becoming?</h4>
                    <p style="color:var(--text-secondary);font-size:14px;line-height:1.6">${ai.becoming_reflection}</p>
                </div>
            ` : ''}

            ${ai.next_month_intention || ai.next_quarter_theme ? `
                <div class="review-section">
                    <h4>➡️ Next Intention</h4>
                    <p style="color:var(--text-secondary);font-size:14px;line-height:1.6">${ai.next_month_intention || ai.next_quarter_theme}</p>
                </div>
            ` : ''}
        `;
    } catch (err) {
        bodyDiv.innerHTML = `<div class="loading-text">Could not generate review. Make sure GOOGLE_API_KEY is set.</div>`;
    }
}

// Make loadReview available globally
window.loadReview = loadReview;

// ─── Review Checklists ─────────────────────────────────────────

let currentChecklistData = null;

const loadChecklistBtn = document.getElementById('load-checklist-btn');
if (loadChecklistBtn) {
    loadChecklistBtn.addEventListener('click', async () => {
        const contentDiv = document.getElementById('review-checklist-content');
        const itemsDiv = document.getElementById('review-checklist-items');
        if (!contentDiv || !itemsDiv) return;

        // Get current period from active tab
        const activePeriodTab = document.querySelector('.review-period-tabs .period-tab.active');
        const period = activePeriodTab?.dataset.period || 'weekly';

        // Toggle visibility
        if (contentDiv.style.display !== 'none' && currentChecklistData) {
            contentDiv.style.display = 'none';
            loadChecklistBtn.textContent = 'Open Checklist';
            return;
        }

        itemsDiv.innerHTML = '<div class="loading-text"><div class="spinner"></div> Loading checklist...</div>';
        contentDiv.style.display = 'block';
        loadChecklistBtn.textContent = 'Close';

        try {
            const data = await apiGet(`/api/reviews/checklist?period=${period}`);
            currentChecklistData = data;

            const categories = data.categories || {};
            const completedItems = data.completed_items || [];

            itemsDiv.innerHTML = Object.entries(categories).map(([category, items]) => `
                <div style="background:var(--bg-input); border-radius:10px; padding:12px 14px;">
                    <div style="font-size:14px; font-weight:700; margin-bottom:8px; color:var(--text-primary); text-transform:capitalize;">
                        ${getCategoryIcon(category)} ${category}
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        ${items.map((item, idx) => {
                const itemId = `${category}::${item}`;
                const isChecked = completedItems.includes(itemId);
                return `
                                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; color:var(--text-primary); padding:4px 0;">
                                    <input type="checkbox" class="checklist-item" data-item-id="${itemId}" ${isChecked ? 'checked' : ''}
                                        style="width:18px; height:18px; accent-color:var(--accent); cursor:pointer;">
                                    <span style="${isChecked ? 'text-decoration:line-through; opacity:0.6;' : ''}">${item}</span>
                                </label>
                            `;
            }).join('')}
                    </div>
                </div>
            `).join('');

            // Add strike-through toggle on check
            itemsDiv.querySelectorAll('.checklist-item').forEach(cb => {
                cb.addEventListener('change', () => {
                    const label = cb.closest('label');
                    const span = label.querySelector('span');
                    if (cb.checked) {
                        span.style.textDecoration = 'line-through';
                        span.style.opacity = '0.6';
                    } else {
                        span.style.textDecoration = 'none';
                        span.style.opacity = '1';
                    }
                });
            });
        } catch (err) {
            itemsDiv.innerHTML = '<div class="loading-text">Could not load checklist</div>';
        }
    });
}

function getCategoryIcon(cat) {
    const icons = { body: '🏃', mind: '🧠', spirit: '✨', social: '🤝', career: '💼', financial: '💰' };
    return icons[cat.toLowerCase()] || '✅';
}

const saveChecklistBtn = document.getElementById('save-checklist-btn');
if (saveChecklistBtn) {
    saveChecklistBtn.addEventListener('click', async () => {
        if (!currentChecklistData) return;

        const completedItems = [];
        document.querySelectorAll('.checklist-item:checked').forEach(cb => {
            completedItems.push(cb.dataset.itemId);
        });

        const activePeriodTab = document.querySelector('.review-period-tabs .period-tab.active');
        const period = activePeriodTab?.dataset.period || 'weekly';

        try {
            await apiPost('/api/reviews/checklist', {
                period: period,
                start_date: currentChecklistData.start_date || today(),
                end_date: currentChecklistData.end_date || today(),
                categories: currentChecklistData.categories || {},
                completed_items: completedItems,
                notes: ''
            });
            showToast('✓ Checklist saved');
            loadSavedChecklists();
        } catch (err) {
            showToast('Error saving checklist: ' + err.message, 'error');
        }
    });
}

async function loadSavedChecklists() {
    const listDiv = document.getElementById('saved-checklists-list');
    if (!listDiv) return;
    try {
        const activePeriodTab = document.querySelector('.review-period-tabs .period-tab.active');
        const period = activePeriodTab?.dataset.period || 'weekly';
        const data = await apiGet(`/api/reviews/checklists?period=${period}`);
        const checklists = data.checklists || data || [];
        if (!checklists.length) {
            listDiv.innerHTML = '';
            return;
        }
        listDiv.innerHTML = `
            <div style="font-size:12px; color:var(--text-secondary); margin-top:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em;">Saved Checklists</div>
            ${checklists.slice(0, 5).map(c => {
            const total = Object.values(c.categories || {}).reduce((sum, items) => sum + items.length, 0);
            const done = (c.completed_items || []).length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
                        <span style="font-size:13px; color:var(--text-primary);">${c.period} — ${c.start_date || ''}</span>
                        <span style="font-size:12px; font-weight:600; color:${pct >= 80 ? 'var(--accent)' : pct >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)'}">${pct}% (${done}/${total})</span>
                    </div>
                `;
        }).join('')}
        `;
    } catch (e) { listDiv.innerHTML = ''; }
}

// Load saved checklists on review tab activation
try { loadSavedChecklists(); } catch (e) { }


// ─── Travel / Expenses ─────────────────────────────────────────

let currenciesLoaded = false;

async function initCurrencySelectors() {
    if (currenciesLoaded) return;
    try {
        const data = await apiGet('/api/travel/currencies');
        const currencies = data.currencies || [];
        const fromSel = document.getElementById('convert-from');
        const toSel = document.getElementById('convert-to');
        const expSel = document.getElementById('expense-currency');

        if (fromSel) currencies.forEach(c => fromSel.add(new Option(c, c)));
        if (toSel) currencies.forEach(c => toSel.add(new Option(c, c)));
        if (expSel) currencies.forEach(c => expSel.add(new Option(c, c)));

        // Defaults: VND → USD
        if (fromSel) fromSel.value = 'VND';
        if (toSel) toSel.value = 'USD';
        if (expSel) expSel.value = 'VND';
        currenciesLoaded = true;
    } catch (e) {
        console.log('Could not load currencies');
    }
}

async function runConversion() {
    const amountInput = document.getElementById('convert-amount');
    const fromInput = document.getElementById('convert-from');
    const toInput = document.getElementById('convert-to');
    const resultInput = document.getElementById('convert-result');
    const rateSpan = document.getElementById('convert-rate');

    if (!amountInput || !fromInput || !toInput || !resultInput || !rateSpan) return;

    const amount = parseFloat(amountInput.value);
    if (!amount || amount <= 0) {
        resultInput.value = '--';
        rateSpan.textContent = '';
        return;
    }
    const from = fromInput.value;
    const to = toInput.value;

    try {
        const data = await apiGet(`/api/travel/convert?amount=${amount}&from_curr=${from}&to_curr=${to}`);
        resultInput.value = data.to_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        rateSpan.textContent = `1 ${from} = ${data.rate} ${to}`;
    } catch (e) {
        resultInput.value = 'Error';
    }
}

const expenseForm = document.getElementById('expense-form');
if (expenseForm) {
    expenseForm.addEventListener('submit', async e => {
        e.preventDefault();
        const editId = document.getElementById('expense-edit-id')?.value;
        const data = {
            date: document.getElementById('expense-date')?.value,
            amount: parseFloat(document.getElementById('expense-amount')?.value),
            currency: document.getElementById('expense-currency')?.value,
            category: document.getElementById('expense-category')?.value,
            description: document.getElementById('expense-desc')?.value || null,
            trip: document.getElementById('expense-trip')?.value || null,
        };

        try {
            if (editId) {
                const result = await fetch(`${API}/api/travel/expenses/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }).then(res => res.json());
                const usdStr = result.amount_usd ? ` (~$${result.amount_usd})` : '';
                showToast(`✓ Expense updated${usdStr}`);
            } else {
                const result = await apiPost('/api/travel/expenses', data);
                const usdStr = result.amount_usd ? ` (~$${result.amount_usd})` : '';
                showToast(`✓ Expense saved${usdStr}`);
            }

            cancelExpenseEdit();
            expenseForm.reset();
            const expenseDate = document.getElementById('expense-date');
            if (expenseDate) expenseDate.value = today();
            const expenseCurrency = document.getElementById('expense-currency');
            if (currenciesLoaded && expenseCurrency) expenseCurrency.value = 'VND';
            loadExpenses();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    });
}

async function loadExpenses() {
    try {
        const data = await apiGet('/api/travel/expenses');
        const expenses = data.expenses || [];

        // Filter for current month's expenses
        const now = new Date();
        const currentMonthExpenses = expenses.filter(e => {
            if (!e.date) return false;
            const edate = new Date(e.date);
            return edate.getMonth() === now.getMonth() && edate.getFullYear() === now.getFullYear();
        });

        const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
        const summaryTitle = document.getElementById('expense-summary-title');
        if (summaryTitle) {
            summaryTitle.textContent = `Summary (${monthName})`;
        }

        // Spending summary (Guarded)
        const summaryDiv = document.getElementById('expense-summary');
        if (summaryDiv) {
            if (currentMonthExpenses.length === 0) {
                summaryDiv.innerHTML = '<div class="loading-text">No expenses logged this month</div>';
            } else {
                const total = currentMonthExpenses.reduce((sum, e) => sum + (e.amount_usd || 0), 0);
                const totalVnd = currentMonthExpenses.reduce((sum, e) => sum + (e.amount_vnd || 0), 0);
                const formatVnd = (v) => v >= 1000 ? `${Math.round(v / 1000)}K` : Math.round(v);

                // Recalculate categories for the month
                const cats = {};
                const catsVnd = {};
                currentMonthExpenses.forEach(e => {
                    const cat = e.category || 'other';
                    cats[cat] = (cats[cat] || 0) + (e.amount_usd || 0);
                    catsVnd[cat] = (catsVnd[cat] || 0) + (e.amount_vnd || 0);
                });

                summaryDiv.innerHTML = `
                    <div class="stat-row" style="margin-bottom: 8px;">
                        <span class="stat-label" style="font-weight: 600; color: var(--text-primary);">Total Monthly Spend</span>
                        <div style="text-align:right;">
                            <span class="stat-value" style="font-size: 16px; font-weight: 700; color: var(--accent-rose);">$${total.toFixed(2)}</span>
                            <div style="font-size:12px; color:var(--text-secondary);">${formatVnd(totalVnd)} VND</div>
                        </div>
                    </div>
                ` + Object.entries(cats)
                        .sort((a, b) => b[1] - a[1]) // Sort categories by amount
                        .map(([cat, amount]) => `
                        <div class="stat-row">
                            <span class="stat-label" style="text-transform: capitalize;">${cat}</span>
                            <div style="text-align:right;">
                                <span class="stat-value">$${amount.toFixed(2)}</span>
                                <div style="font-size:11px; color:var(--text-secondary);">${formatVnd(catsVnd[cat] || 0)} VND</div>
                            </div>
                        </div>
                    `).join('');
            }
        }

        // Recent expenses (Guarded)
        const historyDiv = document.getElementById('expense-history');
        if (historyDiv) {
            if (expenses.length === 0) {
                historyDiv.innerHTML = '<div class="loading-text">No expenses logged yet</div>';
            } else {
                historyDiv.innerHTML = expenses.slice(0, 20).map(e => {
                    const formatVnd = (v) => v >= 1000 ? `${Math.round(v / 1000)}K` : Math.round(v);
                    const vndDisplay = e.amount_vnd ? `<div class="item-meta">${formatVnd(e.amount_vnd)} VND</div>` : '';
                    return `
                    <div class="history-item" style="position:relative;" onmouseover="this.querySelector('.expense-edit-btn').style.opacity='1'" onmouseout="this.querySelector('.expense-edit-btn').style.opacity='0'">
                        <button class="expense-edit-btn" data-expense-id="${e.id}" title="Edit"
                            style="position:absolute; top:8px; right:8px; width:24px; height:24px; border-radius:4px; border:1px solid var(--border); background:var(--bg-card); color:var(--text-primary); font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s;">✏️</button>
                        <div class="history-item-left" style="padding-right: 32px;">
                            <strong>${e.description || 'Expense'}</strong>
                            <div class="item-meta">${e.date} · ${e.category}</div>
                        </div>
                        <div class="history-item-right">
                            <div class="history-amount">${e.amount} ${e.currency}</div>
                            ${e.amount_usd ? `<div class="item-meta">≈ $${e.amount_usd.toFixed(2)}</div>` : ''}
                            ${vndDisplay}
                        </div>
                    </div>
                `;
                }).join('');

                // Store data and add edit listeners
                window._expenseData = {};
                expenses.forEach(e => { window._expenseData[e.id] = e; });
                historyDiv.querySelectorAll('.expense-edit-btn').forEach(btn => {
                    btn.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        const expense = window._expenseData[btn.dataset.expenseId];
                        if (expense) openExpenseEdit(expense);
                    });
                });
            }
        }
    } catch (err) {
        const historyDiv = document.getElementById('expense-history');
        if (historyDiv) historyDiv.innerHTML =
            '<div class="loading-text">Could not load expenses</div>';
    }
}

// ─── Expense Edit Helpers ───────────────────────────────────────
function openExpenseEdit(e) {
    const editId = document.getElementById('expense-edit-id');
    if (editId) editId.value = e.id;
    const eDate = document.getElementById('expense-date');
    if (eDate) eDate.value = e.date || today();
    const eAmount = document.getElementById('expense-amount');
    if (eAmount) eAmount.value = e.amount || '';
    const eCurrency = document.getElementById('expense-currency');
    if (eCurrency) eCurrency.value = e.currency || 'USD';
    const eCat = document.getElementById('expense-category');
    if (eCat) eCat.value = e.category || 'food';
    const eDesc = document.getElementById('expense-desc');
    if (eDesc) eDesc.value = e.title?.replace(' Expense', '') || e.description || '';
    const eTrip = document.getElementById('expense-trip');
    if (eTrip) eTrip.value = e.trip || '';

    const btn = document.getElementById('expense-submit-btn');
    if (btn) btn.textContent = 'Update Expense 🔄';
    const cancelBtn = document.getElementById('expense-cancel-edit-btn');
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
    const delBtn = document.getElementById('expense-delete-btn');
    if (delBtn) delBtn.style.display = 'inline-flex';

    document.getElementById('page-expense')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelExpenseEdit() {
    const form = document.getElementById('expense-form');
    if (form) form.reset();
    const editId = document.getElementById('expense-edit-id');
    if (editId) editId.value = '';
    const eDate = document.getElementById('expense-date');
    if (eDate) eDate.value = today();
    const eCurrency = document.getElementById('expense-currency');
    if (currenciesLoaded && eCurrency) eCurrency.value = 'VND';

    const btn = document.getElementById('expense-submit-btn');
    if (btn) btn.textContent = 'Log Expense 💰';
    const cancelBtn = document.getElementById('expense-cancel-edit-btn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    const delBtn = document.getElementById('expense-delete-btn');
    if (delBtn) delBtn.style.display = 'none';
}

const expenseCancelBtn = document.getElementById('expense-cancel-edit-btn');
if (expenseCancelBtn) expenseCancelBtn.addEventListener('click', cancelExpenseEdit);

const expenseDeleteBtn = document.getElementById('expense-delete-btn');
if (expenseDeleteBtn) {
    expenseDeleteBtn.addEventListener('click', async () => {
        const editId = document.getElementById('expense-edit-id')?.value;
        if (!editId) return;
        if (confirm('Delete this expense?')) {
            try {
                await fetch(`${API}/api/travel/expenses/${editId}`, { method: 'DELETE' });
                showToast('✓ Expense deleted');
                cancelExpenseEdit();
                loadExpenses();
            } catch (err) {
                showToast('Error: ' + err.message, 'error');
            }
        }
    });
}


// ─── Work (Pomodoro) ───────────────────────────────────────────

const workForm = document.getElementById('work-form');
if (workForm) {
    workForm.addEventListener('submit', async e => {
        e.preventDefault();
        const editId = document.getElementById('work-edit-id')?.value;
        const data = {
            date: document.getElementById('work-date')?.value || today(),
            duration_minutes: parseInt(document.getElementById('work-duration')?.value) || 0,
            category: document.getElementById('work-category')?.value || 'coding',
            notes: document.getElementById('work-notes')?.value || null,
        };

        try {
            if (editId) {
                await fetch(`${API}/api/work/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                showToast('✓ Work session updated');
            } else {
                await apiPost('/api/work', data);
                showToast('✓ Work session logged');
            }

            cancelWorkEdit();
            loadWorkData();
            loadCalendar('work');
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    });
}

async function loadWorkData() {
    try {
        const data = await apiGet('/api/work?limit=50');
        const container = document.getElementById('work-history');
        if (!container) return;

        const todayStr = today();
        let todayMins = 0;
        const catCounts = {};

        if (data && data.length) {
            // History UI
            container.innerHTML = data.slice(0, 15).map(w => {
                if (w.date === todayStr) {
                    todayMins += (w.duration_minutes || 0);
                }
                const c = w.category || 'others';
                catCounts[c] = (catCounts[c] || 0) + (w.duration_minutes || 0);

                let hrStr = '';
                let pomoCount = Math.floor((w.duration_minutes || 0) / 25);
                let pomoStr = pomoCount > 0 ? `<div style="font-size: 11px; color: #8b5cf6; margin-top: 2px;">🍅 x ${pomoCount}</div>` : '';

                if (w.duration_minutes >= 60) {
                    hrStr = `${Math.floor(w.duration_minutes / 60)}h ${w.duration_minutes % 60}m`;
                } else {
                    hrStr = `${w.duration_minutes}m`;
                }

                return `
                    <div class="history-item" style="position:relative;" onmouseover="this.querySelector('.work-edit-btn').style.opacity='1'" onmouseout="this.querySelector('.work-edit-btn').style.opacity='0'">
                        <button class="work-edit-btn" data-work-id="${w.id}" title="Edit"
                            style="position:absolute; top:8px; right:8px; width:24px; height:24px; border-radius:4px; border:1px solid var(--border); background:var(--bg-card); color:var(--text-primary); font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s;">✏️</button>
                        <div class="history-item-left">
                            <strong>${(w.category || 'Work').toUpperCase()}</strong>
                            <div class="item-meta">${w.date} · ${w.notes || ''}</div>
                        </div>
                        <div class="history-item-right" style="padding-right: 32px; text-align: right;">
                            <div class="history-amount">${hrStr}</div>
                            ${pomoStr}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<div class="loading-text">No work sessions yet!</div>';
        }

        // Today UI
        const todayHrs = Math.floor(todayMins / 60);
        const todayRemMins = todayMins % 60;
        const workTodayTotal = document.getElementById('work-today-total');

        let totalPomoCount = Math.floor(todayMins / 25);
        let totalPomoStr = totalPomoCount > 0 ? `<div style="font-size: 13px; color: #8b5cf6; margin-top: 4px; font-weight: 600;">🍅 x ${totalPomoCount} Pomodoros</div>` : '';

        if (workTodayTotal) {
            workTodayTotal.innerHTML = `${todayHrs}h ${todayRemMins}m ${totalPomoStr}`;
        }

        const topCat = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a])[0];
        const workTodayTop = document.getElementById('work-today-top');
        if (workTodayTop) workTodayTop.textContent = topCat ? topCat.toUpperCase() : '--';

        // Store data and add edit listeners
        window._workData = {};
        data.forEach(w => { window._workData[w.id] = w; });
        container.querySelectorAll('.work-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const w = window._workData[btn.dataset.workId];
                if (w) openWorkEdit(w);
            });
        });

    } catch (err) {
        const container = document.getElementById('work-history');
        if (container) container.innerHTML = '<div class="loading-text">Could not load work history</div>';
    }
}

// ─── Work Edit Helpers ─────────────────────────────────────────
function openWorkEdit(w) {
    const editId = document.getElementById('work-edit-id');
    if (editId) editId.value = w.id;
    const workDate = document.getElementById('work-date');
    if (workDate) workDate.value = w.date || today();
    const workDuration = document.getElementById('work-duration');
    if (workDuration) workDuration.value = w.duration_minutes || '';
    const workCat = document.getElementById('work-category');
    if (workCat) workCat.value = w.category || 'coding';
    const workNotes = document.getElementById('work-notes');
    if (workNotes) workNotes.value = w.notes || '';

    const btn = document.getElementById('work-submit-btn');
    if (btn) btn.textContent = 'Update Session 🔄';
    const cancelBtn = document.getElementById('work-cancel-edit-btn');
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
    const delBtn = document.getElementById('work-delete-btn');
    if (delBtn) delBtn.style.display = 'inline-flex';

    document.getElementById('page-work')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelWorkEdit() {
    const form = document.getElementById('work-form');
    if (form) form.reset();
    const editId = document.getElementById('work-edit-id');
    if (editId) editId.value = '';
    const workDate = document.getElementById('work-date');
    if (workDate) workDate.value = today();

    const btn = document.getElementById('work-submit-btn');
    if (btn) btn.textContent = 'Log Session 💻';
    const cancelBtn = document.getElementById('work-cancel-edit-btn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    const delBtn = document.getElementById('work-delete-btn');
    if (delBtn) delBtn.style.display = 'none';
}

const workCancelBtn = document.getElementById('work-cancel-edit-btn');
if (workCancelBtn) workCancelBtn.addEventListener('click', cancelWorkEdit);

const workDeleteBtn = document.getElementById('work-delete-btn');
if (workDeleteBtn) {
    workDeleteBtn.addEventListener('click', async () => {
        const editId = document.getElementById('work-edit-id')?.value;
        if (!editId) return;
        if (confirm('Delete this work session?')) {
            try {
                await fetch(`${API}/api/work/${editId}`, { method: 'DELETE' });
                showToast('✓ Session deleted');
                cancelWorkEdit();
                loadWorkData();
                loadCalendar('work');
            } catch (err) {
                showToast('Error: ' + err.message, 'error');
            }
        }
    });
}

const btnWorkInsights = document.getElementById('btn-work-insights');
if (btnWorkInsights) {
    btnWorkInsights.addEventListener('click', async () => {
        const contentDiv = document.getElementById('work-insights-content');
        if (!contentDiv) return;

        btnWorkInsights.textContent = 'Generating... ⏳';
        btnWorkInsights.disabled = true;
        contentDiv.style.display = 'none';

        try {
            const data = await apiGet('/api/work/insights');
            contentDiv.innerHTML = data.insight ? data.insight.replace(/\n/g, '<br>') : 'No insights generated.';
            contentDiv.style.display = 'block';
        } catch (err) {
            showToast('Failed to fetch insights', 'error');
            console.error(err);
        } finally {
            btnWorkInsights.textContent = 'Generate Insights ✨';
            btnWorkInsights.disabled = false;
        }
    });
}


// ─── Social ────────────────────────────────────────────────────

const SOCIAL_EMOJIS = {
    friend: '👫',
    acquaintance: '👋',
    professional: '💼',
    colleague: '🏢',
    family: '👨‍👩‍👧',
    social_event: '🎉',
    travel_buddy: '✈️',
    mentor: '🎓',
    other: '👤'
};

// Helper to get string value from an element
function getStringValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : null;
}

// Helper to get number value from an element
function getNumberValue(id) {
    const el = document.getElementById(id);
    return el ? parseFloat(el.value) : 0;
}

const socialForm = document.getElementById('social-form');
if (socialForm) {
    socialForm.addEventListener('submit', async e => {
        e.preventDefault();
        const editId = document.getElementById('social-edit-id')?.value;
        const data = {
            name: getStringValue('social-name'),
            category: getStringValue('social-category'),
            context: getStringValue('social-context'),
            location: getStringValue('social-location'),
            date: getStringValue('social-date') || new Date().toISOString().split('T')[0],
            notes: getStringValue('social-notes'),
            follow_up: getStringValue('social-follow-up')
        };

        const duration = getNumberValue('social-duration');
        if (duration > 0) {
            data.duration_minutes = duration;
        }

        try {
            if (editId) {
                await fetch(`${API}/api/social/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                showToast('✓ Connection updated');
            } else {
                await apiPost('/api/social', data);
                showToast('✓ Connection saved');
            }

            cancelSocialEdit();
            loadSocialData();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    });
}

// Event listener for social category change to show/hide duration
document.getElementById('social-category')?.addEventListener('change', (e) => {
    const category = e.target.value;
    const durationField = document.getElementById('social-duration-field');
    if (durationField) {
        // Show duration for 'social_event' and 'travel_buddy'
        if (category === 'social_event' || category === 'travel_buddy') {
            durationField.style.display = 'block';
        } else {
            durationField.style.display = 'none';
            document.getElementById('social-duration').value = ''; // Clear value if hidden
        }
    }
});


async function loadSocialData() {
    try {
        const stats = await apiGet('/api/social/stats');
        const connections = stats.connections || [];

        // Social stats (Guarded)
        const statsDiv = document.getElementById('social-stats');
        if (statsDiv) {
            if (stats.total_interactions === 0) {
                statsDiv.innerHTML = '<div class="loading-text">Log your first connection to see stats</div>';
            } else {
                const cats = stats.by_category || {};
                const catIcons = { friend: '👫', acquaintance: '👋', professional: '💼', colleague: '🏢', family: '👨‍👩‍👧', social_event: '🎉', travel_buddy: '✈️', mentor: '🎓' };
                statsDiv.innerHTML = `
                    <div class="stat-row">
                        <span class="stat-label">Total interactions</span>
                        <span class="stat-value">${stats.total_interactions}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Unique people</span>
                        <span class="stat-value">${stats.unique_people}</span>
                    </div>
                    ${Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([cat, count]) => `
                        <div class="stat-row">
                            <span class="stat-label">${catIcons[cat] || '👤'} ${cat.replace('_', ' ')}</span>
                            <span class="stat-value">${count}</span>
                        </div>
                    `).join('')}
                `;
            }
        }

        // Recent connections
        const historyDiv = document.getElementById('social-history');
        if (historyDiv) {
            if (connections.length === 0) {
                historyDiv.innerHTML = '<div class="loading-text">No connections logged yet</div>';
            } else {
                historyDiv.innerHTML = connections.slice(0, 20).map(c => {
                    const emoji = SOCIAL_EMOJIS[c.category] || SOCIAL_EMOJIS['friend'];
                    const durText = c.duration_minutes ? `&bull; ${c.duration_minutes}m` : '';
                    return `
                    <div class="history-item" style="position:relative;" onmouseover="this.querySelector('.social-edit-btn').style.opacity='1'" onmouseout="this.querySelector('.social-edit-btn').style.opacity='0'">
                        <button class="social-edit-btn" data-social-id="${c.id}" title="Edit"
                            style="position:absolute; top:8px; right:8px; width:24px; height:24px; border-radius:4px; border:1px solid var(--border); background:var(--bg-card); color:var(--text-primary); font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s;">✏️</button>
                        <div class="history-item-left" style="padding-right: 32px;">
                            <strong>${emoji} ${c.name}</strong>
                            <div class="item-meta">
                                ${c.category.replace('_', ' ')} &bull; ${formatDateDisplay(c.date)} ${durText}
                            </div>
                            ${c.follow_up ? `<div class="item-meta" style="margin-top:4px;color:var(--text-primary)">↳ ${c.follow_up}</div>` : ''}
                        </div>
                    </div>
                `;
                }).join('');

                // Store data and add edit listeners
                window._socialData = {};
                connections.forEach(c => { window._socialData[c.id] = c; });
                historyDiv.querySelectorAll('.social-edit-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const c = window._socialData[btn.dataset.socialId];
                        if (c) openSocialEdit(c);
                    });
                });
            }
        }
    } catch (err) {
        const historyDiv = document.getElementById('social-history');
        if (historyDiv) historyDiv.innerHTML = '<div class="loading-text">Could not load social data</div>';
    }
}

// ─── Social Edit Helpers ───────────────────────────────────────
function openSocialEdit(c) {
    const editId = document.getElementById('social-edit-id');
    if (editId) editId.value = c.id;
    const sDate = document.getElementById('social-date');
    if (sDate) sDate.value = c.date || today();
    const sName = document.getElementById('social-name');
    if (sName) sName.value = c.name || '';
    const sCat = document.getElementById('social-category');
    if (sCat) sCat.value = c.category || 'friend';
    const sContext = document.getElementById('social-context');
    if (sContext) sContext.value = c.context || '';
    const sLocation = document.getElementById('social-location');
    if (sLocation) sLocation.value = c.location || '';
    const sNotes = document.getElementById('social-notes');
    if (sNotes) sNotes.value = c.notes || '';
    const sFollowup = document.getElementById('social-followup');
    if (sFollowup) sFollowup.value = c.follow_up || '';
    if (c.follow_up) document.getElementById('social-follow-up').value = c.follow_up;
    if (c.duration_minutes) document.getElementById('social-duration').value = c.duration_minutes;

    // Trigger category change to show/hide duration
    document.getElementById('social-category').dispatchEvent(new Event('change'));

    const btn = document.getElementById('social-submit-btn');
    if (btn) btn.textContent = 'Update Connection 🔄';
    const cancelBtn = document.getElementById('social-cancel-edit-btn');
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
    const delBtn = document.getElementById('social-delete-btn');
    if (delBtn) delBtn.style.display = 'inline-flex';

    document.getElementById('page-social')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelSocialEdit() {
    const form = document.getElementById('social-form');
    if (form) form.reset();
    const editId = document.getElementById('social-edit-id');
    if (editId) editId.value = '';
    const sDate = document.getElementById('social-date');
    if (sDate) sDate.value = today();

    const btn = document.getElementById('social-submit-btn');
    if (btn) btn.textContent = 'Log Connection 🤝';
    const cancelBtn = document.getElementById('social-cancel-edit-btn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    const delBtn = document.getElementById('social-delete-btn');
    if (delBtn) delBtn.style.display = 'none';

    // Hide duration by default
    document.getElementById('social-duration').value = '';
    const catSelect = document.getElementById('social-category');
    if (catSelect) {
        catSelect.value = 'friend';
        catSelect.dispatchEvent(new Event('change'));
    }
}

const socialCancelBtn = document.getElementById('social-cancel-edit-btn');
if (socialCancelBtn) socialCancelBtn.addEventListener('click', cancelSocialEdit);

const socialDeleteBtn = document.getElementById('social-delete-btn');
if (socialDeleteBtn) {
    socialDeleteBtn.addEventListener('click', async () => {
        const editId = document.getElementById('social-edit-id')?.value;
        if (!editId) return;
        if (confirm('Delete this connection?')) {
            try {
                await fetch(`${API}/api/social/${editId}`, { method: 'DELETE' });
                showToast('✓ Connection deleted');
                cancelSocialEdit();
                loadSocialData();
            } catch (err) {
                showToast('Error: ' + err.message, 'error');
            }
        }
    });
}


// ─── AI Summary ────────────────────────────────────────────────

document.getElementById('generate-summary-btn')?.addEventListener('click', async () => {
    const days = document.getElementById('summary-days').value;
    const type = document.getElementById('summary-type').value;
    const container = document.getElementById('summary-content');
    const btn = document.getElementById('generate-summary-btn');

    btn.disabled = true;
    btn.textContent = 'Generating...';
    container.innerHTML = '<div class="loading-text"><div class="spinner"></div> Analyzing your data and generating AI summary...</div>';

    try {
        const result = await apiGet(`/api/summary?days=${days}&type=${type}`);

        if (result.error) {
            container.innerHTML = `<div class="loading-text" style="color: var(--accent-rose);">${result.summary}</div>`;
        } else {
            // Convert basic markdown to HTML
            let html = result.summary || 'No summary available.';
            html = html
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/^### (.*$)/gm, '<h4 style="margin-top:16px;color:var(--text-primary)">$1</h4>')
                .replace(/^## (.*$)/gm, '<h3 style="margin-top:16px;color:var(--text-primary)">$1</h3>')
                .replace(/^# (.*$)/gm, '<h3 style="margin-top:16px;color:var(--text-primary)">$1</h3>')
                .replace(/^- (.*$)/gm, '<li style="margin-left:16px;margin-bottom:4px">$1</li>')
                .replace(/^(\d+)\. (.*$)/gm, '<li style="margin-left:16px;margin-bottom:4px">$2</li>')
                .replace(/\n{2,}/g, '<br><br>')
                .replace(/\n/g, '<br>');

            const meta = result.metadata || {};
            const metaParts = [];
            if (meta.journal_count !== undefined) metaParts.push(`📝 ${meta.journal_count} journal entries`);
            if (meta.checkin_count !== undefined) metaParts.push(`✓ ${meta.checkin_count} check-ins`);
            if (meta.run_count !== undefined) metaParts.push(`🏃 ${meta.run_count} runs`);
            if (meta.total_km !== undefined) metaParts.push(`${meta.total_km} km`);
            if (meta.book_count !== undefined) metaParts.push(`📚 ${meta.book_count} books`);

            container.innerHTML = `
                <div style="font-size: 14px; line-height: 1.7; color: var(--text-secondary);">
                    ${html}
                </div>
                ${metaParts.length ? `
                    <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border); display: flex; gap: 12px; flex-wrap: wrap; font-size: 11px; color: var(--text-muted);">
                        ${metaParts.join(' · ')}
                        <span>· ${meta.start_date} to ${meta.end_date}</span>
                    </div>
                ` : ''
                }
        `;
        }
    } catch (err) {
        container.innerHTML = `<div class="loading-text" style="color: var(--accent-rose);">Could not generate summary. Ensure GOOGLE_API_KEY is configured.</div>`;
    }

    btn.disabled = false;
    btn.textContent = 'Summarize ✨';
});


// ─── Voice Journaling (Speech-to-Text) ─────────────────────────

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isRecording = false;
let recordingStartTime = null;
let recordingTimerInterval = null;
let interimText = '';          // Text currently being spoken (not yet finalized)
let baseTextBeforeRecording = ''; // Snapshot of textarea when recording started

const voiceBtn = document.getElementById('voice-journal-btn');

// Create recording status bar (inserted above textarea dynamically)
function createRecordingStatusBar() {
    let bar = document.getElementById('voice-status-bar');
    if (bar) return bar;
    bar = document.createElement('div');
    bar.id = 'voice-status-bar';
    bar.className = 'voice-status-bar';
    bar.style.display = 'none';
    bar.innerHTML = `
            < div class="voice-status-left" >
            <span class="voice-pulse-dot"></span>
            <span id="voice-status-text">Listening...</span>
        </div >
            <span id="voice-timer" class="voice-timer">0:00</span>
        `;
    // Insert before the textarea
    const textarea = document.getElementById('journal-content');
    textarea.parentNode.insertBefore(bar, textarea);
    return bar;
}

// Create AI polish button (shown after recording stops)
function createPolishButton() {
    let btn = document.getElementById('ai-polish-btn');
    if (btn) return btn;
    btn = document.createElement('button');
    btn.id = 'ai-polish-btn';
    btn.type = 'button';
    btn.className = 'btn btn-secondary ai-polish-btn';
    btn.style.display = 'none';
    btn.innerHTML = '✨ AI Polish';
    btn.title = 'Clean up grammar, remove filler words (um, uh), fix punctuation';
    // Insert after word count
    const wc = document.getElementById('journal-wc');
    wc.parentNode.insertBefore(btn, wc.nextSibling);

    btn.addEventListener('click', async () => {
        const textarea = document.getElementById('journal-content');
        const text = textarea.value.trim();
        if (!text || text.length < 10) {
            showToast('Need more text to polish', 'error');
            return;
        }
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Polishing...';

        try {
            const formData = new FormData();
            // We'll use the transcribe endpoint with a tiny audio placeholder
            // Actually, let's call a simpler approach — send text to Gemini via existing chat
            const response = await apiPost('/api/chat', {
                message: `Please clean up the following journal entry text: fix grammar, remove filler words(um, uh, like), add proper punctuation and paragraph breaks.Keep the original meaning and tone.Return ONLY the cleaned text, nothing else.\n\nText: \n${text} `,
                agent: 'editor'
            });
            if (response.response) {
                textarea.value = response.response;
                const wc2 = textarea.value.trim().split(/\s+/).filter(w => w).length;
                document.getElementById('journal-wc').textContent = `${wc2} words`;
                showToast('✨ Text polished by AI');
            }
        } catch (err) {
            showToast('Could not polish text: ' + err.message, 'error');
        }
        btn.disabled = false;
        btn.innerHTML = '✨ AI Polish';
    });

    return btn;
}

if (SpeechRecognition && voiceBtn) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        const textarea = document.getElementById('journal-content');
        let finalTranscript = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                currentInterim += transcript;
            }
        }

        // Append finalized text
        if (finalTranscript) {
            baseTextBeforeRecording += (baseTextBeforeRecording && !baseTextBeforeRecording.endsWith(' ') ? ' ' : '') + finalTranscript.trim() + ' ';
        }

        // Show interim (in-progress) text in a lighter style
        interimText = currentInterim;
        textarea.value = baseTextBeforeRecording + (interimText ? interimText : '');

        // Update word count
        const wc = textarea.value.trim().split(/\s+/).filter(w => w).length;
        document.getElementById('journal-wc').textContent = `${wc} words`;

        // Update status text with interim preview
        const statusText = document.getElementById('voice-status-text');
        if (statusText) {
            statusText.textContent = interimText ? `"${interimText.slice(0, 50)}${interimText.length > 50 ? '...' : ''}"` : 'Listening...';
        }

        // Auto-scroll textarea to bottom
        textarea.scrollTop = textarea.scrollHeight;
    };

    recognition.onerror = (event) => {
        console.log('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
            showToast('Microphone access denied. Please allow mic permission.', 'error');
        } else if (event.error === 'no-speech') {
            // Don't stop on no-speech, just show hint
            const statusText = document.getElementById('voice-status-text');
            if (statusText) statusText.textContent = 'No speech detected — try speaking...';
            return; // Don't stop recording
        }
        stopRecording();
    };

    recognition.onend = () => {
        if (isRecording) {
            try { recognition.start(); } catch (e) { stopRecording(); }
        }
    };

    voiceBtn.addEventListener('click', () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    });
} else if (voiceBtn) {
    // If SpeechRecognition is completely unavailable
    voiceBtn.addEventListener('click', () => {
        showToast('Speech recognition is not supported in this browser (try Chrome/Safari or check microphone permissions)', 'error');
    });
    voiceBtn.style.opacity = '0.4';
    voiceBtn.style.cursor = 'not-allowed';
    voiceBtn.title = 'Speech recognition not supported in this browser';
}

function startRecording() {
    if (!recognition) {
        showToast('Speech recognition not initialized.', 'error');
        return;
    }
    isRecording = true;
    interimText = '';
    baseTextBeforeRecording = document.getElementById('journal-content').value;

    try {
        recognition.start();
    } catch (err) {
        showToast('Could not start microphone: ' + err.message, 'error');
        isRecording = false;
        return;
    }

    // Update button
    voiceBtn.textContent = '⏹';
    voiceBtn.style.background = 'var(--accent-rose)';
    voiceBtn.style.borderColor = 'var(--accent-rose)';
    voiceBtn.style.color = '#fff';
    voiceBtn.style.animation = 'pulse-recording 1.5s infinite';
    voiceBtn.title = 'Click to stop recording';

    // Show status bar
    const bar = createRecordingStatusBar();
    bar.style.display = 'flex';
    const statusText = document.getElementById('voice-status-text');
    if (statusText) statusText.textContent = 'Listening...';

    // Start timer
    recordingStartTime = Date.now();
    const timerEl = document.getElementById('voice-timer');
    recordingTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        if (timerEl) timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')} `;
    }, 1000);

    showToast('🎤 Listening... Speak now');
}

function stopRecording() {
    if (!recognition) return;
    isRecording = false;
    interimText = '';
    try { recognition.stop(); } catch (e) { }

    // Reset button
    voiceBtn.textContent = '🎤';
    voiceBtn.style.background = 'none';
    voiceBtn.style.borderColor = 'var(--accent-teal)';
    voiceBtn.style.color = '';
    voiceBtn.style.animation = '';
    voiceBtn.title = 'Voice journaling — click to speak';

    // Hide status bar
    const bar = document.getElementById('voice-status-bar');
    if (bar) bar.style.display = 'none';

    // Stop timer
    if (recordingTimerInterval) {
        clearInterval(recordingTimerInterval);
        recordingTimerInterval = null;
    }

    // Calculate recording duration
    const elapsed = recordingStartTime ? Math.floor((Date.now() - recordingStartTime) / 1000) : 0;
    recordingStartTime = null;

    // Show AI polish button if there's text
    const textarea = document.getElementById('journal-content');
    const polishBtn = createPolishButton();
    if (textarea.value.trim().length > 20) {
        polishBtn.style.display = 'inline-flex';
        showToast(`Recording stopped(${elapsed}s) — click ✨ AI Polish to clean up`);
    } else {
        polishBtn.style.display = 'none';
        showToast('Recording stopped');
    }
}


// ─── Text-to-Speech (Read Prompts Aloud) ───────────────────────

document.getElementById('speak-prompt-btn')?.addEventListener('click', () => {
    const promptArea = document.getElementById('journal-prompt-area');
    const promptText = promptArea?.querySelector('.prompt-text');
    if (!promptText) {
        showToast('No prompt to read aloud', 'error');
        return;
    }

    const text = promptText.textContent.replace(/^"|"$/g, '').trim();
    if (!text) return;

    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        showToast('Stopped reading');
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Natural'));
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => {
        document.getElementById('speak-prompt-btn').textContent = '🔊';
    };

    document.getElementById('speak-prompt-btn').textContent = '⏸';
    document.getElementById('speak-prompt-btn').textContent = '⏸';
    window.speechSynthesis.speak(utterance);
    showToast('🔊 Reading prompt aloud...');
});


// ─── Phase 2: Activity Planner ──────────────────────────────────────

let workTasks = [];
let todayDate = new Date().toISOString().split('T')[0];

let pomoInterval = null;
let pomoTimeRemaining = 25 * 60; // 25 mins
let pomoActiveTaskId = null;
let isPomoRunning = false;

function setupActivityPlannerListeners() {
    // Set date label
    const dateLabel = document.getElementById('planner-date-label');
    if (dateLabel) {
        dateLabel.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }

    // Add Task Form
    const addForm = document.getElementById('add-task-form');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = addForm.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Adding...';

            const newTask = {
                name: document.getElementById('task-name').value,
                time_slot: document.getElementById('task-time-slot').value,
                category: document.getElementById('task-category').value,
                date: todayDate,
                completed: false,
                order: workTasks.length
            };

            try {
                const res = await apiPost('/api/work/tasks', newTask);
                newTask.id = res.id;
                workTasks.push(newTask);

                // Clear inputs
                document.getElementById('task-name').value = '';
                document.getElementById('task-time-slot').value = '';

                renderWorkTasks();
                showToast(res.message);
            } catch (err) {
                console.error(err);
                showToast('Failed to add task', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = '+ Add';
            }
        });
    }

    // Pomo Controls
    document.getElementById('pomo-start-btn')?.addEventListener('click', togglePomodoro);
    document.getElementById('pomo-pause-btn')?.addEventListener('click', togglePomodoro);
    document.getElementById('pomo-reset-btn')?.addEventListener('click', () => resetPomodoro(pomoActiveTaskId));
}

async function loadWorkTasks() {
    const listDiv = document.getElementById('task-list');
    if (!listDiv) return;

    try {
        const tasks = await apiGet(`/api/work/tasks?date_str=${todayDate}`);
        workTasks = tasks || [];
        renderWorkTasks();
    } catch (err) {
        console.error("Failed to load work tasks:", err);
        listDiv.innerHTML = '<div class="loading-text" style="color:red">Failed to load tasks</div>';
    }
}

// Make sure these get called when opening Work tab
document.querySelector('.nav-item[onclick="switchTab(\'work\')"]')?.addEventListener('click', () => {
    loadWorkTasks();
    setupActivityPlannerListeners();
});
// Also run on init in case Work is default
document.addEventListener('DOMContentLoaded', () => {
    setupActivityPlannerListeners();
    loadWorkTasks();
});


function renderWorkTasks() {
    const listDiv = document.getElementById('task-list');
    if (!listDiv) return;

    if (workTasks.length === 0) {
        listDiv.innerHTML = '<div class="loading-text" style="font-size: 13px;">No tasks yet — add one above!</div>';
        renderDailySummary();
        return;
    }

    // Sort by order roughly
    workTasks.sort((a, b) => a.order - b.order);

    listDiv.innerHTML = '';
    workTasks.forEach(task => {
        const catClass = `cat-${task.category}`;
        const item = document.createElement('div');
        item.className = `tiimo-task-item ${task.completed ? 'completed' : ''}`;

        // Emoticon via category mapping reused roughly
        let emoji = '📦';
        if (task.category === 'school') emoji = '🎓';
        if (task.category === 'dsa') emoji = '💻';
        if (task.category === 'courses') emoji = '📚';
        if (task.category === 'job') emoji = '💼';

        // Ensure no stray dots are rendered if no time slot is provided, but keep layout spacing
        let timeLabelHtml = `
            <div class="tiimo-task-time-col">
                ${task.time_slot ? `<div class="tiimo-task-time-label">${task.time_slot}</div><div class="tiimo-task-time-dot"></div>` : ''}
            </div>
        `;

        // Added numeric input for logging Pomodoros explicitly
        let actionButtons = '';
        if (task.completed) {
            actionButtons = `<span style="font-size: 11px; color: #10b981; font-weight: 600;">✓ Completed</span>`;
        } else {
            actionButtons = `
                <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:11px; color:var(--text-secondary); font-weight:600;">🍅</span>
                        <input type="number" id="pomo-input-${task.id}" min="1" max="20" placeholder="1" style="width:40px; height:24px; padding:0 4px; font-size:12px; border-radius:4px; border:1px solid #d1d5db; text-align:center;">
                        <button class="btn btn-primary" style="padding: 4px 10px; font-size: 11px; height: auto;" onclick="markTaskDone('${task.id}')">Mark as Done</button>
                    </div>
                    <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px; height: auto; width:100%;" onclick="openPomodoro('${task.id}')">▶ Focus Timer</button>
                </div>
            `;
        }

        item.innerHTML = `
            <div class="tiimo-task-row">
                ${timeLabelHtml}
                <div class="tiimo-task-card">
                    <div class="tiimo-task-left-bar ${catClass}"></div>
                    
                    <div class="tiimo-task-content">
                        <div class="tiimo-checkbox ${task.completed ? 'checked' : ''}"></div>
                        <div class="tiimo-task-text-group">
                            <div class="tiimo-task-title">${task.name}</div>
                            <div class="tiimo-task-meta">
                                <span style="text-transform: capitalize;">${task.category}</span>
                            </div>
                        </div>
                    </div>

                    <div class="tiimo-task-actions">
                        ${actionButtons}
                    </div>
                </div>
            </div>
        `;
        listDiv.appendChild(item);
    });

    renderDailySummary();
}

// Make accessible to onclick
window.markTaskDone = async function (taskId) {
    const task = workTasks.find(t => t.id === taskId);
    if (!task) return;

    // Grab custom Pomodoro count
    const pomoInput = document.getElementById(`pomo-input-${taskId}`);
    let pomoCount = 1; // Default
    if (pomoInput && pomoInput.value) {
        pomoCount = parseInt(pomoInput.value, 10);
        if (isNaN(pomoCount) || pomoCount < 1) pomoCount = 1;
    }

    // Optistic UI
    task.completed = true;
    renderWorkTasks();

    try {
        await apiPut(`/api/work/tasks/${taskId}`, { completed: true });

        // Auto-log to Work History
        const durationToLog = pomoCount * 25;
        const sessionData = {
            duration_minutes: durationToLog,
            category: task.category,
            date: task.date, // defaults to today
            notes: `Completed task: ${task.name} (${pomoCount} pomodoros)`
        };

        await apiPost('/api/work', sessionData);
        showToast(`Task marked done & logged (${durationToLog}m)`);

        // If the work tab has calendar/stats loaded, we should refresh them
        if (typeof loadWorkData === 'function') {
            loadWorkData();
        }
        if (typeof loadCalendar === 'function') {
            loadCalendar('work');
        }

    } catch (err) {
        console.error(err);
        task.completed = false; // revert
        renderWorkTasks();
        showToast('Failed to update task', 'error');
    }
};

window.openPomodoro = function (taskId) {
    const task = workTasks.find(t => t.id === taskId);
    if (!task) return;

    pomoActiveTaskId = taskId;
    resetPomodoro(); // Reset timer if switching tasks

    const container = document.getElementById('pomodoro-container');
    const label = document.getElementById('pomodoro-task-label');

    label.textContent = `🍅 Focusing on: ${task.name}`;
    container.style.display = 'block';

    // Scroll to timer
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
};


function renderDailySummary() {
    const summaryDiv = document.getElementById('daily-summary-bars');
    if (!summaryDiv) return;

    if (workTasks.length === 0) {
        summaryDiv.innerHTML = '<div class="loading-text" style="font-size: 12px;">Complete tasks to see your summary</div>';
        return;
    }

    const counts = {};
    let totalCompleted = 0;

    workTasks.forEach(t => {
        if (t.completed) {
            counts[t.category] = (counts[t.category] || 0) + 1;
            totalCompleted++;
        }
    });

    if (totalCompleted === 0) {
        summaryDiv.innerHTML = '<div class="loading-text" style="font-size: 12px;">0 tasks completed. Let\'s get to work!</div>';
        return;
    }

    summaryDiv.innerHTML = '';

    // Display each category that has completions
    Object.keys(counts).forEach(cat => {
        const count = counts[cat];
        const pct = Math.round((count / totalCompleted) * 100);

        let emoji = '📦';
        if (cat === 'school') emoji = '🎓';
        if (cat === 'dsa') emoji = '💻';
        if (cat === 'courses') emoji = '📚';
        if (cat === 'job') emoji = '💼';

        const barHtml = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                <span style="font-size: 12px; font-weight: 500; text-transform: capitalize; color: var(--text-primary);">${emoji} ${cat}</span>
                <span style="font-size: 11px; color: var(--text-secondary);">${count} tasks (${pct}%)</span>
            </div>
            <div class="progress-bar-wrap">
                <div class="progress-bar cat-${cat}" style="width: ${pct}%"></div>
            </div>
        `;

        const wrap = document.createElement('div');
        wrap.style.marginBottom = '6px';
        wrap.innerHTML = barHtml;
        summaryDiv.appendChild(wrap);
    });
}

// ─── Pomodoro Logic ──────────────────────────────────────────────────

function updatePomodoroDisplay() {
    const display = document.getElementById('pomodoro-display');
    const mins = Math.floor(pomoTimeRemaining / 60);
    const secs = pomoTimeRemaining % 60;
    display.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function togglePomodoro() {
    const startBtn = document.getElementById('pomo-start-btn');
    const pauseBtn = document.getElementById('pomo-pause-btn');

    if (isPomoRunning) {
        // Pause
        clearInterval(pomoInterval);
        isPomoRunning = false;
        startBtn.style.display = 'block';
        pauseBtn.style.display = 'none';
        startBtn.innerHTML = '▶ Resume';
    } else {
        // Start
        isPomoRunning = true;
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'block';

        pomoInterval = setInterval(() => {
            pomoTimeRemaining--;
            updatePomodoroDisplay();

            if (pomoTimeRemaining <= 0) {
                clearInterval(pomoInterval);
                isPomoRunning = false;
                startBtn.style.display = 'block';
                pauseBtn.style.display = 'none';
                startBtn.innerHTML = '▶ Start';
                showToast("Pomodoro finished! Take a break.");
                playChime();

                // Prompt to mark task complete
                if (pomoActiveTaskId) {
                    const t = workTasks.find(x => x.id === pomoActiveTaskId);
                    if (t && !t.completed) {
                        if (confirm(`Pomodoro done! Mark "${t.name}" as complete?`)) {
                            // If they confirm, automatically trigger the done flow
                            window.markTaskDone(t.id);
                        }
                    }
                }
            }
        }, 1000);
    }
}

function resetPomodoro() {
    clearInterval(pomoInterval);
    isPomoRunning = false;
    pomoTimeRemaining = 25 * 60;
    updatePomodoroDisplay();

    const startBtn = document.getElementById('pomo-start-btn');
    const pauseBtn = document.getElementById('pomo-pause-btn');
    startBtn.style.display = 'block';
    startBtn.innerHTML = '▶ Start';
    pauseBtn.style.display = 'none';
}

function playChime() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.5);
    } catch (e) {
        console.log("Audio not supported or blocked");
    }
}

// Pre-load voices
if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}
