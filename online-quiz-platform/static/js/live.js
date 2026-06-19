// Confetti function
function shootConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = [];
    const colors = ['#8B5CF6', '#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
    
    for (let i = 0; i < 200; i++) {
        pieces.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            w: Math.random() * 10 + 5,
            h: Math.random() * 10 + 5,
            c: colors[Math.floor(Math.random() * colors.length)],
            sx: Math.random() * 6 - 3,
            sy: Math.random() * 4 + 3,
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

class LiveQuizSession {
    constructor(roomCode, isHost, containerId) {
        this.roomCode = roomCode;
        this.isHost = isHost;
        this.container = document.getElementById(containerId);
        this.socket = null;
        this.sessionData = null;
        this.user = getUser();
        this.currentQuestionIndex = -1;
        this.timeLeft = 0;
        this.timerInterval = null;
        this.totalDuration = 0;
        this.nicknameSet = false;
    }

    async init() {
        if (!this.isHost && !this.nicknameSet) {
            this.promptNickname();
            return;
        }

        try {
            this.sessionData = await api.get(`/live/${this.roomCode}`);
            this.connectSocket();
            if (this.isHost) {
                this.renderHostWaitingRoom();
            } else {
                this.renderPlayerWaitingRoom();
            }
        } catch (err) {
            this.container.innerHTML = `<p style="color:var(--color-danger); text-align:center;">Error loading live session. Ensure the room code is correct.</p>`;
        }
    }

    promptNickname() {
        this.container.innerHTML = `
            <div class="card animate-in" style="max-width: 440px; margin: 0 auto; text-align: center;">
                <h2 style="margin-bottom: 10px; font-size: 2rem;">Join Game</h2>
                <p style="color: var(--color-text-secondary); margin-bottom: 30px;">Enter a nickname to appear on screen.</p>
                <input type="text" id="nickname-input" placeholder="AwesomeNickname" style="width: 100%; padding: 20px; font-size: 1.5rem; text-align: center; border-radius: var(--radius-sm); border: 1px solid var(--color-border); background: rgba(0,0,0,0.3); color: white; margin-bottom: 20px;">
                <button class="btn btn-primary" style="width: 100%; padding: 20px; font-size: 1.2rem;" onclick="liveSession.setNickname()">Join</button>
            </div>
        `;
    }

    setNickname() {
        const name = document.getElementById('nickname-input').value.trim();
        if (name) {
            this.user = { name: name, role: 'Guest' };
            this.nicknameSet = true;
            this.init();
        }
    }

    connectSocket() {
        this.socket = io({ transports: ['websocket'] });
        
        this.socket.on('connect', () => {
            this.socket.emit('join', { username: this.user.name, room: this.roomCode, is_host: this.isHost });
        });

        this.socket.on('update_leaderboard', (data) => {
            this.updateLeaderboard(data.participants);
        });

        this.socket.on('new_question', (data) => {
            this.currentQuestionIndex = data.question_index;
            const durationStr = data.question.time_limit || "30s";
            this.totalDuration = parseInt(durationStr.replace('s', ''));
            
            if (this.isHost) {
                this.renderHostQuestion(data.question);
            } else {
                this.renderPlayerQuestion(data.question);
            }
            
            this.startTimer(data.question.time_limit);
        });

        this.socket.on('show_results', (data) => {
            clearInterval(this.timerInterval);
            if (this.isHost) {
                this.renderHostQuestionResults(data.leaderboard);
            } else {
                this.renderPlayerWait();
            }
        });

        this.socket.on('quiz_finished', (data) => {
            clearInterval(this.timerInterval);
            shootConfetti();
            if (this.isHost) {
                this.renderHostFinalLeaderboard(data.leaderboard);
            } else {
                this.renderPlayerFinal(data.leaderboard);
            }
        });
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timeLeft = this.totalDuration;
        this.updateTimerUI();

        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateTimerUI();
            if (this.timeLeft <= 0) {
                clearInterval(this.timerInterval);
                if(this.isHost) {
                    this.showResults();
                }
            }
        }, 1000);
    }

    updateTimerUI() {
        const circle = document.getElementById('timer-circle');
        const text = document.getElementById('timer-text');
        if (!circle || !text) return;

        text.textContent = this.timeLeft;
        
        const circumference = 2 * Math.PI * 54;
        const offset = circumference - (this.timeLeft / this.totalDuration) * circumference;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = offset;

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

    renderHostWaitingRoom() {
        this.container.innerHTML = `
            <div class="animate-in" style="text-align:center;">
                <p style="font-family: var(--font-display); font-weight: 700; letter-spacing: 2px; color: var(--color-text-secondary); margin-bottom: 10px;">JOIN AT</p>
                <h1 style="font-size: 2rem; margin-bottom: 20px;">localhost:5001</h1>
                <div class="card" style="display: inline-block; padding: 20px 60px; margin-bottom: 40px; border: 4px dashed var(--color-border);">
                    <h2 style="font-size: 6rem; letter-spacing: 10px; margin: 0; line-height: 1;" class="text-gradient-primary">${this.roomCode}</h2>
                </div>
                
                <div style="display:flex; flex-wrap:wrap; gap:16px; justify-content:center; margin: 0 auto 40px auto; max-width: 800px; min-height: 100px;" id="participants-list">
                    <p style="color: var(--color-text-secondary); width: 100%;">Waiting for players...</p>
                </div>
                
                <button class="btn btn-primary" style="font-size:1.5rem; padding: 20px 60px; border-radius: 50px;" onclick="liveSession.startQuiz()">Start Game</button>
            </div>
        `;
    }

    renderPlayerWaitingRoom() {
        this.container.innerHTML = `
            <div class="card animate-in" style="text-align:center; max-width: 400px; margin: 0 auto; background: var(--color-bg-card);">
                <h2 style="font-size: 2.5rem; margin-bottom: 10px; color: var(--color-text-primary);">You're in!</h2>
                <p style="color: var(--color-text-secondary); margin-bottom: 30px; font-size: 1.2rem;">See your nickname on screen</p>
                <div class="loader"></div>
            </div>
        `;
    }

    updateLeaderboard(participants) {
        if (this.isHost && this.currentQuestionIndex === -1) {
            const list = document.getElementById('participants-list');
            if (list) {
                if(participants.length === 0) {
                    list.innerHTML = '<p style="color: var(--color-text-secondary); width: 100%;">Waiting for players...</p>';
                } else {
                    list.innerHTML = participants.map(p => `
                        <div class="animate-in" style="background:var(--color-bg-card); border: 2px solid var(--color-border); color:var(--color-text-primary); padding:12px 24px; border-radius:30px; font-weight:800; font-family: var(--font-sans); font-size: 1.2rem; box-shadow: var(--shadow-sm);">
                            ${p.name}
                        </div>
                    `).join('');
                }
            }
        }
    }

    startQuiz() {
        this.socket.emit('start_quiz', { room: this.roomCode });
    }

    showResults() {
        this.socket.emit('show_results', { room: this.roomCode });
    }
    renderHostQuestion(q) {
        const shapes = [
            '<svg class="shape-icon" viewBox="0 0 32 32"><polygon points="16,4 4,28 28,28"/></svg>', // Triangle
            '<svg class="shape-icon" viewBox="0 0 32 32"><polygon points="16,4 4,16 16,28 28,16"/></svg>', // Diamond
            '<svg class="shape-icon" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12"/></svg>', // Circle
            '<svg class="shape-icon" viewBox="0 0 32 32"><rect x="6" y="6" width="20" height="20"/></svg>' // Square
        ];
        let optionsHtml = '';
        q.options.forEach((opt, idx) => {
            optionsHtml += `
                <div class="option-btn opt-${idx % 4}" style="cursor: default; pointer-events: none;">
                    ${shapes[idx % 4]}
                    <span class="option-text">${opt}</span>
                </div>
            `;
        });

        this.container.innerHTML = `
            <div class="animate-in" style="text-align: center; max-width: 1000px; margin: 0 auto;">
                <div class="timer-container">
                    <svg class="timer-svg" viewBox="0 0 120 120">
                        <circle class="timer-circle-bg" cx="60" cy="60" r="54"></circle>
                        <circle id="timer-circle" class="timer-circle" cx="60" cy="60" r="54"></circle>
                    </svg>
                    <div id="timer-text" class="timer-text">--</div>
                </div>

                <h1 style="font-size: clamp(2.5rem, 5vw, 4rem); margin-bottom: 60px; line-height: 1.2; color: var(--color-text-primary);">${q.question_text}</h1>
                
                <div class="quiz-options">
                    ${optionsHtml}
                </div>
                
                <button class="btn btn-secondary" style="margin-top: 40px;" onclick="liveSession.showResults()">Skip Time</button>
            </div>
        `;
    }
    renderPlayerQuestion(q) {
        const shapes = [
            '<svg class="shape-icon" viewBox="0 0 32 32"><polygon points="16,4 4,28 28,28"/></svg>',
            '<svg class="shape-icon" viewBox="0 0 32 32"><polygon points="16,4 4,16 16,28 28,16"/></svg>',
            '<svg class="shape-icon" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12"/></svg>',
            '<svg class="shape-icon" viewBox="0 0 32 32"><rect x="6" y="6" width="20" height="20"/></svg>'
        ];
        let optionsHtml = '';
        q.options.forEach((opt, idx) => {
            optionsHtml += `
                <button class="option-btn opt-${idx % 4}" onclick="liveSession.submitAnswer('${opt.replace(/'/g, "\\'").replace(/"/g, "&quot;")}')">
                    ${shapes[idx % 4]}
                    <span class="option-text">${opt}</span>
                </button>
            `;
        });

        this.container.innerHTML = `
            <div class="animate-in" style="text-align: center; max-width: 1000px; margin: 0 auto;">
                <div class="timer-container" style="width: 80px; height: 80px; margin-bottom: 20px;">
                    <svg class="timer-svg" viewBox="0 0 120 120">
                        <circle class="timer-circle-bg" cx="60" cy="60" r="54"></circle>
                        <circle id="timer-circle" class="timer-circle" cx="60" cy="60" r="54"></circle>
                    </svg>
                    <div id="timer-text" class="timer-text" style="font-size: 1.5rem;">--</div>
                </div>
                
                <h1 style="font-size: clamp(2.5rem, 5vw, 4rem); margin-bottom: 60px; line-height: 1.2; color: var(--color-text-primary);">${q.question_text}</h1>

                <div class="quiz-options">
                    ${optionsHtml}
                </div>
            </div>
        `;
    }

    submitAnswer(ans) {
        this.socket.emit('submit_answer', {
            room: this.roomCode,
            username: this.user.name,
            question_index: this.currentQuestionIndex,
            answer: ans,
            time_taken: this.totalDuration - this.timeLeft
        });
        
        this.container.innerHTML = `
            <div class="card animate-in" style="text-align:center; max-width: 400px; margin: 0 auto; border-color: rgba(255,255,255,0.2);">
                <h2 style="margin-bottom: 15px;">Answer Sent!</h2>
                <p style="color: var(--color-text-secondary);">Waiting for others...</p>
                <div class="loader"></div>
            </div>
        `;
    }

    renderPlayerWait() {
        this.container.innerHTML = `
            <div class="card animate-in" style="text-align:center; max-width: 400px; margin: 0 auto;">
                <h2>Look up!</h2>
                <p style="color: var(--color-text-secondary);">Results are on the screen</p>
            </div>
        `;
    }

    renderHostQuestionResults(leaderboard) {
        let rows = '';
        leaderboard.slice(0, 5).forEach((p, idx) => {
            rows += `
                <div style="display:flex; justify-content:space-between; padding: 20px 30px; background: rgba(255,255,255,0.05); margin-bottom: 10px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); align-items: center;">
                    <div style="display:flex; align-items:center; gap: 20px;">
                        <span style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: var(--color-text-secondary); width: 30px;">${idx+1}</span>
                        <span style="font-size: 1.5rem; font-weight: 600;">${p.name}</span>
                    </div>
                    <span style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 700;">${p.score} <span style="font-size: 1rem; color: var(--color-text-secondary);">pts</span></span>
                </div>
            `;
        });

        this.container.innerHTML = `
            <div class="animate-in" style="max-width: 800px; margin: 0 auto;">
                <h2 style="font-size: 3rem; text-align: center; margin-bottom: 40px;">Current Standings</h2>
                ${rows}
                <div style="text-align:center; margin-top: 50px;">
                    <button class="btn btn-primary" style="font-size: 1.5rem; padding: 20px 60px; border-radius: 50px;" onclick="liveSession.socket.emit('next_question', {room: liveSession.roomCode, question_index: liveSession.currentQuestionIndex + 1})">Next Question</button>
                </div>
            </div>
        `;
    }

    renderHostFinalLeaderboard(leaderboard) {
        let podiumHtml = '';
        if(leaderboard.length > 0) {
            // Gold
            if(leaderboard[0]) {
                podiumHtml += `<div class="podium-place podium-1 delay-2 animate-in"><div class="avatar" style="border-color: #FACC15; background: rgba(250,204,21,0.2); color: #FACC15;">1</div><div style="font-family:var(--font-display); font-weight:700; font-size:1.5rem; margin-top:20px;">${leaderboard[0].name}</div><div style="color:var(--color-text-secondary)">${leaderboard[0].score}</div></div>`;
            }
            // Silver
            if(leaderboard[1]) {
                podiumHtml = `<div class="podium-place podium-2 delay-1 animate-in"><div class="avatar" style="border-color: #94A3B8; background: rgba(148,163,184,0.2); color: #94A3B8;">2</div><div style="font-family:var(--font-display); font-weight:700; font-size:1.2rem; margin-top:20px;">${leaderboard[1].name}</div><div style="color:var(--color-text-secondary)">${leaderboard[1].score}</div></div>` + podiumHtml;
            }
            // Bronze
            if(leaderboard[2]) {
                podiumHtml += `<div class="podium-place podium-3 delay-3 animate-in"><div class="avatar" style="border-color: #B45309; background: rgba(180,83,9,0.2); color: #B45309;">3</div><div style="font-family:var(--font-display); font-weight:700; font-size:1.2rem; margin-top:20px;">${leaderboard[2].name}</div><div style="color:var(--color-text-secondary)">${leaderboard[2].score}</div></div>`;
            }
        }

        this.container.innerHTML = `
            <div class="animate-in" style="max-width: 800px; margin: 0 auto; text-align: center;">
                <h1 style="font-size: 4rem; margin-bottom: 20px;" class="text-gradient-primary">Final Podium</h1>
                <div class="podium-container">
                    ${podiumHtml}
                </div>
                <div style="margin-top: 60px;">
                    <a href="/dashboard" class="btn btn-secondary">Back to Dashboard</a>
                </div>
            </div>
        `;
    }

    renderPlayerFinal(leaderboard) {
        const myRank = leaderboard.findIndex(p => p.name === this.user.name) + 1;
        this.container.innerHTML = `
            <div class="card animate-in" style="text-align:center; max-width: 400px; margin: 0 auto;">
                <h2 style="font-size: 2.5rem; margin-bottom: 10px; color: var(--color-text-primary);">Game Over!</h2>
                ${myRank > 0 ? `<h1 class="text-gradient-primary" style="font-size: 5rem; margin: 20px 0;">#${myRank}</h1>` : ''}
                <p style="color: var(--color-text-secondary); margin-bottom: 30px;">Check the main screen for the podium.</p>
                <a href="/" class="btn btn-primary" style="width: 100%;">Leave Game</a>
            </div>
        `;
    }
}
