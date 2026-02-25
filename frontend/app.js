/**
 * Mindful Life AI — Frontend Application
 * POC: Tracker forms + AI-powered journaling prompts + review dashboard
 */

const API = '';  // same origin

// ─── Navigation ────────────────────────────────────────────────

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`page-${page}`).classList.add('active');

        // Save active tab to localStorage
        localStorage.setItem('mindful_active_tab', page);

        // Load data for each page on switch
        if (page === 'review') loadReviewData();
        if (page === 'reading') { loadReadingStats(); loadBooks(); }
        if (page === 'journal') { loadJournalPrompt(); loadJournalHistory(); }
        if (page === 'checkin') { loadCheckinHistory(); loadCalendar('checkin'); }
        if (page === 'running') { loadRunHistory(); loadCalendar('running'); }
        if (page === 'travel') { initCurrencySelectors(); loadExpenses(); loadCalendar('travel'); }
        if (page === 'social') loadSocialData();
    });
});

// ─── Helpers ───────────────────────────────────────────────────

let currentUser = null; // Store conceptual logged in user Name

function today() {
    return new Date().toISOString().split('T')[0];
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast';
    if (type === 'error') toast.classList.add('toast-error');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
}

async function apiPost(endpoint, data) {
    const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

async function apiGet(endpoint) {
    const res = await fetch(`${API}${endpoint}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
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

        html += `<div class="${classes.join(' ')}" ${hasData ? `onclick="showCalDetail('${containerId}', '${dateStr}')"` : ''}>
            <span>${day}</span>
            ${hasData ? '<div class="cal-dot"></div>' : ''}
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

    function updateAuthHeader() {
        if (currentUser) {
            authStatus.innerHTML = `Signed in as <strong>${currentUser}</strong> <span style="margin: 0 4px; color: var(--border);">|</span> <span id="auth-logout" style="cursor: pointer; color: var(--text-muted); font-size: 11px; transition: var(--transition);" onmouseover="this.style.color='var(--accent-rose)'" onmouseout="this.style.color='var(--text-muted)'">Log Out</span>`;
            document.getElementById('greeting').textContent = `Hello, ${currentUser} 👋`;

            const logoutBtn = document.getElementById('auth-logout');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    localStorage.removeItem('mindful_user');
                    currentUser = null;
                    document.getElementById('greeting').textContent = `Hello, Chau 👋`; // Reset
                    updateAuthHeader();
                    showToast('Logged out');
                });
            }
        } else {
            authStatus.innerHTML = `<span id="auth-trigger" style="cursor: pointer; color: var(--accent-blue); transition: var(--transition);" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">Login / Sign Up</span>`;

            // Re-bind the trigger
            document.getElementById('auth-trigger').addEventListener('click', () => {
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                document.getElementById('page-auth').classList.add('active');
            });
        }
    }

    // Check for existing session
    const savedUser = localStorage.getItem('mindful_user');
    if (savedUser) {
        currentUser = savedUser;
    }
    updateAuthHeader();

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
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            let name = 'Chau'; // Default fallback
            if (tabSignup.classList.contains('active')) {
                name = authName.value.trim() || 'Chau';
            } else {
                name = 'Chau'; // Simulate login
            }

            currentUser = name;
            localStorage.setItem('mindful_user', currentUser);

            updateAuthHeader();

            // Navigate back to the saved tab, or Check-in
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const savedTab = localStorage.getItem('mindful_active_tab') || 'checkin';
            const tabBtn = document.querySelector(`.nav-item[data-page="${savedTab}"]`);
            if (tabBtn) {
                tabBtn.click();
            } else {
                document.querySelector('[data-page="checkin"]').classList.add('active');
                document.getElementById('page-checkin').classList.add('active');
            }

            showToast('Authentication successful!');
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
    document.getElementById('checkin-date').value = today();
    document.getElementById('run-date').value = today();
    document.getElementById('journal-date').value = today();
    document.getElementById('expense-date').value = today();
    document.getElementById('social-date').value = today();

    // Range slider displays
    document.getElementById('checkin-energy').addEventListener('input', e => {
        document.getElementById('energy-val').textContent = e.target.value;
    });
    document.getElementById('checkin-alignment').addEventListener('input', e => {
        document.getElementById('alignment-val').textContent = e.target.value;
    });

    // Journal word count
    document.getElementById('journal-content').addEventListener('input', e => {
        const wc = e.target.value.trim().split(/\s+/).filter(w => w).length;
        document.getElementById('journal-wc').textContent = `${wc} words`;
    });

    // Currency converter live update
    document.getElementById('convert-amount').addEventListener('input', runConversion);
    document.getElementById('convert-from').addEventListener('change', runConversion);
    document.getElementById('convert-to').addEventListener('change', runConversion);

    // Restore active tab
    const savedTab = localStorage.getItem('mindful_active_tab') || 'checkin';
    const tabBtn = document.querySelector(`.nav-item[data-page="${savedTab}"]`);
    if (tabBtn) {
        // Only restore if not currently on the auth page (from successful login intercept)
        if (!document.getElementById('page-auth').classList.contains('active')) {
            tabBtn.click();
        }
    } else {
        loadCheckinHistory();
    }

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

