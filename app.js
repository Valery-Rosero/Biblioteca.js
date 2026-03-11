const API_BASE = 'http://localhost:3000';

let accessToken = null;
let refreshToken = null;
let currentEmail = null;

// Elementos del DOM
const loginContainer = document.getElementById('login-container');
const step1 = document.getElementById('login-step1');
const step2 = document.getElementById('login-step2');
const dashboardEst = document.getElementById('dashboard-estudiante');
const dashboardAdm = document.getElementById('dashboard-admin');
const formStep1 = document.getElementById('form-step1');
const formStep2 = document.getElementById('form-step2');
const logoutEstBtn = document.getElementById('logout-est');
const logoutAdmBtn = document.getElementById('logout-adm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const codigoInput = document.getElementById('codigo');

// Event listeners
formStep1.addEventListener('submit', handleStep1);
formStep2.addEventListener('submit', handleStep2);
logoutEstBtn.addEventListener('click', logout);
logoutAdmBtn.addEventListener('click', logout);

// Función para mostrar elemento con animación
function showElement(element) {
    element.classList.remove('hidden');
    setTimeout(() => element.classList.add('fade-in'), 10);
}

// Función para ocultar elemento con animación
function hideElement(element) {
    element.classList.remove('fade-in');
    setTimeout(() => element.classList.add('hidden'), 300);
}

// Función para mostrar mensajes
function showMessage(elementId, message, isError = false) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.style.color = isError ? '#ff6b6b' : '#4CAF50';
    if (message) {
        element.classList.add('show');
    } else {
        element.classList.remove('show');
    }
}

// Paso 1: Enviar email y password
async function handleStep1(e) {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    currentEmail = email;

    try {
        const response = await fetch(`${API_BASE}/login-paso1`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('message-step1', data.message);
            hideElement(step1);
            setTimeout(() => showElement(step2), 300);
        } else {
            showMessage('message-step1', data.message, true);
        }
    } catch (error) {
        showMessage('message-step1', 'Error de conexión', true);
    }
}

// Paso 2: Verificar código
async function handleStep2(e) {
    e.preventDefault();
    const email = currentEmail;
    const codigo = codigoInput.value;

    try {
        const response = await fetch(`${API_BASE}/login-paso2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, codigo })
        });

        const data = await response.json();

        if (response.ok) {
            accessToken = data.accessToken;
            refreshToken = data.refreshToken;
            showMessage('message-step2', 'Login exitoso');
            hideElement(step2);
            setTimeout(() => loadDashboard(), 300);
        } else {
            showMessage('message-step2', data.message, true);
        }
    } catch (error) {
        showMessage('message-step2', 'Error de conexión', true);
    }
}

// Cargar dashboard según rol
async function loadDashboard() {
    try {
        // Decodificar token para obtener rol
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const role = payload.role;

        hideElement(loginContainer);
        if (role === 'estudiante') {
            setTimeout(() => {
                const response = fetch(`${API_BASE}/mi-espacio`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                }).then(r => r.json()).then(data => {
                    if (data.librosPrestados) {
                        displayLibros(data.librosPrestados, 'libros-prestados');
                        showElement(dashboardEst);
                    }
                });
            }, 300);
        } else if (role === 'admin') {
            setTimeout(() => {
                const response = fetch(`${API_BASE}/dashboard-admin`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                }).then(r => r.json()).then(data => {
                    if (data.inventario) {
                        displayLibros(data.inventario, 'inventario');
                        showElement(dashboardAdm);
                    }
                });
            }, 300);
        }
    } catch (error) {
        console.error('Error cargando dashboard:', error);
    }
}

// Mostrar lista de libros
function displayLibros(libros, listId) {
    const list = document.getElementById(listId);
    list.innerHTML = '';
    libros.forEach(libro => {
        const li = document.createElement('li');
        li.textContent = libro;
        list.appendChild(li);
    });
}

// Manejar errores de token
async function handleTokenError(response) {
    if (response.status === 401) {
        const refreshResponse = await fetch(`${API_BASE}/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });

        if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            accessToken = data.accessToken;
            loadDashboard();
        } else {
            logout();
        }
    }
}

// Cerrar sesión
function logout() {
    accessToken = null;
    refreshToken = null;
    currentEmail = null;
    hideElement(dashboardEst);
    hideElement(dashboardAdm);
    setTimeout(() => {
        showElement(loginContainer);
        showElement(step1);
    }, 300);
    emailInput.value = '';
    passwordInput.value = '';
    codigoInput.value = '';
    showMessage('message-step1', '');
    showMessage('message-step2', '');
}