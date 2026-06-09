```javascript
document
.getElementById('forgotPasswordForm')
.addEventListener(
    'submit',
    function(e){

        e.preventDefault();

        const identity =
        document.getElementById(
            'identity'
        ).value;

        if(!identity){

            alert(
                'الرجاء إدخال البريد الإلكتروني أو رقم الجوال'
            );

            return;

        }

        alert(
            'تم إرسال رمز التحقق'
        );

        window.location.href =
        '/auth/verify-otp.html';

    }
);
```
