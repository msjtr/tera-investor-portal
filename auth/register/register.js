let currentStep = 0;
const steps = document.querySelectorAll('.step');
const nodes = document.querySelectorAll('.step-node');

function changeStep(n) {
    steps[currentStep].classList.remove('active');
    nodes[currentStep].classList.remove('active');
    
    currentStep += n;
    
    // التحكم في ظهور زر "إنشاء الحساب" في المرحلة الأخيرة
    const btnNext = document.querySelector('.btn-next');
    const btnSubmit = document.querySelector('.btn-submit');
    
    if (currentStep === steps.length - 1) {
        btnNext.style.display = 'none';
        btnSubmit.style.display = 'inline-block';
    } else {
        btnNext.style.display = 'inline-block';
        btnSubmit.style.display = 'none';
    }

    steps[currentStep].classList.add('active');
    nodes[currentStep].classList.add('active');
}
