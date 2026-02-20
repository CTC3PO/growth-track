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

        // Load data for each page on switch
        if (page === 'review') loadReviewData();
        if (page === 'reading') loadReadingStats();
        if (page === 'journal') loadJournalPrompt();
        if (page === 'checkin') loadCheckinHistory();
        if (page === 'running') loadRunHistory();
        if (page === 'travel') { initCurrencySelectors(); loadExpenses(); }
        if (page === 'social') loadSocialData();
    });
});

// ─── Helpers ───────────────────────────────────────────────────

function today() {
    return new Date().toISOString().split('T')[0];
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
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

// ─── Initialize ────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
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

    // Load initial data
    loadCheckinHistory();
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
        showToast(result.message || 'Check-in saved!');
        document.getElementById('checkin-form').reset();
        document.getElementById('checkin-date').value = today();
        loadCheckinHistory();
    } catch (err) {
        showToast('Error: ' + err.message);
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
        showToast(result.message || 'Run logged!');
        document.getElementById('run-form').reset();
        document.getElementById('run-date').value = today();
        loadRunHistory();
    } catch (err) {
        showToast('Error: ' + err.message);
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
                <div>
                    <div class="history-date">${r.date || 'N/A'}</div>
                    <div style="font-size:12px;color:var(--text-secondary)">${r.run_type || 'easy'}</div>
                </div>
                <div style="text-align:right">
                    <div class="history-value">${r.distance_km} km</div>
                    ${r.duration_minutes ? `<div style="font-size:11px;color:var(--text-secondary)">${r.duration_minutes} min</div>` : ''}
                </div>
            </div>
        `).join('');
    } catch (err) {
        document.getElementById('run-history').innerHTML =
            '<div class="loading-text">Could not load runs</div>';
    }
}


// ─── Reading ───────────────────────────────────────────────────

document.getElementById('book-form').addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
        title: document.getElementById('book-title').value,
        author: document.getElementById('book-author').value,
        genre: document.getElementById('book-genre').value,
        rating: parseInt(document.getElementById('book-rating').value) || null,
        is_finished: document.getElementById('book-finished').checked,
        reaction: document.getElementById('book-reaction').value || null,
    };

    try {
        const result = await apiPost('/api/books', data);
        showToast(result.message || 'Book saved!');

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
    } catch (err) {
        showToast('Error: ' + err.message);
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
                    <span style="font-size:13px;color:${stats.on_track ? 'var(--accent)' : 'var(--accent-amber)'}">
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
    "Write an apology to yourself for a time you treated yourself poorly."
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

document.getElementById('shuffle-local-prompt-btn')?.addEventListener('click', () => {
    const area = document.getElementById('journal-prompt-area');
    const randomPrompt = templatePrompts[Math.floor(Math.random() * templatePrompts.length)];
    area.innerHTML = `
        <div class="prompt-card">
            <p class="prompt-text">"${randomPrompt}"</p>
            <div class="prompt-quote">
                100 Journaling Prompts for Reflection
                <div class="prompt-source">— decideyourlegacy.com</div>
            </div>
            <div class="prompt-context">Template Suggestion</div>
        </div>
    `;
});

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

document.getElementById('journal-form').addEventListener('submit', async e => {
    e.preventDefault();
    const content = document.getElementById('journal-content').value;
    const data = {
        date: document.getElementById('journal-date').value,
        content: content,
        word_count: content.trim().split(/\s+/).filter(w => w).length,
        tradition: currentTradition,
    };

    try {
        const result = await apiPost('/api/journal', data);
        showToast(`Journal saved! (${result.word_count} words) 📝`);
        document.getElementById('journal-form').reset();
        document.getElementById('journal-date').value = today();
        document.getElementById('journal-wc').textContent = '0 words';
    } catch (err) {
        showToast('Error: ' + err.message);
    }
});


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
        const review = await apiGet(`/api/review/${currentPeriod}`);
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
        const review = await apiGet(`/api/review/${period}`);
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
        showToast(`${result.message}${usdStr}`);
        document.getElementById('expense-form').reset();
        document.getElementById('expense-date').value = today();
        if (currenciesLoaded) document.getElementById('expense-currency').value = 'VND';
        loadExpenses();
    } catch (err) {
        showToast('Error: ' + err.message);
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
        showToast(result.message || 'Connection logged!');
        document.getElementById('social-form').reset();
        document.getElementById('social-date').value = today();
        loadSocialData();
    } catch (err) {
        showToast('Error: ' + err.message);
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
                        ${c.follow_up ? `<div class="item-meta" style="margin-top:4px;color:var(--accent)">↳ ${c.follow_up}</div>` : ''}
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        document.getElementById('social-history').innerHTML =
            '<div class="loading-text">Could not load social data</div>';
    }
}
