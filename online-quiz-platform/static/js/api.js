const API_BASE = '/api';

const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401 || response.status === 422) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return;
        }

        const data = await response.json().catch(() => ({}));
        
        if (!response.ok) {
            throw new Error(data.msg || 'API Error');
        }

        return data;
    },

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    async post(endpoint, body) {
        return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
    },

    async put(endpoint, body) {
        return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
    },

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

// Global utilities
function showLoader(elementId) {
    document.getElementById(elementId).classList.remove('hidden');
}

function hideLoader(elementId) {
    document.getElementById(elementId).classList.add('hidden');
}

function getUser() {
    return JSON.parse(localStorage.getItem('user') || 'null');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}
