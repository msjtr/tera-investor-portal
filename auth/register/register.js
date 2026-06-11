'use strict';

/* ================================================= */
/* TERA REGISTER PAGE */
/* ================================================= */

document.addEventListener(
'DOMContentLoaded',
() => {

/* ================================================= */
/* VARIABLES */
/* ================================================= */

let currentStep = 1;

const totalSteps = 4;

const nextBtn =
document.getElementById(
'nextBtn'
);

const prevBtn =
document.getElementById(
'prevBtn'
);

const submitBtn =
document.getElementById(
'submitBtn'
);

/* ================================================= */
/* STEP CONTROL */
/* ================================================= */

function showStep(step){

document
.querySelectorAll(
'.form-step'
)
.forEach(section => {

section.classList.remove(
'active'
);

});

const currentSection =
document.getElementById(
`step${step}`
);

if(currentSection){

currentSection.classList.add(
'active'
);

}

/* ================================= */

document
.querySelectorAll(
'.step'
)
.forEach(item => {

item.classList.remove(
'active'
);

});

const currentStepElement =
document.querySelector(
`.step[data-step="${step}"]`
);

if(currentStepElement){

currentStepElement.classList.add(
'active'
);

}

/* ================================= */

if(prevBtn){

prevBtn.style.display =
step === 1
? 'none'
: 'inline-flex';

}

/* ================================= */

if(
step === totalSteps
){

nextBtn?.classList.add(
'd-none'
);

submitBtn?.classList.remove(
'd-none'
);

}else{

nextBtn?.classList.remove(
'd-none'
);

submitBtn?.classList.add(
'd-none'
);

}

}

/* ================================================= */
/* INITIAL STEP */
/* ================================================= */

showStep(
currentStep
);

/* ================================================= */
/* NEXT STEP */
/* ================================================= */

nextBtn?.addEventListener(
'click',
() => {

if(
!validateStep(
currentStep
)
){
return;
}

currentStep++;

if(
currentStep >
totalSteps
){

currentStep =
totalSteps;

}

showStep(
currentStep
);

window.scrollTo({

top:0,

behavior:'smooth'

});

}
);

/* ================================================= */
/* PREVIOUS STEP */
/* ================================================= */

prevBtn?.addEventListener(
'click',
() => {

currentStep--;

if(
currentStep < 1
){

currentStep = 1;

}

showStep(
currentStep
);

window.scrollTo({

top:0,

behavior:'smooth'

});

}
);

/* ================================================= */
/* FORM ELEMENTS */
/* ================================================= */

const usernameField =
document.getElementById(
'username'
);

const emailField =
document.getElementById(
'email'
);

const confirmEmailField =
document.getElementById(
'confirmEmail'
);

const passwordInput =
document.getElementById(
'password'
);

const confirmPasswordInput =
document.getElementById(
'confirmPassword'
);

const fullNameAr =
document.getElementById(
'fullNameAr'
);

const fullNameEn =
document.getElementById(
'fullNameEn'
);

const mobileField =
document.getElementById(
'mobileNumber'
);
    /* ================================================= */
/* STEP VALIDATION */
/* ================================================= */

function validateStep(step){

/* ==================================== */
/* STEP 1 */
/* ==================================== */

if(step === 1){

if(
!usernameField ||
usernameField.value.trim() === ''
){

alert(
'يرجى إدخال اسم المستخدم'
);

usernameField?.focus();

return false;

}

if(
!emailField ||
emailField.value.trim() === ''
){

alert(
'يرجى إدخال البريد الإلكتروني'
);

emailField?.focus();

return false;

}

if(
emailField.value !==
confirmEmailField.value
){

alert(
'البريد الإلكتروني غير متطابق'
);

confirmEmailField?.focus();

return false;

}

if(
!passwordInput ||
passwordInput.value.length < 8
){

alert(
'كلمة المرور لا تحقق الشروط المطلوبة'
);

passwordInput?.focus();

return false;

}

if(
passwordInput.value !==
confirmPasswordInput.value
){

alert(
'كلمة المرور غير متطابقة'
);

confirmPasswordInput?.focus();

return false;

}

}

/* ==================================== */
/* STEP 2 */
/* ==================================== */

if(step === 2){

const category =
document.getElementById(
'accountCategory'
);

const adultDeclaration =
document.getElementById(
'adultDeclaration'
);

if(
!fullNameAr ||
fullNameAr.value.trim() === ''
){

alert(
'أدخل الاسم بالعربية'
);

return false;

}

if(
!fullNameEn ||
fullNameEn.value.trim() === ''
){

alert(
'أدخل الاسم بالإنجليزية'
);

return false;

}

if(
!category ||
category.value === ''
){

alert(
'اختر الفئة'
);

return false;

}

if(
adultDeclaration &&
!adultDeclaration.checked
){

alert(
'يجب الإقرار بأن العمر 18 عاماً فأكثر'
);

return false;

}

}

/* ==================================== */
/* STEP 3 */
/* ==================================== */

if(step === 3){

if(
!mobileField ||
mobileField.value.trim() === ''
){

alert(
'يرجى إدخال رقم الجوال'
);

mobileField?.focus();

return false;

}

}

return true;

}

    /* ==================================== */
/* STEP 4 */
/* ==================================== */

if(step === 4){

if(
!validateFinalAgreements()
){

return false;

}

}

/* ================================================= */
/* REGISTER FORM */
/* ================================================= */

const registerForm =
document.getElementById(
'partnerRegisterForm'
);

registerForm?.addEventListener(
'submit',
(e) => {

e.preventDefault();

/* تحقق نهائي */

for(
let i = 1;
i <= totalSteps;
i++
){

if(
!validateStep(i)
){

currentStep = i;

showStep(i);

window.scrollTo({

top:0,

behavior:'smooth'

});

return;

}

}

/* نجاح */

if(
typeof successAlert ===
'function'
){

successAlert(
'تم إنشاء حساب الشريك بنجاح'
);

}else{

alert(
'تم إنشاء حساب الشريك بنجاح'
);

}

/* انتقال */

setTimeout(() => {

window.location.href =
'../verify-otp.html';

},1500);

}
);

    

/* ================================================= */
/* USERNAME VALIDATION */
/* ================================================= */

usernameField?.addEventListener(
'input',
() => {

let value =
usernameField.value;

value =
value.replace(
/[^A-Za-z0-9]/g,
''
);

usernameField.value =
value;

const validLength =
value.length >= 4 &&
value.length <= 20;

const validChars =
/^[A-Za-z0-9]+$/.test(
value
);

document
.getElementById(
'userRule1'
)
?.classList.toggle(
'valid',
validLength
);

document
.getElementById(
'userRule2'
)
?.classList.toggle(
'valid',
validChars
);

document
.getElementById(
'userRule3'
)
?.classList.toggle(
'valid',
validChars
);

document
.getElementById(
'userRule4'
)
?.classList.toggle(
'valid',
!value.includes(' ')
);

document
.getElementById(
'userRule5'
)
?.classList.toggle(
'valid',
validChars
);

if(
validLength &&
validChars
){

usernameField.classList.add(
'valid-input'
);

usernameField.classList.remove(
'invalid-input'
);

}else{

usernameField.classList.remove(
'valid-input'
);

if(value.length){

usernameField.classList.add(
'invalid-input'
);

}

}

}
);

/* ================================================= */
/* ARABIC NAME VALIDATION */
/* ================================================= */

fullNameAr?.addEventListener(
'input',
function(){

this.value =
this.value.replace(
/[^؀-ۿ\s]/g,
''
);

const valid =
/^[؀-ۿ\s]+$/.test(
this.value
);

this.classList.toggle(
'valid-input',
valid
);

this.classList.toggle(
'invalid-input',
!valid &&
this.value.length > 0
);

}
);

/* ================================================= */
/* ENGLISH NAME VALIDATION */
/* ================================================= */

fullNameEn?.addEventListener(
'input',
function(){

this.value =
this.value.replace(
/[^A-Za-z\s]/g,
''
);

const valid =
/^[A-Za-z\s]+$/.test(
this.value
);

this.classList.toggle(
'valid-input',
valid
);

this.classList.toggle(
'invalid-input',
!valid &&
this.value.length > 0
);

}
);

    /* ================================================= */
/* EMAIL VALIDATION */
/* ================================================= */

const emailRegex =
/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(){

if(
!emailField ||
!confirmEmailField
){
return;
}

const emailValid =
emailRegex.test(
emailField.value
);

/* البريد */

emailField.classList.toggle(
'valid-input',
emailValid
);

emailField.classList.toggle(
'invalid-input',
!emailValid &&
emailField.value.length > 0
);

/* التأكيد */

if(
emailField.value &&
confirmEmailField.value
){

const matched =
emailField.value ===
confirmEmailField.value;

confirmEmailField.classList.toggle(
'valid-input',
matched
);

confirmEmailField.classList.toggle(
'invalid-input',
!matched
);

}

}

emailField?.addEventListener(
'input',
validateEmail
);

confirmEmailField?.addEventListener(
'input',
validateEmail
);

/* ================================================= */
/* MOBILE NUMBER */
/* ================================================= */

mobileField?.addEventListener(
'input',
() => {

let value =
mobileField.value;

value =
value.replace(
/\D/g,
''
);

value =
value.replace(
/^0+/,
''
);

mobileField.value =
value;

if(
value.length >= 8
){

mobileField.classList.add(
'valid-input'
);

mobileField.classList.remove(
'invalid-input'
);

}else{

mobileField.classList.remove(
'valid-input'
);

if(value.length){

mobileField.classList.add(
'invalid-input'
);

}

}

}
);

/* ================================================= */
/* SHOW PASSWORD */
/* ================================================= */

const showPassword =
document.getElementById(
'showPassword'
);

const showConfirmPassword =
document.getElementById(
'showConfirmPassword'
);

showPassword?.addEventListener(
'change',
() => {

passwordInput.type =
showPassword.checked
? 'text'
: 'password';

}
);

showConfirmPassword?.addEventListener(
'change',
() => {

confirmPasswordInput.type =
showConfirmPassword.checked
? 'text'
: 'password';

}
);

/* ================================================= */
/* PASSWORD STRENGTH */
/* ================================================= */

const passwordStrength =
document.getElementById(
'passwordStrength'
);

const passwordMatchStatus =
document.getElementById(
'passwordMatchStatus'
);

passwordInput?.addEventListener(
'input',
() => {

const value =
passwordInput.value;

let score = 0;

/* 8 chars */

const rule1 =
value.length >= 8;

document
.getElementById(
'passRule1'
)
?.classList.toggle(
'valid',
rule1
);

if(rule1){
score++;
}

/* Upper */

const rule2 =
/[A-Z]/.test(value);

document
.getElementById(
'passRule2'
)
?.classList.toggle(
'valid',
rule2
);

if(rule2){
score++;
}

/* Lower */

const rule3 =
/[a-z]/.test(value);

document
.getElementById(
'passRule3'
)
?.classList.toggle(
'valid',
rule3
);

if(rule3){
score++;
}

/* Number */

const rule4 =
/[0-9]/.test(value);

document
.getElementById(
'passRule4'
)
?.classList.toggle(
'valid',
rule4
);

if(rule4){
score++;
}

/* Special */

const rule5 =
/[^A-Za-z0-9]/.test(
value
);

document
.getElementById(
'passRule5'
)
?.classList.toggle(
'valid',
rule5
);

if(rule5){
score++;
}

/* Strength */

if(passwordStrength){

passwordStrength.className =
'';

if(score <= 2){

passwordStrength.innerHTML =
'🔴 ضعيفة';

passwordStrength.classList.add(
'password-weak'
);

}
else if(score === 3){

passwordStrength.innerHTML =
'🟠 متوسطة';

passwordStrength.classList.add(
'password-medium'
);

}
else if(score === 4){

passwordStrength.innerHTML =
'🟢 قوية';

passwordStrength.classList.add(
'password-strong'
);

}
else{

passwordStrength.innerHTML =
'🟢 قوية جداً';

passwordStrength.classList.add(
'password-very-strong'
);

}

}

/* لون الحقل */

if(score >= 4){

passwordInput.classList.add(
'valid-input'
);

passwordInput.classList.remove(
'invalid-input'
);

}else{

passwordInput.classList.remove(
'valid-input'
);

if(value.length){

passwordInput.classList.add(
'invalid-input'
);

}

}

checkPasswordMatch();

}
);

/* ================================================= */
/* PASSWORD MATCH */
/* ================================================= */

confirmPasswordInput?.addEventListener(
'input',
checkPasswordMatch
);

function checkPasswordMatch(){

if(
!passwordInput ||
!confirmPasswordInput
){
return;
}

if(
passwordInput.value === '' ||
confirmPasswordInput.value === ''
){

passwordMatchStatus.innerHTML =
'';

return;

}

const matched =
passwordInput.value ===
confirmPasswordInput.value;

if(matched){

passwordMatchStatus.innerHTML =
'✔ كلمة المرور متطابقة';

passwordMatchStatus.className =
'match-status valid';

confirmPasswordInput.classList.add(
'valid-input'
);

confirmPasswordInput.classList.remove(
'invalid-input'
);

}else{

passwordMatchStatus.innerHTML =
'✖ كلمة المرور غير متطابقة';

passwordMatchStatus.className =
'match-status invalid';

confirmPasswordInput.classList.remove(
'valid-input'
);

confirmPasswordInput.classList.add(
'invalid-input'
);

}

}

    /* ================================================= */
/* ACCOUNT CATEGORY */
/* ================================================= */

const accountCategory =
document.getElementById(
'accountCategory'
);

const saudiFields =
document.getElementById(
'saudiFields'
);

const residentFields =
document.getElementById(
'residentFields'
);

const gccFields =
document.getElementById(
'gccFields'
);

const foreignFields =
document.getElementById(
'foreignFields'
);

const nationalAddressWrapper =
document.getElementById(
'nationalAddressWrapper'
);

const internationalAddressWrapper =
document.getElementById(
'internationalAddressWrapper'
);

/* ================================================= */
/* HIDE ALL */
/* ================================================= */

function hideAllIdentitySections(){

saudiFields?.classList.add(
'd-none'
);

residentFields?.classList.add(
'd-none'
);

gccFields?.classList.add(
'd-none'
);

foreignFields?.classList.add(
'd-none'
);

}

/* ================================================= */
/* COUNTRY CODE */
/* ================================================= */

function setSaudiCode(){

const countryCode =
document.getElementById(
'countryCode'
);

if(countryCode){

countryCode.value =
'+966';

}

}

/* ================================================= */
/* CATEGORY CHANGE */
/* ================================================= */

accountCategory?.addEventListener(
'change',
() => {

hideAllIdentitySections();

const category =
accountCategory.value;

/* سعودي */

if(
category === 'saudi'
){

saudiFields?.classList.remove(
'd-none'
);

nationalAddressWrapper
?.classList.remove(
'd-none'
);

internationalAddressWrapper
?.classList.add(
'd-none'
);

setSaudiCode();

}

/* مقيم */

if(
category === 'resident'
){

residentFields?.classList.remove(
'd-none'
);

nationalAddressWrapper
?.classList.remove(
'd-none'
);

internationalAddressWrapper
?.classList.add(
'd-none'
);

setSaudiCode();

}

/* خليجي */

if(
category === 'gcc'
){

gccFields?.classList.remove(
'd-none'
);

nationalAddressWrapper
?.classList.add(
'd-none'
);

internationalAddressWrapper
?.classList.remove(
'd-none'
);

}

/* أجنبي */

if(
category === 'foreign'
){

foreignFields?.classList.remove(
'd-none'
);

nationalAddressWrapper
?.classList.add(
'd-none'
);

internationalAddressWrapper
?.classList.remove(
'd-none'
);

}

}
);

/* ================================================= */
/* FOREIGN DOCUMENT TYPE */
/* ================================================= */

const documentType =
document.getElementById(
'documentType'
);

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
?.classList.add(
'd-none'
);

passportFields
?.classList.add(
'd-none'
);

/* هوية */

if(
documentType.value ===
'nid'
){

foreignNationalIdFields
?.classList.remove(
'd-none'
);

}

/* جواز */

if(
documentType.value ===
'passport'
){

passportFields
?.classList.remove(
'd-none'
);

}

}
);
    /* ================================================= */
