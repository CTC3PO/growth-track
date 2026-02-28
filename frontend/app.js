/**
 * Mindful Life AI — Frontend Application
 * POC: Tracker forms + AI-powered journaling prompts + review dashboard
 */

const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8080' : '';

// ─── Navigation ────────────────────────────────────────────────

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const pageEl = document.getElementById(`page-${page}`);
        if (pageEl) pageEl.classList.add('active');

        // Load data for each page on switch
        if (page === 'review') loadReviewData();
        if (page === 'reading') { loadReadingStats(); loadBooks(); loadCalendar('reading'); }
        if (page === 'journal') { loadJournalPrompt(); loadJournalHistory(); loadCalendar('journal'); }
        if (page === 'checkin') { loadCheckinHistory(); loadCalendar('checkin'); }
        if (page === 'running') { loadRunHistory(); loadCalendar('running'); }
        if (page === 'work') { loadWorkData(); loadCalendar('work'); }
        if (page === 'travel') { initCurrencySelectors(); loadExpenses(); loadCalendar('travel'); }
        if (page === 'social') { loadSocialData(); loadCalendar('social'); }
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
                let color = 'var(--accent-teal, #2dd4bf)';
                if (type === 'long') color = 'var(--accent-amber)';
                if (type === 'tempo' || type === 'interval') color = '#eab308';
                if (type === 'cross_train' || type === 'cross-train') color = 'var(--accent-blue)';
                badgeHtml = `<div class="cal-val-bubble" style="background:${color};">${topRun.distance_km}</div>`;
            } else if (containerId === 'journal-calendar' && dateMap[dateStr][0].word_count !== undefined) {
                const totalWords = dateMap[dateStr].reduce((sum, j) => sum + (j.word_count || 0), 0);
                badgeHtml = `<div class="cal-val-capsule" style="background:var(--accent);">${totalWords}</div>`;
            } else if (containerId === 'work-calendar' && dateMap[dateStr][0].duration_minutes !== undefined) {
                const totalMins = dateMap[dateStr].reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
                const hrs = (totalMins / 60).toFixed(1).replace('.0', '');
                badgeHtml = `<div class="cal-val-capsule" style="background:#8b5cf6;">${hrs}h</div>`;
            } else if (containerId === 'expense-calendar' && dateMap[dateStr][0].amount_usd !== undefined) {
                const totalSpent = dateMap[dateStr].reduce((sum, e) => sum + (e.amount_usd || 0), 0);
                badgeHtml = `<div class="cal-val-bubble" style="background:var(--accent-rose); border-radius:4px; padding:2px 4px; font-size:9px;">$${Math.round(totalSpent)}</div>`;
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
    if (checkinDate) checkinDate.value = today();
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
    if (stravaBtn) {
        if (localStorage.getItem('strava_token')) {
            stravaBtn.textContent = 'Strava Connected ✓';
            stravaBtn.style.background = 'var(--accent, #4CAF50)';
            stravaBtn.disabled = true;
            // Show connected state in the Strava card
            const stravaStatus = document.getElementById('strava-status');
            if (stravaStatus) {
                stravaStatus.innerHTML = `
                    <div style="display:flex;align-items:center;gap:8px;padding:8px 0;color:var(--text-primary)">
                        <span style="font-size:18px">✅</span>
                        <span style="font-size:13px;font-weight:500">Your Strava account is connected. Click <strong>Adjust Plan</strong> below to generate your AI coaching plan.</span>
                    </div>
                `;
            }
        } else {
            stravaBtn.addEventListener('click', async () => {
                try {
                    stravaBtn.textContent = 'Connecting...';
                    stravaBtn.disabled = true;
                    const data = await apiGet('/api/strava/login');
                    if (data.url) {
                        window.location.href = data.url;
                    } else {
                        showToast('Could not get Strava login URL');
                        stravaBtn.textContent = 'Connect with Strava';
                        stravaBtn.disabled = false;
                    }
                } catch (err) {
                    showToast('Strava connection error: ' + err.message);
                    stravaBtn.textContent = 'Connect with Strava';
                    stravaBtn.disabled = false;
                }
            });
        }
    }
});


// ─── Check-In ──────────────────────────────────────────────────

