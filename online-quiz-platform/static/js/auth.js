document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('error-msg');
            
            try {
                const data = await api.post('/login', { email, password });
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = '/dashboard';
            } catch (err) {
                errorMsg.textContent = err.message;
                errorMsg.classList.remove('hidden');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;
            const errorMsg = document.getElementById('error-msg');
            
            try {
                await api.post('/register', { name, email, password, role });
                window.location.href = '/login';
            } catch (err) {
                errorMsg.textContent = err.message;
                errorMsg.classList.remove('hidden');
            }
        });
    }
});
