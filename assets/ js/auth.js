function login(token) {

    localStorage.setItem(
        'investorToken',
        token
    );

    window.location.href =
    '../pages/dashboard/index.html';

}

function logout() {

    localStorage.removeItem(
        'investorToken'
    );

    window.location.href =
    '../auth/login.html';

}
