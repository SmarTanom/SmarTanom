@echo off
REM Quick admin access for SmarTanom development
echo =====================================
echo   SmarTanom Quick Admin Access
echo =====================================
echo.

REM Check if we're in the right directory
if not exist "manage.py" (
    echo Error: Please run this from the backend directory
    echo Current directory should contain manage.py
    pause
    exit /b 1
)

echo [1] Open Admin Panel (manual login)
echo [2] Show existing superusers
echo [3] Create new superuser
echo [4] Reset superuser password
echo [5] Development auto-login
echo.
set /p choice="Choose option (1-5): "

if "%choice%"=="1" (
    echo Opening admin panel...
    start http://127.0.0.1:8000/admin/
    echo.
    echo ========================================
    echo   ADMIN LOGIN CREDENTIALS:
    echo ========================================
    echo   Email: smartanom01@gmail.com
    echo   Password: smartanomadmin4r1
    echo ========================================
) else if "%choice%"=="2" (
    echo.
    echo Existing superusers:
    python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); [print(f'Username: {u.username}, Email: {u.email}') for u in User.objects.filter(is_superuser=True)]"
) else if "%choice%"=="3" (
    echo.
    echo Creating new superuser...
    python manage.py createsuperuser
) else if "%choice%"=="4" (
    echo.
    echo Available superusers:
    python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); [print(f'{i+1}. {u.username}') for i, u in enumerate(User.objects.filter(is_superuser=True))]"
    echo.
    set /p username="Enter username to reset password: "
    python manage.py changepassword %username%
) else if "%choice%"=="5" (
    echo.
    echo Creating development auto-login...
    python manage.py dev_login
) else (
    echo Invalid choice!
)

echo.
pause
