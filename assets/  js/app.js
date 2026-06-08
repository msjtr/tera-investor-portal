// App Initialization

document.addEventListener('DOMContentLoaded', () => {
    console.log('TERA Investor Portal Loaded');
});

// Logout

function logout() {
    localStorage.removeItem('investorToken');
    window.location.href = '../../auth/login.html';
}

// Format Currency

function formatCurrency(amount) {
    return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR'
    }).format(amount);
}