document.getElementById('checkin-form').addEventListener('submit', async e => {
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
    };

    try {
        const result = await apiPost('/api/checkin', data);
        showToast('✓ Check-in saved');
        document.getElementById('checkin-form').reset();
        document.getElementById('checkin-date').value = today();
        loadCheckinHistory();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
});

async function loadCheckinHistory() {
    try {
        const data = await apiGet('/api/checkins?limit=7');
        const container = document.getElementById('checkin-history');
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
        document.getElementById('checkin-history').innerHTML =
            '<div class="loading-text">Could not load history</div>';
    }
}


// ─── Running ───────────────────────────────────────────────────

document.getElementById('run-form').addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
        date: document.getElementById('run-date').value,
        distance_km: parseFloat(document.getElementById('run-distance').value),
        duration_minutes: parseFloat(document.getElementById('run-duration').value) || null,
        run_type: document.getElementById('run-type').value,
        notes: document.getElementById('run-notes').value || null,
    };

    try {
        const result = await apiPost('/api/runs', data);
        showToast('✓ Run saved');
        document.getElementById('run-form').reset();
        document.getElementById('run-date').value = today();
        loadRunHistory();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
});

async function loadRunHistory() {
    try {
        const data = await apiGet('/api/runs?limit=10');
        const container = document.getElementById('run-history');
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
        document.getElementById('run-history').innerHTML =
            '<div class="loading-text">Could not load runs</div>';
    }
}

// Running Coach Logic
document.getElementById('get-coach-plan-btn')?.addEventListener('click', async () => {
    const container = document.getElementById('ai-plan-container');
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


// ─── Reading ───────────────────────────────────────────────────

document.getElementById('search-book-btn')?.addEventListener('click', async () => {
    const query = document.getElementById('book-search-query').value.trim();
    if (!query) return;

    const resultsContainer = document.getElementById('book-search-results');
    resultsContainer.innerHTML = '<div class="loading-text">Searching...</div>';

    try {
        const res = await apiGet(`/api/books/search?q=${encodeURIComponent(query)}`);
        if (res.status === 'success' && res.results.length > 0) {
            resultsContainer.innerHTML = res.results.map((book, idx) => `
                <div class="book-result-item" style="padding: 8px; background: var(--bg-secondary); border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 10px;" data-title="${book.title.replace(/"/g, '&quot;')}"  data-author="${book.author.replace(/"/g, '&quot;')}" data-cover="${book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : ''}">
                    ${book.cover_i ? `<img src="https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg" style="width: 30px; height: 45px; object-fit: cover; border-radius: 4px;">` : '<div style="width: 30px; height: 45px; background: var(--border); border-radius: 4px;"></div>'}
                    <div>
                        <div style="font-size: 13px; font-weight: 500; color: var(--text-primary); line-height: 1.2;">${book.title}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">${book.author}</div>
                    </div>
                </div>
            `).join('');

            // Add click listeners to autofill
            resultsContainer.querySelectorAll('.book-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    document.getElementById('book-title').value = item.dataset.title;
                    document.getElementById('book-author').value = item.dataset.author;
                    document.getElementById('book-cover-url').value = item.dataset.cover || '';
                    resultsContainer.innerHTML = '';
                    document.getElementById('book-search-query').value = '';
                    showToast(`Selected: ${item.dataset.title}`);
                });
            });
        } else {
            resultsContainer.innerHTML = '<div class="loading-text">No results found.</div>';
        }
    } catch (err) {
        resultsContainer.innerHTML = `<div class="loading-text" style="color: var(--accent-rose);">Search failed.</div>`;
    }
});