/* SAUDI NATIONAL ID */
/* ================================================= */

const nationalId =
document.getElementById(
'nationalId'
);

nationalId?.addEventListener(
'input',
function(){

this.value =
this.value.replace(
/\D/g,
''
);

if(
this.value.length === 10
){

this.classList.add(
'valid-input'
);

this.classList.remove(
'invalid-input'
);

}else{

this.classList.remove(
'valid-input'
);

if(this.value.length){

this.classList.add(
'invalid-input'
);

}

}

}
);

    /* ================================================= */
/* IQAMA */
/* ================================================= */

const iqamaNumber =
document.getElementById(
'iqamaNumber'
);

iqamaNumber?.addEventListener(
'input',
function(){

this.value =
this.value.replace(
/\D/g,
''
);

if(
this.value.length === 10
){

this.classList.add(
'valid-input'
);

}else{

this.classList.remove(
'valid-input'
);

}

}
);

    /* ================================================= */
/* PASSPORT */
/* ================================================= */

const passportNumber =
document.getElementById(
'passportNumber'
);

passportNumber?.addEventListener(
'input',
function(){

if(
this.value.length >= 6
){

this.classList.add(
'valid-input'
);

}else{

this.classList.remove(
'valid-input'
);

}

}
);

    /* ================================================= */
/* NATIONAL ADDRESS */
/* ================================================= */

const fetchNationalAddress =
document.getElementById(
'fetchNationalAddress'
);

fetchNationalAddress
?.addEventListener(
'click',
() => {

alert(
'سيتم ربط خدمة العنوان الوطني لاحقاً عبر API سبل'
);

}
);

    /* ================================================= */
/* INITIALIZE */
/* ================================================= */

hideAllIdentitySections();

if(prevBtn){

prevBtn.style.display =
'none';

}

    /* ================================================= */
/* AGREE ALL */
/* ================================================= */

const agreeAll =
document.getElementById(
'agreeAll'
);

agreeAll?.addEventListener(
'change',
function(){

document
.querySelectorAll(
'.agreement-box input[type="checkbox"]'
)
.forEach(item => {

item.checked =
this.checked;

});

}
);

/* ================================================= */
/* FINAL STEP VALIDATION */
/* ================================================= */

function validateFinalAgreements(){

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

return false;

}

return true;

}

    /* ================================================= */
/* RESET STATES */
/* ================================================= */

document
.querySelectorAll(
'input'
)
.forEach(item => {

item.autocomplete =
'off';

});

    
    
