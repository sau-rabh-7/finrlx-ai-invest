from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import os
from dotenv import load_dotenv
from sentiment_analyzer import FinBERTSentimentAnalyzer
from price_predictor import get_predictor
from optimization_api import optimization_bp
import threading

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configure CORS
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://localhost:5000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Initialize FinBERT analyzer (singleton pattern with thread lock)
analyzer = None
analyzer_lock = threading.Lock()

def get_analyzer():
    """Get or create the FinBERT analyzer instance (thread-safe)"""
    global analyzer
    if analyzer is None:
        with analyzer_lock:
            # Double-check locking pattern
            if analyzer is None:
                print("Initializing FinBERT model...")
                analyzer = FinBERTSentimentAnalyzer()
                print("FinBERT model loaded successfully!")
    return analyzer

# Register blueprints
app.register_blueprint(optimization_bp, url_prefix='/api/portfolio')

# Add CORS headers
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'TradeX Portfolio API',
        'version': '1.0.0',
        'endpoints': [
            '/api/portfolio/optimize (POST)',
            '/api/sentiment/analyze (POST)',
            '/api/sentiment/batch (POST)',
            '/api/price/predict (POST)'
        ]
    })

@app.route('/api/sentiment/analyze', methods=['POST'])
def analyze_sentiment():
    """
    Analyze sentiment of a single text
    
    Request body:
    {
        "text": "Your financial text here",
        "title": "Optional title"
    }
    
    Response:
    {
        "sentiment": "positive" | "negative" | "neutral",
        "score": float (-1 to 1),
        "confidence": float (0 to 1),
        "recommendation": "BUY" | "SELL" | "HOLD",
        "analysis": "Brief explanation",
        "xai": {
            "method": "LIME" | "SHAP",
            "wordImportances": [...],
            "topPositiveWords": [...],
            "topNegativeWords": [...],
            "explanation": "Detailed explanation"
        }
    }
    """
    try:
        # Get request data
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'error': 'Missing required field: text'
            }), 400
        
        text = data.get('text', '').strip()
        title = data.get('title', '').strip()
        
        if not text:
            return jsonify({
                'error': 'Text cannot be empty'
            }), 400
        
        # Combine title and text if title exists
        full_text = f"{title}. {text}" if title else text
        
        # Get analyzer and perform analysis
        sentiment_analyzer = get_analyzer()
        result = sentiment_analyzer.analyze(full_text)
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error in analyze_sentiment: {str(e)}")
        return jsonify({
            'error': f'Failed to analyze sentiment: {str(e)}'
        }), 500

@app.route('/api/sentiment/batch', methods=['POST'])
def analyze_batch():
    """
    Analyze sentiment of multiple texts
    
    Request body:
    {
        "items": [
            {"text": "Text 1", "title": "Title 1"},
            {"text": "Text 2", "title": "Title 2"}
        ]
    }
    
    Response:
    {
        "results": [...]
    }
    """
    try:
        # Get request data
        data = request.get_json()
        
        if not data or 'items' not in data:
            return jsonify({
                'error': 'Missing required field: items'
            }), 400
        
        items = data.get('items', [])
        
        if not isinstance(items, list) or len(items) == 0:
            return jsonify({
                'error': 'items must be a non-empty array'
            }), 400
        
        # Get analyzer
        sentiment_analyzer = get_analyzer()
        
        # Analyze each item
        results = []
        for item in items:
            if not isinstance(item, dict) or 'text' not in item:
                results.append({
                    'error': 'Invalid item format'
                })
                continue
            
            text = item.get('text', '').strip()
            title = item.get('title', '').strip()
            
            if not text:
                results.append({
                    'error': 'Text cannot be empty'
                })
                continue
            
            # Combine title and text
            full_text = f"{title}. {text}" if title else text
            
            try:
                result = sentiment_analyzer.analyze(full_text)
                results.append(result)
            except Exception as e:
                print(f"Error analyzing item: {str(e)}")
                results.append({
                    'error': f'Failed to analyze: {str(e)}'
                })
        
        return jsonify({
            'results': results
        }), 200
        
    except Exception as e:
        print(f"Error in analyze_batch: {str(e)}")
        return jsonify({
            'error': f'Failed to analyze batch: {str(e)}'
        }), 500

@app.route('/api/sentiment/keywords', methods=['GET'])
def get_keywords():
    """Get the list of financial keywords used for analysis"""
    try:
        sentiment_analyzer = get_analyzer()
        return jsonify({
            'positive_keywords': sentiment_analyzer.positive_keywords,
            'negative_keywords': sentiment_analyzer.negative_keywords
        }), 200
    except Exception as e:
        return jsonify({
            'error': f'Failed to get keywords: {str(e)}'
        }), 500