document.getElementById('book-form').addEventListener('submit', async e => {
    e.preventDefault();
    const statusVal = document.getElementById('book-status').value;
    const data = {
        title: document.getElementById('book-title').value,
        author: document.getElementById('book-author').value,
        genre: document.getElementById('book-genre').value,
        rating: parseInt(document.getElementById('book-rating').value) || null,
        is_finished: statusVal === 'read',
        status: statusVal,
        cover_url: document.getElementById('book-cover-url').value || null,
        reaction: document.getElementById('book-reaction').value || null,
    };

    try {
        const result = await apiPost('/api/books', data);
        showToast('✓ Book saved');

        // Show reflection prompts if available
        if (result.reflection_prompts && result.reflection_prompts.length) {
            const container = document.getElementById('reflection-prompts');
            container.innerHTML = result.reflection_prompts.map(p => `
                <div class="prompt-card" style="margin-bottom:10px">
                    <p class="prompt-text">${p.prompt}</p>
                    <div class="prompt-source">${p.tradition} · ${p.connection || ''}</div>
                </div>
            `).join('');
            document.getElementById('reflection-prompts-container').style.display = 'block';
        }

        document.getElementById('book-form').reset();
        loadReadingStats();
        loadBooks();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
});

async function loadReadingStats() {
    try {
        const stats = await apiGet('/api/books/stats');
        const container = document.getElementById('reading-stats');
        const pct = stats.pace_pct || 0;
        const barColor = stats.on_track ? 'var(--accent)' : 'var(--accent-amber)';

        container.innerHTML = `
            <div style="margin-bottom:16px">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                    <span style="font-size:14px;font-weight:600">${stats.books_finished} / ${stats.yearly_goal} books</span>
                    <span style="font-size:13px;color:${stats.on_track ? 'var(--text-primary)' : 'var(--accent-amber)'}">
                        ${stats.on_track ? '✓ On track' : '⚠ Behind pace'}
                    </span>
                </div>
                <div class="progress-bar-wrap" style="height:6px">
                    <div class="progress-bar" style="width:${Math.min(pct, 100)}%;background:${barColor}"></div>
                </div>
                <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">
                    Expected by now: ${stats.expected_by_now} books
                </div>
            </div>
            ${Object.keys(stats.genres || {}).length ? `
                <div style="font-size:12px;color:var(--text-secondary);margin-top:8px">
                    <strong>Genres:</strong> ${Object.entries(stats.genres).map(([g, c]) => `${g} (${c})`).join(' · ')}
                </div>
            ` : ''}
        `;
    } catch (err) {
        document.getElementById('reading-stats').innerHTML =
            '<div class="loading-text">Add your first book to see stats!</div>';
    }
}


async function loadBooks() {
    try {
        const data = await apiGet('/api/books?limit=100');
        const container = document.getElementById('books-list');
        if (!data || !data.length) {
            container.innerHTML = '<div class="loading-text">No books yet. Add your first book!</div>';
            return;
        }

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
                            <div class="book-card" data-book-id="${b.id}" data-status="${status}" style="width: 110px; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='none'">
                                <div style="width: 110px; height: 160px; border-radius: 8px; overflow: hidden; box-shadow: var(--shadow-sm); margin-bottom: 6px; background: var(--bg-input);">
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

        // Add click listeners for status change buttons
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
        document.getElementById('books-list').innerHTML =
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

document.getElementById('new-prompt-btn').addEventListener('click', () => {
    loadJournalPrompt();
});

// Journal Sub-Tabs
document.querySelectorAll('.j-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.j-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.j-section').forEach(s => s.style.display = 'none');
        tab.classList.add('active');
        const target = `j-sec-${tab.dataset.jtab}`;
        document.getElementById(target).style.display = 'block';

        if (tab.dataset.jtab === 'prompt-list') loadPromptList();
        if (tab.dataset.jtab === 'random-prompt' && document.getElementById('random-prompt-area').innerHTML.includes('Click \'Draw Another\'')) {
            generateRandomPrompt();
        }
    });
});

