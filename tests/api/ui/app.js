const API_BASE = window.location.origin;

async function fetchData(endpoint) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch ${endpoint}:`, error);
        return null;
    }
}

async function renderRuns() {
    const runs = await fetchData('/runs');
    const container = document.getElementById('runs-content');
    
    if (!runs || runs.length === 0) {
        container.innerHTML = `<div class="loading-state">No runs recorded yet.</div>`;
        return;
    }

    const latest = runs[0];
    const passRate = latest.total_scenarios > 0 
        ? Math.round((latest.passed_count / latest.total_scenarios) * 100) 
        : 0;

    container.innerHTML = `
        <div class="run-stat">
            <span class="label">Total Scenarios</span>
            <span class="value">${latest.total_scenarios}</span>
        </div>
        <div class="run-stat">
            <span class="label">Passed</span>
            <span class="value" style="color: var(--success)">${latest.passed_count}</span>
        </div>
        <div class="run-stat">
            <span class="label">Pass Rate</span>
            <span class="value">${passRate}%</span>
        </div>
        <div style="text-align: right; font-size: 0.8rem; color: var(--text-secondary); margin-top: 1rem;">
            Last run: ${new Date(latest.started_at).toLocaleString()}
        </div>
    `;
}

async function renderScenarios() {
    const scenarios = await fetchData('/scenarios?limit=10');
    const tbody = document.getElementById('scenarios-body');
    
    if (!scenarios || scenarios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="loading-state">No scenarios found.</td></tr>`;
        return;
    }

    tbody.innerHTML = scenarios.map(s => {
        const isPass = s.outcome === 'PASS';
        const badgeClass = isPass ? 'pass' : 'fail';
        return `
            <tr>
                <td><span class="badge ${badgeClass}">${s.outcome || 'PENDING'}</span></td>
                <td>Workflow ${s.workflow_id || 'A'}</td>
                <td>${s.network_cond || 'NORMAL'}</td>
                <td>${s.execution_ms || '-'}</td>
            </tr>
        `;
    }).join('');
}

async function renderHypotheses() {
    const hypotheses = await fetchData('/hypotheses');
    const container = document.getElementById('hypotheses-feed');
    
    if (!hypotheses || hypotheses.length === 0) {
        container.innerHTML = `<div class="loading-state">No AI hypotheses generated yet.</div>`;
        return;
    }

    container.innerHTML = hypotheses.map(h => `
        <div class="feed-item">
            <div class="feed-item-header">
                <span>${h.proposed_by || 'Agent'}</span>
                <span>${new Date(h.created_at).toLocaleString()}</span>
            </div>
            <div class="feed-item-body">
                ${h.hypothesis_text}
            </div>
        </div>
    `).join('');
}

async function initDashboard() {
    await Promise.all([
        renderRuns(),
        renderScenarios(),
        renderHypotheses()
    ]);
}

// Initialize and set interval for auto-refresh
initDashboard();
setInterval(initDashboard, 30000); // Refresh every 30s

// Theme Management System
class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
        this.applyTheme(this.currentTheme);
        this.initializeToggle();
    }

    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    getStoredTheme() {
        return localStorage.getItem('theme');
    }

    applyTheme(theme) {
        if (theme === 'system') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.removeItem('theme');
            this.updateToggleUI('system');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            this.updateToggleUI(theme);
        }
        this.currentTheme = theme;
    }

    initializeToggle() {
        const toggle = document.querySelector('.theme-toggle');
        if (toggle) {
            toggle.addEventListener('click', (e) => {
                const btn = e.target.closest('.theme-toggle-option');
                if (btn) {
                    const newTheme = btn.dataset.theme;
                    this.applyTheme(newTheme);
                }
            });
        }
    }

    updateToggleUI(activeTheme) {
        const options = document.querySelectorAll('.theme-toggle-option');
        options.forEach(option => {
            option.classList.toggle('active', option.dataset.theme === activeTheme);
        });
    }
}

// Initialize theme management
document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
});
