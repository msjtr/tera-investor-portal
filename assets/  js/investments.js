// Investments

function filterInvestments() {

    const search =
    document.getElementById('searchInput');

    console.log(search?.value);

}

function viewInvestment(id) {

    window.location.href =
    `investment-details.html?id=${id}`;

}