// Random Prompt Logic
function generateRandomPrompt() {
    const area = document.getElementById('random-prompt-area');
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
    area.querySelector('.use-prompt-btn').addEventListener('click', (e) => {
        document.getElementById('journal-content').value = '"' + e.target.dataset.prompt + '"\n\n';
        document.getElementById('journal-content').focus();
    });
    area.querySelector('.copy-prompt-btn').addEventListener('click', (e) => {
        navigator.clipboard.writeText(e.target.dataset.prompt);
        showToast('Prompt copied to clipboard!');
    });
}

document.getElementById('generate-random-prompt-btn')?.addEventListener('click', generateRandomPrompt);

// Prompt List Logic
let promptListLoaded = false;
function loadPromptList() {
    if (promptListLoaded) return;
    const area = document.getElementById('prompt-list-area');
    area.innerHTML = templatePrompts.map(p => `
        <div class="prompt-inline-item" style="padding: 10px; background: var(--bg-secondary); border-radius: 6px; cursor: pointer; transition: background 0.2s;" data-prompt="${p.replace(/"/g, '&quot;')}">
            <p style="font-size: 14px; margin: 0; color: var(--text-primary); line-height: 1.4;">${p}</p>
        </div>
    `).join('');

    // Click to use
    area.querySelectorAll('.prompt-inline-item').forEach(item => {
        item.addEventListener('click', () => {
            const text = item.dataset.prompt;
            document.getElementById('journal-content').value = '"' + text + '"\n\n';
            document.getElementById('journal-content').focus();
            showToast('Prompt loaded into journal entry');
        });
        item.addEventListener('mouseover', () => item.style.background = 'var(--border)');
        item.addEventListener('mouseout', () => item.style.background = 'var(--bg-secondary)');
    });
    promptListLoaded = true;
}

