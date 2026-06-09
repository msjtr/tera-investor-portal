```javascript
/* ==========================================
   Register Page
========================================== */

document.addEventListener(
    'DOMContentLoaded',
    () => {

        initializePasswordStrength();
        initializePasswordMatch();
        initializeEmailMatch();
        initializeNationalityFields();
        initializeMobileValidation();

    }
);

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

                strengthFill.style.width =
                '33%';

                strengthFill.classList.add(
                    'strength-weak'
                );

                strengthText.textContent =
                'ضعيفة';

            }

            else if(score <= 4){

                strengthFill.style.width =
                '66%';

                strengthFill.classList.add(
                    'strength-medium'
                );

                strengthText.textContent =
                'متوسطة';

            }

            else{

                strengthFill.style.width =
                '100%';

                strengthFill.classList.add(
                    'strength-strong'
                );

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
    document.getElementById(
        'password'
    );

    const confirmPassword =
    document.getElementById(
        'confirmPassword'
    );

    if(
        !password ||
        !confirmPassword
    ) return;

    confirmPassword.addEventListener(
        'input',
        () => {

            if(
                password.value ===
                confirmPassword.value
            ){

                confirmPassword.classList.add(
                    'valid'
                );

                confirmPassword.classList.remove(
                    'invalid'
                );

            }

            else{

                confirmPassword.classList.add(
                    'invalid'
                );

                confirmPassword.classList.remove(
                    'valid'
                );

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

    const confirmEmail =
    document.getElementById(
        'confirmEmail'
    );

    if(
        !email ||
        !confirmEmail
    ) return;

    confirmEmail.addEventListener(
        'input',
        () => {

            if(
                email.value ===
                confirmEmail.value
            ){

                confirmEmail.classList.add(
                    'valid'
                );

                confirmEmail.classList.remove(
                    'invalid'
                );

            }

            else{

                confirmEmail.classList.add(
                    'invalid'
                );

                confirmEmail.classList.remove(
                    'valid'
                );

            }

        }
    );

}

/* ==========================================
   Nationality
========================================== */

function initializeNationalityFields(){

    const nationality =
    document.getElementById(
        'nationality'
    );

    const identityLabel =
    document.getElementById(
        'identityLabel'
    );

    if(
        !nationality ||
        !identityLabel
    ) return;

    nationality.addEventListener(
        'change',
        () => {

            const value =
            nationality.value;

            if(
                value === 'saudi'
            ){

                identityLabel.textContent =
                'رقم الهوية الوطنية';

            }

            else if(
                value === 'resident'
            ){

                identityLabel.textContent =
                'رقم الإقامة';

            }

            else{

                identityLabel.textContent =
                'رقم الجواز أو الهوية';

            }

        }
    );

}

/* ==========================================
   Mobile Validation
========================================== */

function initializeMobileValidation(){

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
                mobile.value.substring(1);

            }

        }
    );

}
```
