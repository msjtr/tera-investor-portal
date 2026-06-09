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
        initializeRegisterForm();

    }
);

/* ==========================================
   Multi Step Form
========================================== */

function initializeSteps(){

    const steps =
    document.querySelectorAll('.form-step');

    const indicators =
    document.querySelectorAll('.step');

    let currentStep = 0;

    document
    .querySelectorAll('.btn-next')
    .forEach(button => {

        button.addEventListener(
            'click',
            () => {

                if(currentStep >= steps.length - 1)
                    return;

                const currentForm =
                steps[currentStep];

                const fields =
                currentForm.querySelectorAll(
                    'input[required], select[required]'
                );

                let valid = true;

                fields.forEach(field => {

                    if(!field.checkValidity()){

                        field.reportValidity();
                        valid = false;

                    }

                });

                if(!valid) return;

                steps[currentStep]
                .classList.remove('active');

                indicators[currentStep]
                .classList.add('completed');

                indicators[currentStep]
                .classList.remove('active');

                currentStep++;

                steps[currentStep]
                .classList.add('active');

                indicators[currentStep]
                .classList.add('active');

            }
        );

    });

    document
    .querySelectorAll('.btn-prev')
    .forEach(button => {

        button.addEventListener(
            'click',
            () => {

                if(currentStep <= 0)
                    return;

                steps[currentStep]
                .classList.remove('active');

                indicators[currentStep]
                .classList.remove('active');

                currentStep--;

                steps[currentStep]
                .classList.add('active');

                indicators[currentStep]
                .classList.add('active');

            }
        );

    });

}

/* ==========================================
   Password Strength
========================================== */

function initializePasswordStrength(){

    const password =
    document.getElementById('password');

    const strengthFill =
    document.getElementById('strengthFill');

    const strengthText =
    document.getElementById('strengthText');

    if(
        !password ||
        !strengthFill ||
        !strengthText
    ) return;

    password.addEventListener(
        'input',
        () => {

            const value =
            password.value;

            let score = 0;

            if(value.length >= 8) score++;
            if(/[A-Z]/.test(value)) score++;
            if(/[a-z]/.test(value)) score++;
            if(/[0-9]/.test(value)) score++;
            if(/[^A-Za-z0-9]/.test(value)) score++;

            strengthFill.className =
            'strength-fill';

            if(score <= 2){

                strengthFill.classList.add(
                    'strength-weak'
                );

                strengthFill.style.width =
                '33%';

                strengthText.textContent =
                'ضعيفة';

            }

            else if(score <= 4){

                strengthFill.classList.add(
                    'strength-medium'
                );

                strengthFill.style.width =
                '66%';

                strengthText.textContent =
                'متوسطة';

            }

            else{

                strengthFill.classList.add(
                    'strength-strong'
                );

                strengthFill.style.width =
                '100%';

                strengthText.textContent =
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
    document.getElementById('password');

    const confirm =
    document.getElementById('confirmPassword');

    const message =
    document.getElementById('passwordMatch');

    if(
        !password ||
        !confirm ||
        !message
    ) return;

    confirm.addEventListener(
        'input',
        () => {

            const match =
            password.value ===
            confirm.value;

            confirm.classList.toggle(
                'valid',
                match
            );

            confirm.classList.toggle(
                'invalid',
                !match
            );

            message.textContent =
            match
            ? '✓ كلمة المرور متطابقة'
            : '✕ كلمة المرور غير متطابقة';

            message.className =
            match
            ? 'text-success'
            : 'text-danger';

        }
    );

}

/* ==========================================
   Email Match
========================================== */

function initializeEmailMatch(){

    const email =
    document.getElementById('email');

    const confirm =
    document.getElementById('confirmEmail');

    if(
        !email ||
        !confirm
    ) return;

    confirm.addEventListener(
        'input',
        () => {

            const match =
            email.value.trim() ===
            confirm.value.trim();

            confirm.classList.toggle(
                'valid',
                match
            );

            confirm.classList.toggle(
                'invalid',
                !match
            );

        }
    );

}

/* ==========================================
   Password Toggle
========================================== */

function initializePasswordToggle(){

    document
    .querySelectorAll('.toggle-password')
    .forEach(button => {

        button.addEventListener(
            'click',
            () => {

                const input =
                button.previousElementSibling;

                if(!input) return;

                input.type =
                input.type === 'password'
                ? 'text'
                : 'password';

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

            switch(nationality.value){

                case 'saudi':
                    label.textContent =
                    'رقم الهوية الوطنية';
                    break;

                case 'resident':
                    label.textContent =
                    'رقم الإقامة';
                    break;

                case 'gcc':
                    label.textContent =
                    'رقم الهوية الخليجية';
                    break;

                default:
                    label.textContent =
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
            mobile.value
            .replace(/\D/g,'');

            if(
                mobile.value.startsWith('0')
            ){

                mobile.value =
                mobile.value.substring(1);

            }

        }
    );

}

/* ==========================================
   Submit Form
========================================== */

function initializeRegisterForm(){

    const form =
    document.getElementById(
        'registerForm'
    );

    if(!form) return;

    form.addEventListener(
        'submit',
        e => {

            e.preventDefault();

            const email =
            document.getElementById('email');

            const confirmEmail =
            document.getElementById('confirmEmail');

            const password =
            document.getElementById('password');

            const confirmPassword =
            document.getElementById('confirmPassword');

            if(
                email.value !==
                confirmEmail.value
            ){

                alert(
                    'البريد الإلكتروني غير متطابق'
                );

                return;

            }

            if(
                password.value !==
                confirmPassword.value
            ){

                alert(
                    'كلمة المرور غير متطابقة'
                );

                return;

            }

            localStorage.setItem(
                'tera_registration_email',
                email.value
            );

            localStorage.setItem(
                'tera_registration_mobile',
                document.getElementById(
                    'mobile'
                ).value
            );

            window.location.href =
            '/auth/verify-otp.html';

        }
    );

}