async function loadJournalPrompt() {
    const area = document.getElementById('journal-prompt-area');
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
document.querySelectorAll('.theme-pill').forEach(pill => {
    pill.addEventListener('click', () => {
        const theme = pill.dataset.theme;
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
});

document.getElementById('journal-form').addEventListener('submit', async e => {
    e.preventDefault();
    const content = document.getElementById('journal-content').value;
    const data = {
        date: document.getElementById('journal-date').value,
        content: content,
        word_count: content.trim().split(/\s+/).filter(w => w).length,
        tradition: currentTradition,
        themes: selectedThemes
    };

    try {
        const result = await apiPost('/api/journal', data);
        showToast(`✓ Entry saved (${result.word_count} words)`);
        document.getElementById('journal-form').reset();
        document.getElementById('journal-date').value = today();
        document.getElementById('journal-wc').textContent = '0 words';

        loadJournalHistory();

        // Reset themes
        selectedThemes = [];
        document.querySelectorAll('.theme-pill').forEach(p => p.classList.remove('active'));
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
});


async function loadJournalHistory() {
    try {
        const data = await apiGet('/api/journal?limit=10');
        const container = document.getElementById('journal-history');
        if (!data.length) {
            container.innerHTML = '<div class="loading-text">No entries yet. Start writing!</div>';
            return;
        }
        container.innerHTML = data.map(j => `
            <div class="history-item">
                <div class="history-item-left">
                    <strong>${j.date || 'N/A'}</strong>
                    <div class="item-meta" style="margin-top:4px;color:var(--text-primary);line-height:1.5;">
                        ${j.content.length > 150 ? j.content.substring(0, 150) + '...' : j.content}
                    </div>
                </div>
                <div class="history-item-right" style="min-width:60px">
                    <div class="amount">${j.word_count || 0} w</div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        document.getElementById('journal-history').innerHTML =
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

// Generate review button
document.getElementById('generate-review-btn').addEventListener('click', () => {
    loadReview(currentPeriod);
});

async function loadReviewData() {
    try {
        const review = await apiGet(`/api/review/${currentPeriod}?generate=false`);
        const m = review.metrics || {};

        // Top metrics
        document.getElementById('m-km').textContent = m.total_km || 0;
        document.getElementById('m-meditation').textContent = `${m.meditation_pct || 0}%`;
        document.getElementById('m-energy').textContent = m.avg_energy || '--';
        document.getElementById('m-books').textContent = m.books_finished || 0;

        // Body category
        document.getElementById('cat-run-km').textContent = `${m.total_km || 0} km`;
        const runGoalKm = currentPeriod === 'weekly' ? 40 : currentPeriod === 'monthly' ? 160 : 480;
        setProgressBar('cat-run-bar', m.total_km || 0, runGoalKm);
        document.getElementById('cat-sleep-avg').textContent = `${m.avg_sleep || '--'} hrs`;
        document.getElementById('cat-steps-pct').textContent = `${m.steps_pct || 0}%`;
        if (document.getElementById('cat-steps-streak')) {
            document.getElementById('cat-steps-streak').textContent = `${m.current_steps_streak || 0} 🔥`;
        }

        // Mind category
        document.getElementById('cat-deepwork').textContent = `${m.deep_work_hours || 0} hrs`;
        document.getElementById('cat-books').textContent = m.books_finished || 0;

        // Reading pace
        try {
            const stats = await apiGet('/api/books/stats');
            document.getElementById('cat-books-pace').textContent =
                `${stats.books_finished}/${stats.yearly_goal}`;
            setProgressBar('cat-books-bar', stats.books_finished, stats.yearly_goal);
        } catch (e) {
            document.getElementById('cat-books-pace').textContent = '--';
        }

        // Spirit category
        document.getElementById('cat-meditation-pct').textContent = `${m.meditation_pct || 0}%`;
        setProgressBar('cat-meditation-bar', m.meditation_pct || 0, 100);
        if (document.getElementById('cat-meditation-streak')) {
            document.getElementById('cat-meditation-streak').textContent = `${m.current_meditation_streak || 0} 🔥`;
        }
        document.getElementById('cat-journal-count').textContent = m.journal_entries || 0;
        document.getElementById('cat-alignment').textContent = `${m.avg_alignment || '--'}/10`;

        // Tracking Streak (Global)
        if (document.getElementById('global-checkin-streak')) {
            document.getElementById('global-checkin-streak').textContent = `${m.current_checkin_streak || 0} days`;
        }

        // Social category in review
        try {
            const socialStats = await apiGet('/api/social/stats');
            document.getElementById('cat-social-interactions').textContent = socialStats.total_interactions || 0;
            document.getElementById('cat-social-people').textContent = socialStats.unique_people || 0;
            const topCat = Object.entries(socialStats.by_category || {}).sort((a, b) => b[1] - a[1])[0];
            document.getElementById('cat-social-top').textContent = topCat ? topCat[0].replace('_', ' ') : '--';
        } catch (e) { /* no social data yet */ }

        // Five Non-Negotiables with bars
        setNNWithBar('nn-sleep', 'nn-sleep-bar', m.sleep_consistency_pct, '%');
        setNNWithBar('nn-meditation', 'nn-meditation-bar', m.meditation_pct, '%');
        setNNWithBar('nn-steps', 'nn-steps-bar', m.steps_pct, '%');
        setNNWithBar('nn-deepwork', 'nn-deepwork-bar', m.deep_work_pct || 0, '%');
        setNNWithBar('nn-therapy', 'nn-therapy-bar', m.therapy_checkin ? 100 : 0, '%');

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
    el.textContent = `${v}${suffix}`;
    el.className = `nn-value ${v >= 70 ? 'good' : v >= 40 ? 'warn' : 'bad'}`;
    if (bar) {
        bar.style.width = `${Math.min(v, 100)}%`;
        bar.style.background = v >= 70 ? 'var(--accent)' : v >= 40 ? 'var(--accent-amber)' : 'var(--accent-rose)';
    }
}

async function loadReview(period) {
    const contentDiv = document.getElementById('review-content');
    const bodyDiv = document.getElementById('review-body');
    const titleEl = document.getElementById('review-title');

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

        currencies.forEach(c => {
            fromSel.add(new Option(c, c));
            toSel.add(new Option(c, c));
            expSel.add(new Option(c, c));
        });

        // Defaults: VND → USD
        fromSel.value = 'VND';
        toSel.value = 'USD';
        expSel.value = 'VND';
        currenciesLoaded = true;
    } catch (e) {
        console.log('Could not load currencies');
    }
}

async function runConversion() {
    const amount = parseFloat(document.getElementById('convert-amount').value);
    if (!amount || amount <= 0) {
        document.getElementById('convert-result').value = '--';
        document.getElementById('convert-rate').textContent = '';
        return;
    }
    const from = document.getElementById('convert-from').value;
    const to = document.getElementById('convert-to').value;

    try {
        const data = await apiGet(`/api/travel/convert?amount=${amount}&from_curr=${from}&to_curr=${to}`);
        document.getElementById('convert-result').value = data.to_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('convert-rate').textContent = `1 ${from} = ${data.rate} ${to}`;
    } catch (e) {
        document.getElementById('convert-result').value = 'Error';
    }
}

document.getElementById('expense-form').addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
        date: document.getElementById('expense-date').value,
        amount: parseFloat(document.getElementById('expense-amount').value),
        currency: document.getElementById('expense-currency').value,
        category: document.getElementById('expense-category').value,
        description: document.getElementById('expense-desc').value || null,
        trip: document.getElementById('expense-trip').value || null,
    };

    try {
        const result = await apiPost('/api/travel/expenses', data);
        const usdStr = result.amount_usd ? ` (~$${result.amount_usd})` : '';
        showToast(`✓ Expense saved${usdStr}`);
        document.getElementById('expense-form').reset();
        document.getElementById('expense-date').value = today();
        if (currenciesLoaded) document.getElementById('expense-currency').value = 'VND';
        loadExpenses();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
});

async function loadExpenses() {
    try {
        const data = await apiGet('/api/travel/expenses');
        const expenses = data.expenses || [];

        // Spending summary
        const summaryDiv = document.getElementById('expense-summary');
        if (expenses.length === 0) {
            summaryDiv.innerHTML = '<div class="loading-text">Log your first expense to see a summary</div>';
        } else {
            const cats = data.by_category || {};
            const catIcons = { food: '🍜', coffee: '☕', transport: '🚕', accommodation: '🏨', activities: '🎟️', shopping: '🛍️', other: '📦' };
            summaryDiv.innerHTML = `
                <div class="summary-total">$${data.total_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
                ${Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => `
                    <div class="stat-row">
                        <span class="stat-label">${catIcons[cat] || '📦'} ${cat}</span>
                        <span class="stat-value">$${amt.toFixed(2)}</span>
                    </div>
                `).join('')}
            `;
        }

        // Expense history
        const historyDiv = document.getElementById('expense-history');
        if (expenses.length === 0) {
            historyDiv.innerHTML = '<div class="loading-text">No expenses yet</div>';
        } else {
            historyDiv.innerHTML = expenses.slice(0, 20).map(e => `
                <div class="history-item">
                    <div class="history-item-left">
                        <strong>${e.description || e.category}</strong>
                        <div class="item-meta">${e.date} · ${e.trip || ''}</div>
                        <span class="category-badge">${e.category}</span>
                    </div>
                    <div class="history-item-right">
                        <div class="amount">${Number(e.amount).toLocaleString()} ${e.currency}</div>
                        ${e.amount_usd ? `<div class="amount-usd">~$${e.amount_usd}</div>` : ''}
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        document.getElementById('expense-history').innerHTML =
            '<div class="loading-text">Could not load expenses</div>';
    }
}


// ─── Social ────────────────────────────────────────────────────

document.getElementById('social-form').addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
        date: document.getElementById('social-date').value,
        name: document.getElementById('social-name').value,
        category: document.getElementById('social-category').value,
        context: document.getElementById('social-context').value || null,
        location: document.getElementById('social-location').value || null,
        notes: document.getElementById('social-notes').value || null,
        follow_up: document.getElementById('social-followup').value || null,
    };

    try {
        const result = await apiPost('/api/social', data);
        showToast('✓ Connection saved');
        document.getElementById('social-form').reset();
        document.getElementById('social-date').value = today();
        loadSocialData();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
});

async function loadSocialData() {
    try {
        const stats = await apiGet('/api/social/stats');
        const connections = stats.connections || [];

        // Social stats
        const statsDiv = document.getElementById('social-stats');
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

        // Recent connections
        const historyDiv = document.getElementById('social-history');
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
    } catch (err) {
        document.getElementById('social-history').innerHTML =
            '<div class="loading-text">Could not load social data</div>';
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
                ` : ''}
            `;
        }
    } catch (err) {
        container.innerHTML = `<div class="loading-text" style="color: var(--accent-rose);">Could not generate summary. Ensure GOOGLE_API_KEY is configured.</div>`;
    }

    btn.disabled = false;
    btn.textContent = 'Summarize ✨';
});


// ─── Voice Journaling (Speech-to-Text) ─────────────────────────

// ─── Voice Journaling (Speech-to-Text via Gemini) ──────────────

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingStartTime = null;
let recordingTimerInterval = null;
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
        <div class="voice-status-left">
            <span class="voice-pulse-dot" id="voice-pulse-indicator"></span>
            <span id="voice-status-text">Listening...</span>
        </div>
        <span id="voice-timer" class="voice-timer">0:00</span>
    `;
    // Insert before the textarea
    const textarea = document.getElementById('journal-content');
    textarea.parentNode.insertBefore(bar, textarea);
    return bar;
}

if (voiceBtn) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        voiceBtn.style.opacity = '0.4';
        voiceBtn.style.cursor = 'not-allowed';
        voiceBtn.title = 'Audio recording not supported in this browser';
    } else {
        voiceBtn.addEventListener('click', () => {
            if (isRecording) {
                stopRecording();
            } else {
                startRecording();
            }
        });
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = processAudio;

        isRecording = true;
        baseTextBeforeRecording = document.getElementById('journal-content').value;
        mediaRecorder.start();

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
        document.getElementById('voice-pulse-indicator').style.display = 'block';
        const statusText = document.getElementById('voice-status-text');
        if (statusText) statusText.textContent = 'Listening...';

        // Start timer
        recordingStartTime = Date.now();
        const timerEl = document.getElementById('voice-timer');
        recordingTimerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            const mins = Math.floor(elapsed / 60);
            const secs = elapsed % 60;
            if (timerEl) timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        }, 1000);

        showToast('🎤 Listening... Speak now');
    } catch (err) {
        console.error('Error starting recording:', err);
        showToast('Microphone access denied or unavailable.', 'error');
    }
}

function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
    isRecording = false;

    // Stop recording, which triggers onstop (processAudio)
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop()); // Release mic

    // Reset button
    voiceBtn.textContent = '🎤';
    voiceBtn.style.background = 'none';
    voiceBtn.style.borderColor = 'var(--accent-teal)';
    voiceBtn.style.color = '';
    voiceBtn.style.animation = '';
    voiceBtn.title = 'Voice journaling — click to speak';

    // Stop timer
    if (recordingTimerInterval) {
        clearInterval(recordingTimerInterval);
        recordingTimerInterval = null;
    }

    // Update status bar to show "Transcribing..."
    const statusText = document.getElementById('voice-status-text');
    if (statusText) statusText.innerHTML = '<span class="spinner" style="width:12px;height:12px;border-width:2px;margin-right:6px"></span> Transcribing...';
    document.getElementById('voice-pulse-indicator').style.display = 'none'; // Stop pulsing dot
}

async function processAudio() {
    if (audioChunks.length === 0) {
        hideStatusBar();
        showToast('No audio recorded', 'error');
        return;
    }

    // Use the mimeType from the recorder if possible, fallback to webm
    const mimeType = mediaRecorder.mimeType || 'audio/webm';
    const audioBlob = new Blob(audioChunks, { type: mimeType });
    const formData = new FormData();

    // Some browsers need a file extension in the filename
    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
    formData.append('audio', audioBlob, `recording.${ext}`);

    try {
        // Send to our Gemini Multimodal endpoint
        const response = await fetch('/api/journal/transcribe', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Transcription failed');
        }

        const result = await response.json();

        if (result.success && (result.enhanced || result.transcription)) {
            // Prefer the enhanced (polished) text from Gemini
            const finalTranscript = result.enhanced || result.transcription;

            const textarea = document.getElementById('journal-content');
            textarea.value = baseTextBeforeRecording + (baseTextBeforeRecording && !baseTextBeforeRecording.endsWith(' ') ? ' ' : '') + finalTranscript + ' ';

            // Update word count
            const wc = textarea.value.trim().split(/\s+/).filter(w => w).length;
            document.getElementById('journal-wc').textContent = `${wc} words`;
            textarea.scrollTop = textarea.scrollHeight;

            showToast('✨ Transcription complete');
        } else {
            showToast('No speech detected in recording', 'error');
        }
    } catch (err) {
        console.error('Transcription error:', err);
        showToast('Transcription error: ' + err.message, 'error');
    } finally {
        hideStatusBar();
    }
}

function hideStatusBar() {
    const bar = document.getElementById('voice-status-bar');
    if (bar) bar.style.display = 'none';
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
