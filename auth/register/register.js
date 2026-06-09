/* ==========================================
   TERA Register Page
========================================== */

document.addEventListener(
    'DOMContentLoaded',
    () => {

        initializeSteps();
        initializePasswordStrength();
        initializePasswordMatch();
        initializeEmailMatch();
        initializePasswordToggle();
        initializeNationality();
        initializeMobile();

    }
);

/* ==========================================
   Multi Step Form
========================================== */

function initializeSteps(){

    const steps =
    document.querySelectorAll(
        '.form-step'
    );

    const stepIndicators =
    document.querySelectorAll(
        '.step'
    );

    let currentStep = 0;

    document
    .querySelectorAll('.btn-next')
    .forEach(button => {

        button.addEventListener(
            'click',
            () => {

                if(
                    currentStep <
                    steps.length - 1
                ){

                    steps[
                        currentStep
                    ].classList.remove(
                        'active'
                    );

                    stepIndicators[
                        currentStep
                    ].classList.add(
                        'completed'
                    );

                    currentStep++;

                    steps[
                        currentStep
                    ].classList.add(
                        'active'
                    );

                    stepIndicators[
                        currentStep
                    ].classList.add(
                        'active'
                    );

                }

            }
        );

    });

    document
    .querySelectorAll('.btn-prev')
    .forEach(button => {

        button.addEventListener(
            'click',
            () => {

                if(
                    currentStep > 0
                ){

                    steps[
                        currentStep
                    ].classList.remove(
                        'active'
                    );

                    stepIndicators[
                        currentStep
                    ].classList.remove(
                        'active'
                    );

                    currentStep--;

                    steps[
                        currentStep
                    ].classList.add(
                        'active'
                    );

                }

            }
        );

    });

}

/* ==========================================
   Password Strength
========================================== */

function initializePasswordStrength(){

    const password =
    document.getElementById(
        'password'
    );

    const strengthFill =
    document.getElementById(
        'strengthFill'
    );

    const strengthText =
    document.getElementById(
        'strengthText'
    );

    if(!password) return;

    password.addEventListener(
        'input',
        () => {

            const value =
            password.value;

            let score = 0;

            if(value.length >= 8)
                score++;

            if(/[A-Z]/.test(value))
                score++;

            if(/[a-z]/.test(value))
                score++;

            if(/[0-9]/.test(value))
                score++;

            if(/[^A-Za-z0-9]/.test(value))
                score++;

            strengthFill.className =
            'strength-fill';

            if(score <= 2){

                strengthFill.classList.add(
                    'strength-weak'
                );

                strengthFill.style.width =
                '33%';

                strengthText.innerText =
                'ضعيفة';

            }

            else if(score <= 4){

                strengthFill.classList.add(
                    'strength-medium'
                );

                strengthFill.style.width =
                '66%';

                strengthText.innerText =
                'متوسطة';

            }

            else{

                strengthFill.classList.add(
                    'strength-strong'
                );

                strengthFill.style.width =
                '100%';

                strengthText.innerText =
                'قوية';

            }

        }
    );

}

/* ==========================================
   Password Match
========================================== */

function initializePasswordMatch(){

    const password =
    document.getElementById(
        'password'
    );

    const confirm =
    document.getElementById(
        'confirmPassword'
    );

    const message =
    document.getElementById(
        'passwordMatch'
    );

    if(
        !password ||
        !confirm
    ) return;

    confirm.addEventListener(
        'input',
        () => {

            if(
                confirm.value ===
                password.value
            ){

                confirm.classList.add(
                    'valid'
                );

                confirm.classList.remove(
                    'invalid'
                );

                message.innerText =
                '✓ كلمة المرور متطابقة';

                message.style.color =
                '#16a34a';

            }

            else{

                confirm.classList.add(
                    'invalid'
                );

                confirm.classList.remove(
                    'valid'
                );

                message.innerText =
                '✕ كلمة المرور غير متطابقة';

                message.style.color =
                '#dc2626';

            }

        }
    );

}

/* ==========================================
   Email Match
========================================== */

function initializeEmailMatch(){

    const email =
    document.getElementById(
        'email'
    );

    const confirm =
    document.getElementById(
        'confirmEmail'
    );

    if(
        !email ||
        !confirm
    ) return;

    confirm.addEventListener(
        'input',
        () => {

            if(
                email.value ===
                confirm.value
            ){

                confirm.classList.add(
                    'valid'
                );

                confirm.classList.remove(
                    'invalid'
                );

            }

            else{

                confirm.classList.add(
                    'invalid'
                );

                confirm.classList.remove(
                    'valid'
                );

            }

        }
    );

}

/* ==========================================
   Password Toggle
========================================== */

function initializePasswordToggle(){

    document
    .querySelectorAll(
        '.toggle-password'
    )
    .forEach(button => {

        button.addEventListener(
            'click',
            () => {

                const input =
                button.previousElementSibling;

                if(
                    input.type ===
                    'password'
                ){

                    input.type =
                    'text';

                }

                else{

                    input.type =
                    'password';

                }

            }
        );

    });

}

/* ==========================================
   Nationality
========================================== */

function initializeNationality(){

    const nationality =
    document.getElementById(
        'nationality'
    );

    const label =
    document.getElementById(
        'identityLabel'
    );

    if(
        !nationality ||
        !label
    ) return;

    nationality.addEventListener(
        'change',
        () => {

            switch(
                nationality.value
            ){

                case 'saudi':

                    label.innerText =
                    'رقم الهوية الوطنية';

                    break;

                case 'resident':

                    label.innerText =
                    'رقم الإقامة';

                    break;

                case 'gcc':

                    label.innerText =
                    'رقم الهوية الخليجية';

                    break;

                default:

                    label.innerText =
                    'رقم جواز السفر';

            }

        }
    );

}

/* ==========================================
   Mobile Validation
========================================== */

function initializeMobile(){

    const mobile =
    document.getElementById(
        'mobile'
    );

    if(!mobile) return;

    mobile.addEventListener(
        'input',
        () => {

            mobile.value =
            mobile.value.replace(
                /\D/g,
                ''
            );

            if(
                mobile.value.startsWith(
                    '0'
                )
            ){

                mobile.value =
                mobile.value.substring(
                    1
                );

            }

        }
    );

}

/* ==========================================
   Submit Form
========================================== */

document
.getElementById(
    'registerForm'
)
?.addEventListener(
    'submit',
    e => {

        e.preventDefault();

        alert(
            'تم إنشاء الحساب بنجاح'
        );

        window.location.href =
        '/auth/verify-otp.html';

    }
);
