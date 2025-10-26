#!/bin/bash

echo "Starting FinBERT Sentiment Analysis Backend..."
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Creating one..."
    python3 -m venv venv
    echo ""
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate
echo ""

# Check if requirements are installed
if ! pip show flask > /dev/null 2>&1; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
    echo ""
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "Please edit .env file with your configuration"
    echo ""
fi

# Start the Flask server
echo "Starting Flask server..."
python app.py
