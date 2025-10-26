@echo off
echo Starting FinBERT Sentiment Analysis Backend...
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo Virtual environment not found. Creating one...
    python -m venv venv
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate
echo.

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
