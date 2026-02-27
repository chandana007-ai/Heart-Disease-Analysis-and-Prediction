// Global chart instances
let ageChart, genderChart, smokingChart, activityChart;
let chartData = {};
let currentFilters = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadFilters();
    loadDashboardData();
    setupPredictionForm();
});

// Load available filter options
async function loadFilters() {
    try {
        const response = await fetch('/api/get-filters');
        const filters = await response.json();
        
        // Populate Age Category filters
        const ageDiv = document.getElementById('ageFilters');
        filters.age_categories.forEach(cat => {
            ageDiv.innerHTML += `<label><input type="checkbox" value="${cat}" class="filter-check"> ${cat}</label>`;
        });
        
        // Populate Sex filters
        const sexDiv = document.getElementById('sexFilters');
        filters.sex.forEach(sex => {
            sexDiv.innerHTML += `<label><input type="checkbox" value="${sex}" class="filter-check"> ${sex}</label>`;
        });
        
        // Populate Smoking filters
        const smokingDiv = document.getElementById('smokingFilters');
        filters.smoking.forEach(smoke => {
            smokingDiv.innerHTML += `<label><input type="checkbox" value="${smoke}" class="filter-check"> ${smoke}</label>`;
        });
        
        // Populate Activity filters
        const actDiv = document.getElementById('activityFilters');
        filters.physical_activity.forEach(act => {
            actDiv.innerHTML += `<label><input type="checkbox" value="${act}" class="filter-check"> ${act}</label>`;
        });
        
        // Populate Health filters
        const healthDiv = document.getElementById('healthFilters');
        filters.gen_health.forEach(health => {
            healthDiv.innerHTML += `<label><input type="checkbox" value="${health}" class="filter-check"> ${health}</label>`;
        });
        
        // Setup BMI range
        document.getElementById('bmiMin').max = filters.bmi_range[1];
        document.getElementById('bmiMax').min = filters.bmi_range[0];
        document.getElementById('bmiMin').value = filters.bmi_range[0];
        document.getElementById('bmiMax').value = filters.bmi_range[1];
        updateBmiLabel();
        
        // Add event listeners for BMI sliders
        document.getElementById('bmiMin').addEventListener('input', updateBmiLabel);
        document.getElementById('bmiMax').addEventListener('input', updateBmiLabel);
    } catch (error) {
        console.error('Error loading filters:', error);
    }
}

// Update BMI range label
function updateBmiLabel() {
    const min = document.getElementById('bmiMin').value;
    const max = document.getElementById('bmiMax').value;
    document.getElementById('bmiValue').textContent = `${min} - ${max}`;
}

// Apply filters
async function applyFilters() {
    const filters = {
        age_category: Array.from(document.querySelectorAll('#ageFilters input:checked')).map(el => el.value),
        sex: Array.from(document.querySelectorAll('#sexFilters input:checked')).map(el => el.value),
        smoking: Array.from(document.querySelectorAll('#smokingFilters input:checked')).map(el => el.value),
        physical_activity: Array.from(document.querySelectorAll('#activityFilters input:checked')).map(el => el.value),
        gen_health: Array.from(document.querySelectorAll('#healthFilters input:checked')).map(el => el.value),
        bmi_range: [parseFloat(document.getElementById('bmiMin').value), parseFloat(document.getElementById('bmiMax').value)]
    };
    
    currentFilters = filters;
    
    try {
        const response = await fetch('/api/filter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(filters)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(`✅ Filters applied! ${result.record_count} records match your criteria.`);
            switchTab('overview');
        } else {
            alert('❌ No data matches your filters');
        }
    } catch (error) {
        console.error('Error applying filters:', error);
        alert('Error applying filters');
    }
}

// Reset filters
function resetFilters() {
    document.querySelectorAll('.filter-check').forEach(el => el.checked = false);
    currentFilters = {};
    loadDashboardData();
    alert('✅ Filters reset');
}

// Tab Switching
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to the clicked button if available, otherwise find the matching button
    try {
        if (typeof event !== 'undefined' && event.target) {
            event.target.classList.add('active');
        } else {
            // Fallback: find button whose onclick calls this tabName
            document.querySelectorAll('.tab-btn').forEach(btn => {
                const onclick = btn.getAttribute('onclick') || '';
                if (onclick.includes(`'${tabName}'`) || onclick.includes(`\"${tabName}\"`)) {
                    btn.classList.add('active');
                }
            });
        }
    } catch (err) {
        // If anything goes wrong, silently continue (UI still switches content)
        console.warn('Could not set active tab button:', err);
    }
    
    // Load data for specific tabs
    if (tabName === 'analysis') {
        loadAnalysisCharts();
    }
    
    if (tabName === 'data') {
        loadDataSummary();
    }
}

