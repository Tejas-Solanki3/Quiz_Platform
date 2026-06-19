// Confetti function
function shootConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = [];
    const colors = ['#8B5CF6', '#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
    
    for (let i = 0; i < 150; i++) {
        pieces.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            w: Math.random() * 10 + 5,
            h: Math.random() * 10 + 5,
            c: colors[Math.floor(Math.random() * colors.length)],
            sx: Math.random() * 4 - 2,
            sy: Math.random() * 4 + 2,
            r: Math.random() * 360,
            rs: Math.random() * 10 - 5
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = false;
        for (let p of pieces) {
            p.y += p.sy;
            p.x += p.sx;
            p.r += p.rs;
            if (p.y < canvas.height) active = true;
            
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.r * Math.PI / 180);
            ctx.fillStyle = p.c;
            ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
            ctx.restore();
        }
        if (active) requestAnimationFrame(animate);
    }
    animate();
}

class QuizSession {
    constructor(quizId, containerId) {
        this.quizId = quizId;
        this.container = document.getElementById(containerId);
        this.quiz = null;
        this.currentQuestionIndex = 0;
        this.answers = {};
        this.timeLeft = 0;
        this.timerInterval = null;
        this.totalDuration = 0;
    }

    async init() {
        try {
            this.quiz = await api.get(`/quizzes/${this.quizId}`);
            if (!this.quiz.questions || this.quiz.questions.length === 0) {
                this.container.innerHTML = `<p style="color:var(--color-warning);">This quiz has no questions.</p>`;
                return;
            }
            this.renderQuestion();
        } catch (err) {
            this.container.innerHTML = `<p style="color:var(--color-danger);">Error loading quiz</p>`;
        }
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        const durationStr = this.quiz.questions[this.currentQuestionIndex].time_limit || "30s";
        this.totalDuration = parseInt(durationStr.replace('s', ''));
        this.timeLeft = this.totalDuration;
        this.updateTimerUI();

        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateTimerUI();
            if (this.timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.handleTimeout();
            }
        }, 1000);
    }

    updateTimerUI() {
        const circle = document.getElementById('timer-circle');
        const text = document.getElementById('timer-text');
        if (!circle || !text) return;

        text.textContent = this.timeLeft;
        
        const circumference = 2 * Math.PI * 54; // r=54
        const offset = circumference - (this.timeLeft / this.totalDuration) * circumference;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = offset;

        // Color transition
        if (this.timeLeft <= 5) {
            circle.style.stroke = 'var(--color-danger)';
            text.style.color = 'var(--color-danger)';
        } else if (this.timeLeft <= 10) {
            circle.style.stroke = 'var(--color-warning)';
            text.style.color = 'var(--color-warning)';
        } else {
            circle.style.stroke = 'var(--color-primary)';
            text.style.color = 'var(--color-text-primary)';
        }
    }

    handleTimeout() {
        if (!this.answers[this.currentQuestionIndex]) {
            this.answers[this.currentQuestionIndex] = null;
        }
        this.nextQuestion();
    }

    renderQuestion() {
        const q = this.quiz.questions[this.currentQuestionIndex];
        const shapes = [
            '<svg class="shape-icon" viewBox="0 0 32 32"><polygon points="16,4 4,28 28,28"/></svg>',
            '<svg class="shape-icon" viewBox="0 0 32 32"><polygon points="16,4 4,16 16,28 28,16"/></svg>',
            '<svg class="shape-icon" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12"/></svg>',
            '<svg class="shape-icon" viewBox="0 0 32 32"><rect x="6" y="6" width="20" height="20"/></svg>'
        ];
        let optionsHtml = '';
        q.options.forEach((opt, idx) => {
            const isSelected = this.answers[this.currentQuestionIndex] === opt;
            const selectedStyle = isSelected ? 'border: 4px solid white; transform: scale(1.02);' : '';
            optionsHtml += `
                <button class="option-btn opt-${idx % 4}" style="${selectedStyle}" onclick="quizSession.selectAnswer('${opt.replace(/'/g, "\\'")}')">
                    ${shapes[idx % 4]}
                    <span class="option-text">${opt}</span>
                </button>
            `;
        });

        this.container.innerHTML = `
            <div class="animate-in" style="max-width: 800px; margin: 0 auto; text-align: center;">
                <p style="color: var(--color-text-secondary); font-family: var(--font-display); font-weight: 700; letter-spacing: 2px; margin-bottom: 30px;">
                    QUESTION ${this.currentQuestionIndex + 1} OF ${this.quiz.questions.length}
                </p>
                
                <div class="timer-container">
                    <svg class="timer-svg" viewBox="0 0 120 120">
                        <circle class="timer-circle-bg" cx="60" cy="60" r="54"></circle>
                        <circle id="timer-circle" class="timer-circle" cx="60" cy="60" r="54"></circle>
                    </svg>
                    <div id="timer-text" class="timer-text">--</div>
                </div>

                <h2 style="font-size: clamp(2rem, 5vw, 3rem); line-height: 1.2; margin-bottom: 40px; color: var(--color-text-primary);">${q.question_text}</h2>
                
                <div class="quiz-options">
                    ${optionsHtml}
                </div>

                <div style="margin-top: 50px; display: flex; justify-content: space-between;">
                    <button class="btn btn-secondary" ${this.currentQuestionIndex === 0 ? 'style="visibility:hidden"' : ''} onclick="quizSession.prevQuestion()">Previous</button>
                    ${this.currentQuestionIndex === this.quiz.questions.length - 1 ? 
                        `<button class="btn btn-primary" style="padding: 14px 40px; font-size: 1.2rem;" onclick="quizSession.submitQuiz()">Finish</button>` : 
                        `<button class="btn btn-primary" onclick="quizSession.nextQuestion()">Next</button>`
                    }
                </div>
            </div>
        `;
        this.startTimer();
    }

    selectAnswer(ans) {
        this.answers[this.currentQuestionIndex] = ans;
        this.renderQuestion();
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.quiz.questions.length - 1) {
            this.currentQuestionIndex++;
            this.renderQuestion();
        }
    }

    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.renderQuestion();
        }
    }

    async submitQuiz() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.container.innerHTML = `<div class="loader"></div><p style="text-align:center; color:var(--color-text-secondary); margin-top:20px;">Analyzing results...</p>`;
        
        try {
            const result = await api.post('/results', {
                quiz_id: this.quizId,
                answers: this.answers
            });
            
            shootConfetti();
            
            this.container.innerHTML = `
                <div class="card animate-in" style="text-align:center; max-width: 500px; margin: 0 auto; border-top: 4px solid var(--color-primary);">
                    <h2 style="font-size: 3rem; margin-bottom: 10px; color: var(--color-text-primary);">Quiz Complete!</h2>
                    <h1 class="text-gradient-primary" style="font-size: 5rem; margin-bottom: 10px;">${result.percentage.toFixed(0)}%</h1>
                    <p style="font-size: 1.2rem; color: var(--color-text-secondary); margin-bottom: 30px;">You scored ${result.score} out of ${this.quiz.questions.length}</p>
                    <div style="display:flex; gap:10px; justify-content:center;">
                        <a href="/results/${result._id}" class="btn btn-primary">Review Answers</a>
                        <a href="/dashboard" class="btn btn-secondary">Dashboard</a>
                    </div>
                </div>
            `;
        } catch (err) {
            this.container.innerHTML = `<p style="color:var(--color-danger); text-align:center;">Failed to submit quiz: ${err.message}</p>`;
        }
    }
}
