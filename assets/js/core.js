/* ================================================= */
/* TERA CORE */
/* ================================================= */
'use strict';

/* ================================================= */
/* APP CONFIG */
/* ================================================= */
const TERA = {
    version: '1.0.0',
    apiUrl: '/api',
    debug: true
};

/* ================================================= */
/* SELECTORS */
/* ================================================= */
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

/* ================================================= */
/* MISSING UTILITIES (تمت إضافتها لمنع الأخطاء) */
/* ================================================= */
const Storage = {
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    get(key) {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    },
    remove(key) {
        localStorage.removeItem(key);
    },
    clear() {
        localStorage.clear();
    }
};

function successAlert(message) {
    // يمكنك لاحقاً ربطها بمكتبة تنبيهات مخصصة
    alert('✅ ' + message);
}

function errorAlert(message) {
    // يمكنك لاحقاً ربطها بمكتبة تنبيهات مخصصة
    alert('❌ ' + message);
}

function initializeAlerts() {
    if (TERA.debug) console.log('Alerts Initialized');
}

function initializeModals() {
    if (TERA.debug) console.log('Modals Initialized');
}

/* ================================================= */
/* DOM READY */
/* ================================================= */
document.addEventListener('DOMContentLoaded', () => {
    initializeCore();
});

/* ================================================= */
/* INITIALIZE */
/* ================================================= */
function initializeCore() {
    loadComponents();
    initializeTooltips();
    initializeAlerts();
    initializeModals();
}

/* ================================================= */
/* COMPONENTS */
/* ================================================= */
function loadComponents() {
    loadComponent('#header-container', '../../components/header.html');
    loadComponent('#footer-container', '../../components/footer.html');
    loadComponent('#sidebar-container', '../../components/sidebar.html');
    loadComponent('#alerts-container', '../../components/alerts.html');
}

function loadComponent(selector, path) {
    const element = document.querySelector(selector);
    if (!element) return;

    fetch(path)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load component: ' + path);
            }
            return response.text();
        })
        .then(html => {
            element.innerHTML = html;
        })
        .catch(error => {
            console.error(error);
        });
}

/* ================================================= */
/* LOADER */
/* ================================================= */
function showLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
}

/* ================================================= */
/* DATE HELPERS */
/* ================================================= */
const DateHelper = {
    now() {
        return new Date();
    },
    today() {
        return new Date().toISOString().split('T')[0];
    },
    format(date) {
        return new Intl.DateTimeFormat('ar-SA').format(new Date(date));
    }
};

/* ================================================= */
/* API */
/* ================================================= */
const API = {
    async get(endpoint) {
        try {
            showLoader();
            const response = await fetch(`${TERA.apiUrl}${endpoint}`);
            return await response.json();
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            hideLoader();
        }
    },

    async post(endpoint, data) {
        try {
            showLoader();
            const response = await fetch(`${TERA.apiUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            hideLoader();
        }
    }
};

/* ================================================= */
/* FETCH WRAPPER */
/* ================================================= */
async function request(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

/* ================================================= */
/* USER SESSION */
/* ================================================= */
const Session = {
    setUser(user) {
        Storage.set('tera_user', user);
    },
    getUser() {
        return Storage.get('tera_user');
    },
    removeUser() {
        Storage.remove('tera_user');
    },
    isLoggedIn() {
        return !!Storage.get('tera_user');
    }
};

/* ================================================= */
/* PERMISSIONS */
/* ================================================= */
function hasPermission(permission) {
    const user = Session.getUser();
    if (!user || !user.permissions) {
        return false;
    }
    return user.permissions.includes(permission);
}

/* ================================================= */
/* LOGOUT */
/* ================================================= */
function logout() {
    Storage.clear();
    window.location.href = '/auth/login.html';
}

/* ================================================= */
/* COPY */
/* ================================================= */
function copyText(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            successAlert('تم النسخ بنجاح');
        })
        .catch(() => {
            errorAlert('فشل النسخ');
        });
}

/* ================================================= */
/* NUMBER FORMAT */
/* ================================================= */
function formatCurrency(value) {
    return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR'
    }).format(value);
}

/* ================================================= */
/* PERCENTAGE */
/* ================================================= */
function formatPercentage(value) {
    return `${value}%`;
}

/* ================================================= */
/* DOWNLOAD */
/* ================================================= */
function downloadFile(url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    link.remove();
}

/* ================================================= */
/* TOOLTIP */
/* ================================================= */
function initializeTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(element => {
        element.title = element.dataset.tooltip;
    });
}

/* ================================================= */
/* SCROLL */
/* ================================================= */
function scrollTopSmooth() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

/* ================================================= */
/* DEBUG */
/* ================================================= */
if (TERA.debug) {
    console.log('TERA Core Loaded Successfully');
}