// Fetch all statistics
async function loadDashboardData() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        chartData = data;
        
        // Initialize charts with data
        initializeCharts();
        updateInsights();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Initialize all charts
function initializeCharts() {
    if (!chartData.age_dist) return;
    
    const ctx1 = document.getElementById('ageChart').getContext('2d');
    if (ageChart) ageChart.destroy();
    ageChart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: chartData.age_dist.ages,
            datasets: [
                {
                    label: 'Heart Disease',
                    data: chartData.age_dist.disease,
                    backgroundColor: '#ff6b6b',
                    borderColor: '#ff6b6b',
                    borderWidth: 1
                },
                {
                    label: 'Healthy',
                    data: chartData.age_dist.healthy,
                    backgroundColor: '#51cf66',
                    borderColor: '#51cf66',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
    
    // Gender Chart
    const ctx2 = document.getElementById('genderChart').getContext('2d');
    if (genderChart) genderChart.destroy();
    genderChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: chartData.gender_dist.labels,
            datasets: [
                {
                    label: 'Healthy',
                    data: chartData.gender_dist.healthy,
                    backgroundColor: '#74c0fc',
                    borderColor: '#4c6ef5',
                    borderWidth: 1
                },
                {
                    label: 'Heart Disease',
                    data: chartData.gender_dist.disease,
                    backgroundColor: '#ff8787',
                    borderColor: '#ff6b6b',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Load Analysis Charts
function loadAnalysisCharts() {
    if (!chartData.lifestyle || !chartData.health_dist) return;
    
    // Smoking Chart
    const ctx3 = document.getElementById('smokingChart').getContext('2d');
    if (smokingChart) smokingChart.destroy();
    smokingChart = new Chart(ctx3, {
        type: 'bar',
        data: {
            labels: ['Disease Group', 'Healthy Group'],
            datasets: [{
                label: 'Smoking Rate (%)',
                data: [chartData.lifestyle.smoking_disease, chartData.lifestyle.smoking_healthy],
                backgroundColor: ['#ff8787', '#74c0fc'],
                borderColor: ['#ff6b6b', '#4c6ef5'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: { beginAtZero: true, max: 100 }
            }
        }
    });
    
    // Physical Activity Chart
    const ctx4 = document.getElementById('activityChart').getContext('2d');
    if (activityChart) activityChart.destroy();
    activityChart = new Chart(ctx4, {
        type: 'bar',
        data: {
            labels: ['Disease Group', 'Healthy Group'],
            datasets: [{
                label: 'Active Rate (%)',
                data: [chartData.lifestyle.activity_disease, chartData.lifestyle.activity_healthy],
                backgroundColor: ['#ff8787', '#69db7c'],
                borderColor: ['#ff6b6b', '#51cf66'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: { beginAtZero: true, max: 100 }
            }
        }
    });
}

// Update Insights
function updateInsights() {
    const stats = chartData.stats;
    const lifestyle = chartData.lifestyle;
    
    document.getElementById('insight1').textContent = 
        `${stats.disease_pct}% of patients have heart disease (${stats.disease_count}/${stats.total})`;
    
    document.getElementById('insight2').textContent = 
        `Smoking is more prevalent in disease group: ${lifestyle.smoking_disease}% vs ${lifestyle.smoking_healthy}%`;
    
    document.getElementById('insight3').textContent = 
        `Physical activity reduces risk: ${lifestyle.activity_healthy}% active in healthy group vs ${lifestyle.activity_disease}% in disease group`;
}

// Setup Prediction Form
function setupPredictionForm() {
    const form = document.getElementById('predictionForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            console.log('📤 Form data:', data);
            
            try {
                    const response = await fetch('/api/predict', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });

                    const text = await response.text();
                    console.log('📥 Raw response:', text);
                    let result = {};
                    try { result = JSON.parse(text); } catch (e) { result = { error: text }; }

                    console.log('✅ Parsed result:', result);

                    if (!response.ok) {
                        const err = result.error || result.message || 'Prediction failed';
                        document.getElementById('predictionResult').classList.remove('hidden');
                        document.getElementById('resultStatus').innerHTML = `<div class="status-alert">❌ ${err}</div>`;
                        return;
                    }

                    displayPredictionResult(result);
            } catch (error) {
                console.error('Error:', error);
                alert('Error making prediction');
            }
        });
    }
}

// Display Prediction Result
function displayPredictionResult(result) {
    const resultBox = document.getElementById('predictionResult');
    const resultStatus = document.getElementById('resultStatus');
    const riskLevel = document.getElementById('riskLevel');
    const confidence = document.getElementById('confidence');
    
    console.log('🎯 displayPredictionResult called with:', result);
    console.log('📍 Elements found - resultStatus:', resultStatus, 'riskLevel:', riskLevel, 'confidence:', confidence);

    resultBox.classList.remove('hidden');
    // Defensive parsing
    const pred = typeof result.prediction !== 'undefined' ? Number(result.prediction) : null;
    const risk = typeof result.risk !== 'undefined' ? Number(result.risk) : null;
    const healthy = typeof result.healthy_prob !== 'undefined' ? Number(result.healthy_prob) : null;

    console.log('🔢 Parsed values - pred:', pred, 'risk:', risk, 'healthy:', healthy);

    if (pred === 1) {
        resultStatus.innerHTML = '<div class="status-alert">⚠️ HIGH RISK - Heart Disease Detected</div>';
        riskLevel.textContent = (risk !== null ? risk : 'N/A') + '%';
    } else if (pred === 0) {
        resultStatus.innerHTML = '<div class="status-good">✅ LOW RISK - No Heart Disease Detected</div>';
        riskLevel.textContent = (healthy !== null ? healthy : 'N/A') + '%';
    } else {
        resultStatus.innerHTML = '<div class="status-alert">⚠️ Unable to determine prediction</div>';
        riskLevel.textContent = 'N/A';
    }

    const conf = Math.max((risk !== null ? risk : -Infinity), (healthy !== null ? healthy : -Infinity));
    confidence.textContent = (isFinite(conf) ? conf.toFixed(1) + '%' : 'N/A');
    console.log('✨ Risk Level set to:', riskLevel.textContent, 'Confidence:', confidence.textContent);
}

// Generate AI Report
async function generateReport() {
    const reportBtn = document.querySelectorAll('.btn-report');
    // show loading state
    reportBtn.forEach(b => b.disabled = true);
    const reportContent = document.getElementById('reportContent');
    const previousContent = reportContent.innerHTML;
    reportContent.innerHTML = '<p style="text-align:center;color:#666;">Generating report… please wait.</p>';

    try {
        const response = await fetch('/api/generate-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filters: currentFilters })
        });

        const text = await response.text();
        let result = null;
        try {
            result = JSON.parse(text);
        } catch (parseErr) {
            // Backend returned non-JSON (unexpected) — show raw text
            result = { report: text };
        }

        if (response.ok) {
            const reportMarkdown = result.report || result.data || '';
            const htmlReport = (typeof marked !== 'undefined' && reportMarkdown) ? marked.parse(reportMarkdown) : (reportMarkdown || '<p>No report returned</p>');
            reportContent.innerHTML = htmlReport;
            switchTab('report');
        } else {
            // Show backend error message inline instead of alert
            const errMsg = result && (result.error || result.message) ? (result.error || result.message) : 'Unknown error generating report';
            reportContent.innerHTML = `<div class="error-box">Error generating report: ${errMsg}</div>`;
            console.error('Generate report failed:', errMsg);
        }
    } catch (error) {
        console.error('Network or script error generating report:', error);
        reportContent.innerHTML = `<div class="error-box">Network error generating report. Check server is running.</div>`;
    } finally {
        reportBtn.forEach(b => b.disabled = false);
    }
}

// Load Data Summary
async function loadDataSummary() {
    try {
        const response = await fetch('/api/data-summary');
        const data = await response.json();
        
        document.getElementById('summaryTotal').textContent = data.total_records;
        document.getElementById('summaryDisease').textContent = data.disease_cases;
        document.getElementById('summaryHealthy').textContent = data.healthy_cases;
        document.getElementById('summaryBMI').textContent = data.avg_bmi;
        
        const featuresList = document.getElementById('featuresList');
        featuresList.innerHTML = '<ul>' + 
            data.columns.map(col => `<li>${col}</li>`).join('') + 
            '</ul>';
    } catch (error) {
        console.error('Error loading data summary:', error);
    }
}