const checkinForm = document.getElementById('checkin-form');
if (checkinForm) {
    checkinForm.addEventListener('submit', async e => {
        e.preventDefault();
        const data = {
            date: document.getElementById('checkin-date').value,
            sleep_hours: parseFloat(document.getElementById('checkin-sleep').value) || null,
            steps: parseInt(document.getElementById('checkin-steps').value) || null,
            deep_work_hours: parseFloat(document.getElementById('checkin-deepwork').value) || null,
            journal_words: parseInt(document.getElementById('checkin-journal-words').value) || null,
            energy: parseInt(document.getElementById('checkin-energy').value),
            alignment: parseInt(document.getElementById('checkin-alignment').value),
            meditation: document.getElementById('checkin-meditation').checked,
            notes: document.getElementById('checkin-notes').value || null,
            date: document.getElementById('checkin-date')?.value,
            sleep_hours: parseFloat(document.getElementById('checkin-sleep')?.value) || null,
            steps: parseInt(document.getElementById('checkin-steps')?.value) || null,
            deep_work_hours: parseFloat(document.getElementById('checkin-deepwork')?.value) || null,
            journal_words: parseInt(document.getElementById('checkin-journal-words')?.value) || null,
            energy: parseInt(document.getElementById('checkin-energy')?.value),
            alignment: parseInt(document.getElementById('checkin-alignment')?.value),
            meditation: document.getElementById('checkin-meditation')?.checked,
            notes: document.getElementById('checkin-notes')?.value || null,
        };

        try {
            const result = await apiPost('/api/checkin', data);
            showToast('✓ Check-in saved');
            checkinForm.reset();
            const checkinDate = document.getElementById('checkin-date');
            if (checkinDate) checkinDate.value = today();
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
        container.innerHTML = data.map(c => `
            <div class="history-item">
                <div>
                    <div class="history-date">${c.date || 'N/A'}</div>
                    <div style="font-size:12px;color:var(--text-secondary)">
                        ${c.meditation ? '🧘' : ''}
                        ${c.sleep_hours ? `😴${c.sleep_hours}h` : ''}
                        ${c.steps ? `👟${c.steps.toLocaleString()}` : ''}
                    </div>
                </div>
                <div style="text-align:right">
                    <div class="history-value">⚡${c.energy || '-'}/10</div>
                    <div style="font-size:11px;color:var(--text-secondary)">🎯${c.alignment || '-'}/10</div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        const container = document.getElementById('checkin-history');
        if (container) container.innerHTML =
            '<div class="loading-text">Could not load history</div>';
    }
}


// ─── Running ───────────────────────────────────────────────────

const runForm = document.getElementById('run-form');
if (runForm) {
    runForm.addEventListener('submit', async e => {
        e.preventDefault();
        const data = {
            date: document.getElementById('run-date')?.value,
            distance_km: parseFloat(document.getElementById('run-distance')?.value),
            duration_minutes: parseFloat(document.getElementById('run-duration')?.value) || null,
            run_type: document.getElementById('run-type')?.value,
            notes: document.getElementById('run-notes')?.value || null,
        };

        try {
            const result = await apiPost('/api/runs', data);
            showToast('✓ Run saved');
            runForm.reset();
            const runDate = document.getElementById('run-date');
            if (runDate) runDate.value = today();
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
            <div class="history-item">
                <div class="history-item-left">
                    <strong>${r.date || 'N/A'}</strong>
                    <div class="item-meta">${r.duration_minutes ? r.duration_minutes + ' min' : ''}</div>
                    <span class="category-badge">${r.run_type || 'easy'}</span>
                </div>
                <div class="history-item-right">
                    <div class="amount">${r.distance_km} km</div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        const container = document.getElementById('run-history');
        if (container) container.innerHTML =
            '<div class="loading-text">Could not load runs</div>';
    }
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
    "Are you taking enough risks in your life? Would you like to change your relationship to risk?",
    "At what point in your life have you had the highest self-esteem?",
    "Consider and reflect on what might be your 'favorite failure.'",
    "How can you reframe one of your biggest regrets in life?",
    "How did you bond with one of the best friends you've ever had?",
    "How do the opinions of others affect you?",
    "How do you feel about asking for help?",
    "How much do your current goals reflect your desires vs someone else's?",
    "In what ways are you currently self-sabotaging or holding yourself back?",
    "Take a task that you've been dreading and break it up into the smallest possible steps.",
    "Think about the last time you cried. If those tears could talk, what would they have said?",
    "What are some small things that other people have done that really make your day?",
    "What are some things that frustrate you? Can you find any values that explain why they bug you so much?",
    "What biases do you need to work on?",
    "What could you do to make your life more meaningful?",
    "What did you learn from your last relationship? If you haven't had one, what could you learn from a relationship that you've observed?",
    "What do you need to give yourself more credit for?",
    "What does 'ready' feel like to you? How did you know you were ready for a major step that you have taken in your life?",
    "What happens when you are angry?",
    "What is a boundary that you need to draw in your life?",
    "What is a positive habit that you would really like to cultivate? Why and how could you get started?",
    "What is a view about the world that has changed for you as you've gotten older?",
    "What is holding you back from being more productive at the moment? What can you do about that?",
    "What is something that you grew out of that meant a lot to you at the time?",
    "What is something that you have a hard time being honest about, even to those you trust the most? Why?",
    "What pet peeves do you have? Any idea why they drive you so crazy?",
    "What was a seemingly inconsequential decision that made a big impact in your life?",
    "When was the last time you had to hold your tongue? What would you have said if you didn't have to?",
    "Which emotions in others do you have a difficult time being around? Why?",
    "Who is somebody that you miss? Why?",
    "Who is the most difficult person in your life and why?",
    "Write a letter to your own body, thanking it for something amazing it has done.",
    "Write about a mistake that taught you something about yourself.",
    "Write about an aspect of your personality that you appreciate in other people as well.",
    "Write about something (or someone) that is currently tempting you.",
    "Write an apology to yourself for a time you treated yourself poorly.",

    // Stoicism Prompts
    "What is outside of your control right now, and how can you accept it?",
    "If today were your last day, how would you change what you are doing?",
    "What obstacle is currently in your way, and how can it become the way?",
    "How did you practice virtue (wisdom, courage, justice, temperance) today?",
    "What event today did you judge as bad, but can choose to view as an opportunity?",

    // Thich Nhat Hanh Prompts
    "As you breathe in and out right now, what sensations do you notice?",
    "Where did you find a moment of true peace and stillness today?",
    "How can you look deeply into the suffering of a person you encountered today to cultivate compassion?",
    "What is a beautiful, simple thing in the present moment that you might be overlooking?",
    "How can you apply mindful awareness to a task you usually rush through?"
];

let currentTradition = 'blended';

document.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
        document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
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
            <div class="prompt-quote">
                100 Journaling Prompts for Reflection
                <div class="prompt-source">— decideyourlegacy.com</div>
            </div>
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
        const content = document.getElementById('journal-content')?.value;
        const data = {
            date: document.getElementById('journal-date')?.value,
            content: content,
            word_count: content?.trim().split(/\s+/).filter(w => w).length || 0,
            tradition: currentTradition,
            themes: selectedThemes
        };

        try {
            const result = await apiPost('/api/journal', data);
            showToast(`✓ Entry saved (${result.word_count} words)`);
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
        container.innerHTML = data.map(j => {
            const themesHtml = (j.themes && j.themes.length) ?
                j.themes.map(t => `<span class="pill theme-pill" data-static="true" style="font-size:10px; padding:2px 6px; margin-left:6px; background:var(--accent-light); color:var(--accent-dark); border:none; display:inline-block; vertical-align:middle; cursor:default;">${t}</span>`).join('') : '';

            return `
            <div class="history-item" style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div class="history-item-left" style="width: 100%;">
                    <div style="display:flex; align-items:center; flex-wrap:wrap;">
                        <strong>${j.date || 'N/A'}</strong>
                        ${themesHtml}
                    </div>
                    <div class="item-meta" style="margin-top:4px;color:var(--text-primary);line-height:1.5;">
                        ${j.content.length > 200 ? j.content.substring(0, 200) + '...' : j.content}
                    </div>
                </div>
                <div class="history-item-right" style="min-width:60px">
                    <div class="amount">${j.word_count || 0} w</div>
                </div>
            </div>
            `;
        }).join('');
    } catch (err) {
        const container = document.getElementById('journal-history');
        if (container) container.innerHTML =
            '<div class="loading-text">Could not load journals</div>';
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

// Generate review button (Guarded)
const genReviewBtn = document.getElementById('generate-review-btn');
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
    const contentDiv = document.getElementById('review-content');
    const bodyDiv = document.getElementById('review-body');
    const titleEl = document.getElementById('review-title');

    if (!contentDiv || !bodyDiv || !titleEl) return;

    contentDiv.style.display = 'block';
    const labels = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly' };
    titleEl.textContent = `${labels[period] || 'Weekly'} Review`;
    bodyDiv.innerHTML = '<div class="loading-text"><div class="spinner"></div> Generating AI review...</div>';

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
        const data = {
            date: document.getElementById('expense-date')?.value,
            amount: parseFloat(document.getElementById('expense-amount')?.value),
            currency: document.getElementById('expense-currency')?.value,
            category: document.getElementById('expense-category')?.value,
            description: document.getElementById('expense-desc')?.value || null,
            trip: document.getElementById('expense-trip')?.value || null,
        };

        try {
            const result = await apiPost('/api/travel/expenses', data);
            const usdStr = result.amount_usd ? ` (~$${result.amount_usd})` : '';
            showToast(`✓ Expense saved${usdStr}`);
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

                // Recalculate categories for the month
                const cats = {};
                currentMonthExpenses.forEach(e => {
                    const cat = e.category || 'other';
                    cats[cat] = (cats[cat] || 0) + (e.amount_usd || 0);
                });

                summaryDiv.innerHTML = `
                    <div class="stat-row" style="margin-bottom: 8px;">
                        <span class="stat-label" style="font-weight: 600; color: var(--text-primary);">Total Monthly Spend</span>
                        <span class="stat-value" style="font-size: 16px; font-weight: 700; color: var(--accent-rose);">$${total.toFixed(2)}</span>
                    </div>
                ` + Object.entries(cats)
                        .sort((a, b) => b[1] - a[1]) // Sort categories by amount
                        .map(([cat, amount]) => `
                        <div class="stat-row">
                            <span class="stat-label" style="text-transform: capitalize;">${cat}</span>
                            <span class="stat-value">$${amount.toFixed(2)}</span>
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
                historyDiv.innerHTML = expenses.slice(0, 20).map(e => `
                    <div class="history-item">
                        <div class="history-item-left">
                            <strong>${e.title}</strong>
                            <div class="item-meta">${e.date} · ${e.category}</div>
                        </div>
                        <div class="history-item-right">
                            <div class="history-amount">${e.amount} ${e.currency}</div>
                            ${e.amount_usd ? `<div class="item-meta">≈ $${e.amount_usd.toFixed(2)}</div>` : ''}
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (err) {
        const historyDiv = document.getElementById('expense-history');
        if (historyDiv) historyDiv.innerHTML =
            '<div class="loading-text">Could not load expenses</div>';
    }
}


// ─── Work (Pomodoro) ───────────────────────────────────────────

const workForm = document.getElementById('work-form');
if (workForm) {
    workForm.addEventListener('submit', async e => {
        e.preventDefault();
        const data = {
            date: document.getElementById('work-date')?.value || today(),
            duration_minutes: parseInt(document.getElementById('work-duration')?.value) || 0,
            category: document.getElementById('work-category')?.value || 'coding',
            notes: document.getElementById('work-notes')?.value || null,
        };

        try {
            const result = await apiPost('/api/work', data);
            showToast('✓ Deep Work logged');
            workForm.reset();
            const workDate = document.getElementById('work-date');
            if (workDate) workDate.value = today();
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
                if (w.duration_minutes >= 60) {
                    hrStr = `${Math.floor(w.duration_minutes / 60)}h ${w.duration_minutes % 60}m`;
                } else {
                    hrStr = `${w.duration_minutes}m`;
                }

                return `
                    <div class="history-item">
                        <div class="history-item-left">
                            <strong>${(w.category || 'Work').toUpperCase()}</strong>
                            <div class="item-meta">${w.date} · ${w.notes || ''}</div>
                        </div>
                        <div class="history-item-right">
                            <div class="history-amount">${hrStr}</div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<div class="loading-text">No deep work sessions yet!</div>';
        }

        // Today UI
        const todayHrs = Math.floor(todayMins / 60);
        const todayRemMins = todayMins % 60;
        const workTodayTotal = document.getElementById('work-today-total');
        if (workTodayTotal) workTodayTotal.textContent = `${todayHrs}h ${todayRemMins}m`;

        const topCat = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a])[0];
        const workTodayTop = document.getElementById('work-today-top');
        if (workTodayTop) workTodayTop.textContent = topCat ? topCat.toUpperCase() : '--';

    } catch (err) {
        const container = document.getElementById('work-history');
        if (container) container.innerHTML =
            '<div class="loading-text">Could not load work history</div>';
    }
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

const socialForm = document.getElementById('social-form');
if (socialForm) {
    socialForm.addEventListener('submit', async e => {
        e.preventDefault();
        const data = {
            date: document.getElementById('social-date')?.value,
            name: document.getElementById('social-name')?.value,
            category: document.getElementById('social-category')?.value,
            context: document.getElementById('social-context')?.value || null,
            location: document.getElementById('social-location')?.value || null,
            notes: document.getElementById('social-notes')?.value || null,
            follow_up: document.getElementById('social-followup')?.value || null,
        };

        try {
            const result = await apiPost('/api/social', data);
            showToast('✓ Connection saved');
            socialForm.reset();
            const socialDate = document.getElementById('social-date');
            if (socialDate) socialDate.value = today();
            loadSocialData();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    });
}

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
                historyDiv.innerHTML = connections.slice(0, 20).map(c => `
                    <div class="history-item">
                        <div class="history-item-left">
                            <strong>${c.name}</strong>
                            <div class="item-meta">${c.date}${c.location ? ' · ' + c.location : ''}${c.context ? ' · ' + c.context : ''}</div>
                            <span class="category-badge">${(c.category || 'friend').replace('_', ' ')}</span>
                            ${c.follow_up ? `<div class="item-meta" style="margin-top:4px;color:var(--text-primary)">↳ ${c.follow_up}</div>` : ''}
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (err) {
        const historyDiv = document.getElementById('social-history');
        if (historyDiv) historyDiv.innerHTML = '<div class="loading-text">Could not load social data</div>';
    }
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
    window.speechSynthesis.speak(utterance);
    showToast('🔊 Reading prompt aloud...');
});

// Pre-load voices
if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}
