@echo off
echo Starting TradeX Portfolio Optimization Backend...
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo Virtual environment not found. Creating one...
    python -m venv venv
    echo.
    
    echo Installing Python dependencies...
    call venv\Scripts\activate
    python -m pip install --upgrade pip
    pip install -r requirements.txt
    echo.
) else (
    call venv\Scripts\activate
)

REM Check if requirements are installed
echo Checking dependencies...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r requirements.txt
    echo.
)

REM Check if .env exists
if not exist ".env" (
    echo Creating .env file from .env.example...
    copy .env.example .env
    echo Please edit .env file with your configuration
    echo.
)

REM Start the Flask server
echo Starting Flask server...
python app.py

pause