@app.route('/api/price/predict', methods=['POST'])
def predict_price():
    """
    Predict stock prices using LSTM model with SHAP explainability
    
    Request body (Option 1 - with historical data):
    {
        "symbol": "AAPL",
        "historical_prices": [150.2, 151.3, ...],  // Array of closing prices
        "forecast_days": 5,      // 1-10 days to predict
        "lookback_days": 60      // 30-120 days to use for prediction
    }
    
    Request body (Option 2 - fetch via yfinance):
    {
        "symbol": "AAPL",
        "days": 5  // 1-5 days
    }
    
    Response:
    {
        "symbol": "AAPL",
        "current_price": 150.25,
        "lookback_days": 60,
        "forecast_days": 5,
        "predictions": [
            {
                "day": 1,
                "date": "2025-10-27",
                "price": 151.50,
                "change": 1.25,
                "change_percent": 0.83
            },
            ...
        ],
        "overall_trend": "bullish" | "bearish",
        "confidence": 0.85,
        "xai": {
            "method": "SHAP",
            "feature_importances": [...],
            "explanation": "...",
            "top_influential_days": [1, 5, 10]
        }
    }
    """
    try:
        # Get request data
        data = request.get_json()
        
        if not data or 'symbol' not in data:
            return jsonify({
                'error': 'Missing required field: symbol'
            }), 400
        
        symbol = data.get('symbol', '').strip().upper()
        
        # Check if historical data is provided
        historical_prices = data.get('historical_prices')
        
        if historical_prices:
            # Use provided historical data (preferred method)
            forecast_days = data.get('forecast_days', 5)
            lookback_days = data.get('lookback_days', 60)
            
            # Validate parameters
            if not isinstance(forecast_days, int) or forecast_days < 1 or forecast_days > 10:
                return jsonify({
                    'error': 'forecast_days must be an integer between 1 and 10'
                }), 400
            
            if not isinstance(lookback_days, int) or lookback_days < 30 or lookback_days > 120:
                return jsonify({
                    'error': 'lookback_days must be an integer between 30 and 120'
                }), 400
            
            if not isinstance(historical_prices, list) or len(historical_prices) < lookback_days:
                return jsonify({
                    'error': f'historical_prices must be an array with at least {lookback_days} values'
                }), 400
            
            print(f"\n📊 Price prediction for {symbol}")
            print(f"   Using provided data: {len(historical_prices)} prices")
            print(f"   Lookback: {lookback_days} days, Forecast: {forecast_days} days")
            
            # Get predictor and make prediction
            predictor = get_predictor()
            result = predictor.predict_with_historical_data(
                symbol, 
                historical_prices, 
                forecast_days, 
                lookback_days
            )
            
            print(f"✅ Prediction successful for {symbol}")
            return jsonify(result), 200
            
        else:
            # Fallback to yfinance fetch (legacy method)
            days = data.get('days', 5)
            
            if not isinstance(days, int) or days < 1 or days > 5:
                return jsonify({
                    'error': 'days must be an integer between 1 and 5'
                }), 400
            
            print(f"\n📊 Price prediction for {symbol} (fetching via yfinance)")
            print(f"   Forecast: {days} days")
            
            predictor = get_predictor()
            result = predictor.predict_with_explanation(symbol, days)
            
            print(f"✅ Prediction successful for {symbol}")
            return jsonify(result), 200
        
    except ValueError as e:
        # Data validation errors
        error_msg = str(e)
        print(f"⚠️ Data error: {error_msg}")
        
        if "No data found" in error_msg or "Insufficient data" in error_msg:
            return jsonify({
                'error': f'Unable to fetch data for {symbol}. The stock may be delisted or unavailable.',
                'suggestion': 'Provide historical_prices array in the request body.'
            }), 404
        else:
            return jsonify({
                'error': f'Data error: {error_msg}'
            }), 400
            
    except Exception as e:
        # Other errors
        error_msg = str(e)
        print(f"❌ Error in predict_price: {error_msg}")
        
        # Check for specific errors
        if "batch_shape" in error_msg or "deserializing" in error_msg:
            return jsonify({
                'error': 'Model compatibility issue. Please retrain the model with current TensorFlow version.',
                'suggestion': 'Run: python train_lstm_enhanced.py'
            }), 500
        else:
            return jsonify({
                'error': f'Prediction failed: {error_msg}'
            }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV', 'production') == 'development'
    # app.run(debug=True) # debug=False for production
    
    print(f"Starting FinBERT Sentiment Analysis API on port {port}")
    print(f"Debug mode: {debug}")
    print("")
    
    # Pre-load the model on startup
    print("Pre-loading FinBERT model...")
    get_analyzer()
    print("")
    print("✅ Server ready! Model loaded and ready to analyze.")
    print("")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
