@echo off
REM SmarTanom Local Development Server
REM Port: 8000 | Database: SQLite | Data: Your mock data

echo 🚀 Starting SmarTanom Local Development Server
echo Port: 8000 ^| Database: SQLite

REM Check if backend directory exists
if not exist "backend" (
    echo ❌ Error: Must run from SmarTanom root directory
    exit /b 1
)

REM Change to backend directory
cd backend

REM Check for virtual environment
if not exist ".venv" (
    echo 📦 Creating virtual environment...
    python -m venv .venv
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call .venv\Scripts\activate.bat

REM Install dependencies
echo 📥 Installing dependencies...
pip install -r requirements.txt

REM Run migrations
echo 🗄️ Running migrations...
python manage.py migrate

echo.
echo 🌐 Server will be available at:
echo    Admin: http://127.0.0.1:8000/admin/
echo    API:   http://127.0.0.1:8000/api/
echo.
echo 🔑 Admin Login:
echo    Email: smartanom01@gmail.com
echo    Pass:  smartanomadmin4r1
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start Django development server
python manage.py runserver
