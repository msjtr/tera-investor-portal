/* ================================================= */
/* TERA REGISTER PAGE */
/* ================================================= */

document.addEventListener('DOMContentLoaded', () => {

let currentStep = 1;
const totalSteps = 4;

const nextBtn =
document.getElementById('nextBtn');

const prevBtn =
document.getElementById('prevBtn');

const submitBtn =
document.getElementById('submitBtn');

/* ================================================ */
/* STEP CONTROL */
/* ================================================ */

function showStep(step){

document
.querySelectorAll('.form-step')
.forEach(section => {

section.classList.remove('active');

});

document
.getElementById(`step${step}`)
.classList.add('active');

document
.querySelectorAll('.step')
.forEach(item => {

item.classList.remove('active');

});

document
.querySelector(`.step[data-step="${step}"]`)
.classList.add('active');

prevBtn.style.display =
step === 1
? 'none'
: 'inline-flex';

if(step === totalSteps){

nextBtn.classList.add('d-none');
submitBtn.classList.remove('d-none');

}else{

nextBtn.classList.remove('d-none');
submitBtn.classList.add('d-none');

}

}

showStep(currentStep);

/* ================================================ */
/* NEXT */
/* ================================================ */

nextBtn.addEventListener('click', () => {

if(!validateStep(currentStep)){
return;
}

currentStep++;

if(currentStep > totalSteps){
currentStep = totalSteps;
}

showStep(currentStep);

});

/* ================================================ */
/* PREVIOUS */
/* ================================================ */

prevBtn.addEventListener('click', () => {

currentStep--;

if(currentStep < 1){
currentStep = 1;
}

showStep(currentStep);

});

/* ================================================ */
/* BASIC VALIDATION */
/* ================================================ */

function validateStep(step){

if(step === 1){

const username =
document.getElementById('username');

const email =
document.getElementById('email');

const confirmEmail =
document.getElementById('confirmEmail');

const password =
document.getElementById('password');

const confirmPassword =
document.getElementById('confirmPassword');

if(username.value.trim() === ''){
alert('يرجى إدخال اسم المستخدم');
username.focus();
return false;
}

if(email.value.trim() === ''){
alert('يرجى إدخال البريد الإلكتروني');
email.focus();
return false;
}

if(email.value !== confirmEmail.value){
alert('البريد الإلكتروني غير متطابق');
return false;
}

if(password.value !== confirmPassword.value){
alert('كلمة المرور غير متطابقة');
return false;
}

}

if(step === 2){

const fullNameAr =
document.getElementById('fullNameAr');

const fullNameEn =
document.getElementById('fullNameEn');

const category =
document.getElementById('accountCategory');

if(fullNameAr.value.trim() === ''){
alert('أدخل الاسم بالعربية');
return false;
}

if(fullNameEn.value.trim() === ''){
alert('أدخل الاسم بالإنجليزية');
return false;
}

if(category.value === ''){
alert('اختر الفئة');
return false;
}

}

if(step === 3){

const mobile =
document.getElementById('mobileNumber');

if(mobile.value.trim() === ''){
alert('أدخل رقم الجوال');
return false;
}

}

return true;

}

/* ================================================ */
/* PASSWORD SHOW / HIDE */
/* ================================================ */

const showPassword =
document.getElementById('showPassword');

const showConfirmPassword =
document.getElementById('showConfirmPassword');

showPassword?.addEventListener('change', () => {

const password =
document.getElementById('password');

password.type =
showPassword.checked
? 'text'
: 'password';

});

showConfirmPassword?.addEventListener('change', () => {

const confirmPassword =
document.getElementById('confirmPassword');

confirmPassword.type =
showConfirmPassword.checked
? 'text'
: 'password';

});
    /* ================================================ */
/* PASSWORD STRENGTH */
/* ================================================ */

const passwordInput =
document.getElementById('password');

const confirmPasswordInput =
document.getElementById('confirmPassword');

const passwordStrength =
document.getElementById('passwordStrength');

const passwordMatchStatus =
document.getElementById('passwordMatchStatus');

passwordInput?.addEventListener('input', () => {

const value = passwordInput.value;

let score = 0;

if(value.length >= 8){
score++;
document.getElementById('passRule1')
?.classList.add('valid');
}

if(/[A-Z]/.test(value)){
score++;
document.getElementById('passRule2')
?.classList.add('valid');
}

if(/[a-z]/.test(value)){
score++;
document.getElementById('passRule3')
?.classList.add('valid');
}

if(/[0-9]/.test(value)){
score++;
document.getElementById('passRule4')
?.classList.add('valid');
}

if(/[^A-Za-z0-9]/.test(value)){
score++;
document.getElementById('passRule5')
?.classList.add('valid');
}

/* Strength */

passwordStrength.className = '';

if(score <= 2){

passwordStrength.innerHTML =
'🔴 ضعيفة';

passwordStrength.classList
.add('password-weak');

}

else if(score === 3){

passwordStrength.innerHTML =
'🟠 متوسطة';

passwordStrength.classList
.add('password-medium');

}

else if(score === 4){

passwordStrength.innerHTML =
'🟢 قوية';

passwordStrength.classList
.add('password-strong');

}

else{

passwordStrength.innerHTML =
'🟢 قوية جداً';

passwordStrength.classList
.add('password-very-strong');

}

checkPasswordMatch();

});

/* ================================================ */
/* PASSWORD MATCH */
/* ================================================ */

confirmPasswordInput?.addEventListener(
'input',
checkPasswordMatch
);

function checkPasswordMatch(){

if(
passwordInput.value === '' ||
confirmPasswordInput.value === ''
){
return;
}

if(
passwordInput.value ===
confirmPasswordInput.value
){

passwordMatchStatus.innerHTML =
'✔ كلمة المرور متطابقة';

passwordMatchStatus.className =
'match-status valid';

}else{

passwordMatchStatus.innerHTML =
'✖ كلمة المرور غير متطابقة';

passwordMatchStatus.className =
'match-status invalid';

}

}

/* ================================================ */
/* USERNAME VALIDATION */
/* ================================================ */

const username =
document.getElementById('username');

username?.addEventListener('input', () => {

let value =
username.value.trim();

value =
value.replace(/[^a-zA-Z0-9]/g,'');

username.value = value;

const validLength =
value.length >= 4 &&
value.length <= 20;

const validChars =
/^[A-Za-z0-9]+$/.test(value);

document
.getElementById('userRule1')
?.classList.toggle(
'valid',
validLength
);

document
.getElementById('userRule2')
?.classList.toggle(
'valid',
validChars
);

document
.getElementById('userRule3')
?.classList.toggle(
'valid',
validChars
);

document
.getElementById('userRule4')
?.classList.add('valid');

document
.getElementById('userRule5')
?.classList.add('valid');

});

/* ================================================ */
/* EMAIL VALIDATION */
/* ================================================ */

const email =
document.getElementById('email');

const confirmEmail =
document.getElementById('confirmEmail');

confirmEmail?.addEventListener('input', () => {

if(
email.value &&
confirmEmail.value
){

if(
email.value ===
confirmEmail.value
){

confirmEmail.style.borderColor =
'#16a34a';

}else{

confirmEmail.style.borderColor =
'#dc2626';

}

}

});

/* ================================================ */
/* MOBILE CLEANUP */
/* ================================================ */

const mobileNumber =
document.getElementById('mobileNumber');

mobileNumber?.addEventListener(
'input',
() => {

let value =
mobileNumber.value;

value =
value.replace(/\D/g,'');

if(value.startsWith('0')){
value = value.substring(1);
}

mobileNumber.value = value;

}
);

                          /* ================================================ */
/* CATEGORY SWITCHING */
/* ================================================ */

const accountCategory =
document.getElementById('accountCategory');

const saudiFields =
document.getElementById('saudiFields');

const residentFields =
document.getElementById('residentFields');

const gccFields =
document.getElementById('gccFields');

const foreignFields =
document.getElementById('foreignFields');

const nationalAddressWrapper =
document.getElementById('nationalAddressWrapper');

const internationalAddressWrapper =
document.getElementById('internationalAddressWrapper');

accountCategory?.addEventListener(
'change',
() => {

hideAllIdentitySections();

const category =
accountCategory.value;

switch(category){

case 'saudi':

saudiFields.classList.remove('d-none');

nationalAddressWrapper
.classList.remove('d-none');

internationalAddressWrapper
.classList.add('d-none');

setSaudiCode();

break;

case 'resident':

residentFields.classList.remove('d-none');

nationalAddressWrapper
.classList.remove('d-none');

internationalAddressWrapper
.classList.add('d-none');

setSaudiCode();

break;

case 'gcc':

gccFields.classList.remove('d-none');

nationalAddressWrapper
.classList.add('d-none');

internationalAddressWrapper
.classList.remove('d-none');

break;

case 'foreign':

foreignFields.classList.remove('d-none');

nationalAddressWrapper
.classList.add('d-none');

internationalAddressWrapper
.classList.remove('d-none');

break;

}

}
);

function hideAllIdentitySections(){

saudiFields?.classList.add('d-none');

residentFields?.classList.add('d-none');

gccFields?.classList.add('d-none');

foreignFields?.classList.add('d-none');

}

/* ================================================ */
/* FOREIGN DOCUMENT TYPE */
/* ================================================ */

const documentType =
document.getElementById('documentType');

const foreignNationalIdFields =
document.getElementById(
'foreignNationalIdFields'
);

const passportFields =
document.getElementById(
'passportFields'
);

documentType?.addEventListener(
'change',
() => {

foreignNationalIdFields
?.classList.add('d-none');

passportFields
?.classList.add('d-none');

if(documentType.value === 'nid'){

foreignNationalIdFields
?.classList.remove('d-none');

}

if(documentType.value === 'passport'){

passportFields
?.classList.remove('d-none');

}

}
);

/* ================================================ */
/* COUNTRY CODE */
/* ================================================ */

function setSaudiCode(){

const countryCode =
document.getElementById('countryCode');

if(countryCode){

countryCode.value = '+966';

}

}

/* ================================================ */
/* NATIONAL ADDRESS BUTTON */
/* ================================================ */

const fetchNationalAddress =
document.getElementById(
'fetchNationalAddress'
);

fetchNationalAddress
?.addEventListener(
'click',
() => {

alert(
'سيتم ربط خدمة العنوان الوطني مستقبلاً عبر API'
);

}
);

/* ================================================ */
/* FORM SUBMIT */
/* ================================================ */

const registerForm =
document.getElementById(
'partnerRegisterForm'
);

registerForm?.addEventListener(
'submit',
(e) => {

e.preventDefault();

/* Final Agreement */

const finalAgreement =
document.getElementById(
'finalAgreement'
);

if(
finalAgreement &&
!finalAgreement.checked
){

alert(
'يجب الموافقة على الإقرار النهائي'
);

return;

}

/* Here API Request */

alert(
'تم إنشاء حساب الشريك بنجاح'
);

/* Redirect To OTP */

window.location.href =
'../verify-otp.html';

}
);

/* ================================================ */
/* LOAD SHARED COMPONENTS */
/* ================================================ */

const headerContainer =
document.getElementById(
'header-container'
);

if(headerContainer){

fetch(
'../../components/header.html'
)

.then(response => response.text())

.then(html => {

headerContainer.innerHTML =
html;

})

.catch(error => {

console.error(error);

});

}

const footerContainer =
document.getElementById(
'footer-container'
);

if(footerContainer){

fetch(
'../../components/footer.html'
)

.then(response => response.text())

.then(html => {

footerContainer.innerHTML =
html;

})

.catch(error => {

console.error(error);

});

}

/* ================================================ */
/* INIT */
/* ================================================ */

hideAllIdentitySections();

prevBtn.style.display = 'none';

});
