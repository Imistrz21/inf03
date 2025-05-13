let answeredQuestions = 0;
let totalQuestions = 0;

async function loadQuestions() {
    document.getElementById('loader').style.display = 'block';
    const response = await fetch('questions.json');
    let questions = await response.json();
    questions = questions.sort(() => 0.5 - Math.random());
    questions = questions.slice(0, 40);
    const form = document.getElementById('quizForm');
    totalQuestions = questions.length;
    form.dataset.totalQuestions = questions.length;
    questions.forEach((q, i) => {
        const qDiv = document.createElement('div');
        qDiv.className = 'question';
        const questionP = document.createElement('h3');
        questionP.textContent = `${i + 1}. ${q.title}`;
        qDiv.appendChild(questionP);
        q.answers.forEach((ans, j) => {
            const inputId = `q${i}_a${j}`;
            const wrapperDiv = document.createElement('div');
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = `question${i}`;
            input.id = inputId;
            input.value = ans.isCorrect;
            const label = document.createElement('label');
            label.setAttribute('for', inputId);
            label.textContent = ans.text;
            wrapperDiv.appendChild(input);
            wrapperDiv.appendChild(label);
            qDiv.appendChild(wrapperDiv);
        });
        if (q.image) {
            const img = document.createElement('img');
            img.src = q.image;
            img.alt = `Obraz do pytania ${q.number}`;
            img.style.maxWidth = '100%';
            img.style.margin = '10px 0';
            qDiv.appendChild(img);
        }
        form.appendChild(qDiv);
    });
    document.getElementById('loader').style.display = 'none';
    updateProgressBar();
}

function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function syncStorage() {
    let localResults = JSON.parse(localStorage.getItem('quizResults') || '[]');
    let cookieResults = getCookie('quizResults') ? JSON.parse(getCookie('quizResults')) : [];
    const allResults = [...localResults, ...cookieResults];
    const uniqueResults = [];
    const seen = new Set();
    allResults.forEach(result => {
        const key = `${result.date}_${result.percentage}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueResults.push(result);
        }
    });
    uniqueResults.sort((a, b) => new Date(a.date) - new Date(b.date));
    localStorage.setItem('quizResults', JSON.stringify(uniqueResults));
    setCookie('quizResults', JSON.stringify(uniqueResults), 30);
    return uniqueResults;
}

function checkAnswers() {
    document.getElementById('result').style.display = 'block';
    location.href = location.pathname + '#main';
    const form = document.getElementById('quizForm');
    const questions = form.querySelectorAll('.question');
    let correctCount = 0;
    questions.forEach((question, i) => {
        const inputs = question.querySelectorAll('input[type="radio"]');
        const labels = question.querySelectorAll('label');
        labels.forEach(label => {
            label.classList.remove('correct', 'incorrect');
        });
        let answered = false;
        inputs.forEach(input => {
            if (input.checked) {
                answered = true;
                if (input.value === "true") {
                    correctCount++;
                    input.nextElementSibling.classList.add('correct');
                } else {
                    input.nextElementSibling.classList.add('incorrect');
                }
            }
        });
        const header = question.querySelector('h3');
        if (header) header.style.color = answered ? '' : 'orange';
    });
    let percentage = (correctCount / questions.length) * 100;
    document.getElementById('result').innerHTML = `<h2>Twój wynik: ${correctCount} / ${questions.length} <h2 id="percentage">${percentage.toFixed(2)}%</h2></h2>`;
    if (percentage < 50) {
        document.getElementById('percentage').style.color = 'red';
    }
    saveResult(percentage);
}

function saveResult(percentage) {
    const results = syncStorage();
    const date = new Date().toISOString().split('T')[0];
    results.push({ date, percentage });
    localStorage.setItem('quizResults', JSON.stringify(results));
    setCookie('quizResults', JSON.stringify(results), 30);
}

function showProgressChart() {
    const popup = document.getElementById('popup');
    const overlay = document.getElementById('popupOverlay');
    popup.style.display = 'block';
    overlay.style.display = 'block';
    const canvas = document.getElementById('progressChart');
    const ctx = canvas.getContext('2d');
    const results = syncStorage();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (results.length === 0) {
        ctx.font = '16px Arial';
        ctx.fillText('Brak danych do wyświetlenia', 50, 200);
        return;
    }
    const maxPoints = results.length;
    const maxPercentage = 100;
    const padding = 60;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = canvas.height - padding - (i / 5) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
        ctx.fillStyle = 'black';
        ctx.fillText(`${(i * 20)}%`, padding - 30, y + 5);
    }
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    ctx.font = '16px Arial';
    ctx.fillText('Postępy w quizach', canvas.width / 2 - 50, padding - 20);
    ctx.font = '12px Arial';
    ctx.fillText('Wynik (%)', padding - 50, padding - 10);
    ctx.fillText('Data', canvas.width - padding + 10, canvas.height - padding + 20);
    const points = [];
    ctx.beginPath();
    results.forEach((result, i) => {
        const x = padding + (i / (maxPoints - 1)) * chartWidth;
        const y = canvas.height - padding - (result.percentage / maxPercentage) * chartHeight;
        points.push({ x, y, date: result.date, percentage: result.percentage });
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    const gradient = ctx.createLinearGradient(0, canvas.height - padding, 0, padding);
    gradient.addColorStop(0, 'red');
    gradient.addColorStop(1, 'green');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.stroke();
    results.forEach((result, i) => {
        const x = padding + (i / (maxPoints - 1)) * chartWidth;
        ctx.save();
        ctx.translate(x, canvas.height - padding + 20);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = 'black';
        ctx.fillText(result.date, 0, 0);
        ctx.restore();
    });
    let tooltip = null;
    canvas.onmousemove = function(e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        if (tooltip) {
            tooltip.remove();
            tooltip = null;
        }
        points.forEach(point => {
            const distance = Math.sqrt((mouseX - point.x) ** 2 + (mouseY - point.y) ** 2);
            if (distance < 10) {
                tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = `${point.date}: ${point.percentage.toFixed(2)}%`;
                tooltip.style.left = `${e.clientX + 10}px`;
                tooltip.style.top = `${e.clientY + 10}px`;
                document.body.appendChild(tooltip);
            }
        });
    };
    canvas.onmouseout = function() {
        if (tooltip) {
            tooltip.remove();
            tooltip = null;
        }
    };
}

function closePopup() {
    document.getElementById('popup').style.display = 'none';
    document.getElementById('popupOverlay').style.display = 'none';
}

function updateProgressBar() {
    const progressPercentage = (answeredQuestions / totalQuestions) * 100;
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = `${progressPercentage}%`;
    progressBar.textContent = `${Math.round(progressPercentage)}%`;
}
function updateAnsweredQuestions() {
    const form = document.getElementById('quizForm');
    const answered = new Set();
    const inputs = form.querySelectorAll('input[type="radio"]:checked');
    inputs.forEach(input => {
        const questionIndex = input.name.replace('question', '');
        answered.add(questionIndex);
    });
    answeredQuestions = answered.size;
    updateProgressBar();
}

document.addEventListener('DOMContentLoaded', function() {
    updateProgressBar();
    const form = document.getElementById('quizForm');
    form.addEventListener('change', updateAnsweredQuestions);
});
syncStorage();
loadQuestions();
