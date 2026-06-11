'use strict';

/* ================================================= */
/* TERA REGISTER PAGE */
/* ================================================= */

document.addEventListener(
'DOMContentLoaded',
() => {

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
.querySelectorAll('.form-step')
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

document
.querySelectorAll('.step')
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

if(prevBtn){

prevBtn.style.display =
step === 1
? 'none'
: 'inline-flex';

}

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

showStep(currentStep);

/* ================================================= */
/* NEXT */
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

}
);

/* ================================================= */
/* PREVIOUS */
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

}
);
    /* ================================================= */
/* VALIDATION */
/* ================================================= */

function validateStep(step){

if(step === 1){

const username =
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

const passwordField =
document.getElementById(
'password'
);

const confirmPasswordField =
document.getElementById(
'confirmPassword'
);

if(
!username ||
username.value.trim() === ''
){

alert(
'يرجى إدخال اسم المستخدم'
);

username?.focus();

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

return false;

}

if(
passwordField.value !==
confirmPasswordField.value
){

alert(
'كلمة المرور غير متطابقة'
);

return false;

}

}

if(step === 2){

const fullNameAr =
document.getElementById(
'fullNameAr'
);

const fullNameEn =
document.getElementById(
'fullNameEn'
);

const category =
document.getElementById(
'accountCategory'
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

}

if(step === 3){

const mobile =
document.getElementById(
'mobileNumber'
);

if(
!mobile ||
mobile.value.trim() === ''
){

alert(
'أدخل رقم الجوال'
);

return false;

}

}

return true;

}

/* ================================================= */
/* USERNAME VALIDATION */
/* ================================================= */

const usernameField =
document.getElementById(
'username'
);

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
/^[A-Za-z0-9]*$/.test(
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
?.classList.add(
'valid'
);

document
.getElementById(
'userRule5'
)
?.classList.add(
'valid'
);

}
);

/* ================================================= */
/* EMAIL VALIDATION */
/* ================================================= */

const emailField =
document.getElementById(
'email'
);

const confirmEmailField =
document.getElementById(
'confirmEmail'
);

confirmEmailField?.addEventListener(
'input',
() => {

if(
!emailField.value ||
!confirmEmailField.value
){
return;
}

if(
emailField.value ===
confirmEmailField.value
){

confirmEmailField.style.borderColor =
'#16a34a';

}else{

confirmEmailField.style.borderColor =
'#dc2626';

}

}
);

/* ================================================= */
/* MOBILE CLEANUP */
/* ================================================= */

const mobileField =
document.getElementById(
'mobileNumber'
);

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

}
);
    /* ================================================= */
/* PASSWORD SHOW / HIDE */
/* ================================================= */

const passwordInput =
document.getElementById(
'password'
);

const confirmPasswordInput =
document.getElementById(
'confirmPassword'
);

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

if(!passwordInput){
return;
}

passwordInput.type =
showPassword.checked
? 'text'
: 'password';

}
);

showConfirmPassword?.addEventListener(
'change',
() => {

if(!confirmPasswordInput){
return;
}

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

/* Length */

const rule1 =
value.length >= 8;

document
.getElementById('passRule1')
?.classList.toggle(
'valid',
rule1
);

if(rule1){
score++;
}

/* Uppercase */

const rule2 =
/[A-Z]/.test(value);

document
.getElementById('passRule2')
?.classList.toggle(
'valid',
rule2
);

if(rule2){
score++;
}

/* Lowercase */

const rule3 =
/[a-z]/.test(value);

document
.getElementById('passRule3')
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
.getElementById('passRule4')
?.classList.toggle(
'valid',
rule4
);

if(rule4){
score++;
}

/* Special Character */

const rule5 =
/[^A-Za-z0-9]/.test(
value
);

document
.getElementById('passRule5')
?.classList.toggle(
'valid',
rule5
);

if(rule5){
score++;
}

/* Strength Indicator */

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

if(passwordMatchStatus){

passwordMatchStatus.innerHTML = '';

}

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

}
else{

passwordMatchStatus.innerHTML =
'✖ كلمة المرور غير متطابقة';

passwordMatchStatus.className =
'match-status invalid';

}

}

    /* ================================================= */
/* CATEGORY SWITCHING */
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

accountCategory?.addEventListener(
'change',
() => {

    hideAllIdentitySections();

    const category =
    accountCategory.value;

    switch(category){

        case 'saudi':

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

        break;

        case 'resident':

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

        break;

        case 'gcc':

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

        break;

        case 'foreign':

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

        break;

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

    if(
    documentType.value ===
    'nid'
    ){

        foreignNationalIdFields
        ?.classList.remove(
        'd-none'
        );

    }

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

    if(
    typeof infoAlert ===
    'function'
    ){

        infoAlert(
        'سيتم ربط خدمة العنوان الوطني مستقبلاً'
        );

    }else{

        alert(
        'سيتم ربط خدمة العنوان الوطني مستقبلاً'
        );

    }

}
);

/* ================================================= */
/* FORM SUBMIT */
/* ================================================= */

const registerForm =
document.getElementById(
'partnerRegisterForm'
);

registerForm?.addEventListener(
'submit',
(e) => {

    e.preventDefault();

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

    setTimeout(() => {

        window.location.href =
        '../verify-otp.html';

    },1500);

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

});
