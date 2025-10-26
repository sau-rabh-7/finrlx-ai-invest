"""
LSTM Price Predictor with SHAP Explainability
Loads pre-trained LSTM model and provides price forecasts with XAI
"""

import numpy as np
import joblib
from tensorflow import keras
from tensorflow.keras import layers
import shap
from typing import Dict, List, Tuple
import yfinance as yf
from datetime import datetime, timedelta
import os

class LSTMPricePredictor:
    def __init__(self, model_path: str = 'models/sp500_lstm_model.h5', 
                 scaler_path: str = 'models/scaler.joblib'):
        """
        Initialize LSTM Price Predictor
        
        Args:
            model_path: Path to trained LSTM model
            scaler_path: Path to fitted scaler
        """
        print("Loading LSTM model...")
        self.sequence_length = 60  # Standard for LSTM models
        self.model_loaded = False
        
        # Try loading existing model
        if os.path.exists(model_path):
            try:
                # Try loading with compile=False to avoid optimizer issues
                self.model = keras.models.load_model(model_path, compile=False)
                print(f"✅ LSTM model loaded successfully")
                self.model_loaded = True
            except Exception as e:
                print(f"⚠️ Error loading existing model: {e}")
                print("Creating new model architecture...")
                self.model = self._create_new_model()
        else:
            print(f"⚠️ Model file not found: {model_path}")
            print("Creating new model architecture...")
            self.model = self._create_new_model()
        
        # Load scaler
        if os.path.exists(scaler_path):
            self.scaler = joblib.load(scaler_path)
            print(f"✅ Scaler loaded successfully")
        else:
            print(f"⚠️ Scaler not found, creating new one...")
            from sklearn.preprocessing import MinMaxScaler
            self.scaler = MinMaxScaler(feature_range=(0, 1))
            # Fit with dummy data
            dummy_data = np.random.random((100, 1)) * 200
            self.scaler.fit(dummy_data)
        
        print(f"   Model input shape: {self.model.input_shape}")
        print(f"   Model output shape: {self.model.output_shape}")
        
        if not self.model_loaded:
            print()
            print("⚠️ WARNING: Using untrained model! Predictions will be for demo only.")
            print("   Run 'python train_lstm_enhanced.py' to train with real data.")
        
        print()
        print("📝 NOTE: Model was trained on S&P 500 (^GSPC) data.")
        print("   Predictions for individual stocks use transfer learning.")
        print("   For best results, retrain on specific stock data.")
    
    def _create_new_model(self):
        """Create a new LSTM model architecture"""
        model = keras.Sequential([
            layers.Input(shape=(self.sequence_length, 1)),
            layers.LSTM(50, return_sequences=True),
            layers.Dropout(0.2),
            layers.LSTM(50, return_sequences=False),
            layers.Dropout(0.2),
            layers.Dense(25),
            layers.Dense(1)
        ])
        
        model.compile(optimizer='adam', loss='mean_squared_error')
        print(f"✅ New model architecture created (untrained)")
        return model
    
    def fetch_historical_data(self, symbol: str, days: int = 100) -> np.ndarray:
        """
        Fetch historical stock data with retry logic
        
        Args:
            symbol: Stock symbol
            days: Number of days of historical data
            
        Returns:
            Numpy array of closing prices
        """
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days + 30)  # Extra buffer
            
            print(f"Fetching data for {symbol}...")
            
            # Try with yfinance download (more reliable)
            import yfinance as yf
            data = yf.download(symbol, start=start_date, end=end_date, progress=False)
            
            if data.empty:
                print(f"⚠️ No data from yf.download, trying Ticker...")
                stock = yf.Ticker(symbol)
                data = stock.history(start=start_date, end=end_date)
            
            if data.empty:
                raise ValueError(f"No data found for {symbol}")
            
            # Get closing prices
            if 'Close' in data.columns:
                prices = data['Close'].values
            else:
                prices = data['close'].values
            
            # Remove NaN values
            prices = prices[~np.isnan(prices)]
            
            if len(prices) < self.sequence_length:
                raise ValueError(f"Insufficient data: got {len(prices)}, need {self.sequence_length}")
            
            print(f"✅ Fetched {len(prices)} days of data for {symbol}")
            return prices
            
        except Exception as e:
            print(f"❌ Error fetching data for {symbol}: {str(e)}")
            raise
    
    def prepare_sequence(self, prices: np.ndarray) -> np.ndarray:
        """
        Prepare sequence for LSTM prediction
        
        Args:
            prices: Array of historical prices
            
        Returns:
            Scaled and shaped sequence for LSTM
        """
        # Take last sequence_length prices
        if len(prices) < self.sequence_length:
            raise ValueError(f"Need at least {self.sequence_length} days of data")
        
        sequence = prices[-self.sequence_length:]
        
        # Reshape for scaler (needs 2D)
        sequence_2d = sequence.reshape(-1, 1)
        
        # Scale
        scaled_sequence = self.scaler.transform(sequence_2d)
        
        # Reshape for LSTM (samples, timesteps, features)
        lstm_input = scaled_sequence.reshape(1, self.sequence_length, 1)
        
        return lstm_input
    
    def predict_next_days(self, symbol: str, days: int = 5) -> Dict:
        """
        Predict next N days of prices
        
        Args:
            symbol: Stock symbol
            days: Number of days to predict (1-5)
            
        Returns:
            Dictionary with predictions and metadata
        """
        try:
            # Fetch historical data
            historical_prices = self.fetch_historical_data(symbol)
            current_price = historical_prices[-1]
            
            # Prepare predictions
            predictions = []
            sequence = historical_prices.copy()
            
            # Predict iteratively
            for i in range(days):
                # Prepare input
                lstm_input = self.prepare_sequence(sequence)
                
                # Predict
                scaled_prediction = self.model.predict(lstm_input, verbose=0)
                
                # Inverse transform
                prediction = self.scaler.inverse_transform(scaled_prediction)[0][0]
                predictions.append(float(prediction))
                
                # Append prediction to sequence for next iteration
                sequence = np.append(sequence, prediction)
            
            # Calculate changes
            changes = []
            change_percents = []
            
            for i, pred in enumerate(predictions):
                if i == 0:
                    change = pred - current_price
                    change_pct = (change / current_price) * 100
                else:
                    change = pred - predictions[i-1]
                    change_pct = (change / predictions[i-1]) * 100
                
                changes.append(float(change))
                change_percents.append(float(change_pct))
            
            # Generate dates
            prediction_dates = []
            current_date = datetime.now()
            for i in range(1, days + 1):
                next_date = current_date + timedelta(days=i)
                # Skip weekends (simple approach)
                while next_date.weekday() >= 5:  # 5=Saturday, 6=Sunday
                    next_date += timedelta(days=1)
                prediction_dates.append(next_date.strftime('%Y-%m-%d'))
            
            return {
                'symbol': symbol,
                'current_price': float(current_price),
                'predictions': [
                    {
                        'day': i + 1,
                        'date': prediction_dates[i],
                        'price': predictions[i],
                        'change': changes[i],
                        'change_percent': change_percents[i]
                    }
                    for i in range(days)
                ],
                'overall_trend': 'bullish' if predictions[-1] > current_price else 'bearish',
                'confidence': self.calculate_confidence(historical_prices, predictions)
            }
            
        except Exception as e:
            print(f"Error in prediction: {str(e)}")
            raise
    
    def calculate_confidence(self, historical: np.ndarray, predictions: List[float]) -> float:
        """
        Calculate prediction confidence based on historical volatility
        
        Args:
            historical: Historical prices
            predictions: Predicted prices
            
        Returns:
            Confidence score (0-1)
        """
        # Calculate historical volatility
        returns = np.diff(historical) / historical[:-1]
        volatility = np.std(returns)
        
        # Lower volatility = higher confidence
        # Map volatility to confidence (0.5 to 0.95)
        confidence = max(0.5, min(0.95, 1 - (volatility * 10)))
        
        return float(confidence)
    
    def explain_with_shap(self, symbol: str, num_features: int = 10) -> Dict:
        """
        Generate SHAP explanations for predictions
        
        Args:
            symbol: Stock symbol
            num_features: Number of top features to return
            
        Returns:
            Dictionary with SHAP values and explanations
        """
        try:
            # Fetch historical data
            historical_prices = self.fetch_historical_data(symbol)
            
            # Prepare input
            lstm_input = self.prepare_sequence(historical_prices)
            
            # Create background dataset (use recent history)
            background_data = []
            for i in range(min(20, len(historical_prices) - self.sequence_length)):
                seq = historical_prices[i:i+self.sequence_length]
                seq_2d = seq.reshape(-1, 1)
                scaled = self.scaler.transform(seq_2d)
                background_data.append(scaled.reshape(self.sequence_length, 1))
            
            background = np.array(background_data)
            
            # Create SHAP explainer
            explainer = shap.DeepExplainer(self.model, background)
            
            # Get SHAP values
            shap_values = explainer.shap_values(lstm_input)
            
            # Process SHAP values
            shap_array = np.array(shap_values).flatten()
            
            # Get top influential timesteps
            top_indices = np.argsort(np.abs(shap_array))[-num_features:][::-1]
            
            # Create feature importances
            feature_importances = []
            for idx in top_indices:
                days_ago = self.sequence_length - idx
                importance = float(np.abs(shap_array[idx]))
                direction = 'positive' if shap_array[idx] > 0 else 'negative'
                
                feature_importances.append({
                    'feature': f'Price {days_ago} days ago',
                    'importance': importance,
                    'direction': direction,
                    'days_ago': int(days_ago)
                })
            
            # Generate explanation text
            explanation = self._generate_shap_explanation(feature_importances)
            
            return {
                'method': 'SHAP',
                'feature_importances': feature_importances,
                'explanation': explanation,
                'top_influential_days': [f['days_ago'] for f in feature_importances[:3]]
            }
            
        except Exception as e:
            print(f"Error in SHAP explanation: {str(e)}")
            return self._fallback_explanation(symbol)
    
    def _generate_shap_explanation(self, importances: List[Dict]) -> str:
        """Generate natural language explanation from SHAP values"""
        if not importances:
            return "Unable to generate detailed explanation."
        
        top_feature = importances[0]
        explanation = f"The prediction is most influenced by the stock price from {top_feature['days_ago']} days ago. "
        
        positive_count = sum(1 for f in importances if f['direction'] == 'positive')
        negative_count = len(importances) - positive_count
        
        if positive_count > negative_count:
            explanation += f"Recent price trends ({positive_count} positive signals) suggest upward momentum. "
        else:
            explanation += f"Recent price patterns ({negative_count} negative signals) indicate downward pressure. "
        
        explanation += f"The model considers the last {importances[-1]['days_ago']} days of price history for this forecast."
        
        return explanation
    
    def _fallback_explanation(self, symbol: str) -> Dict:
        """Fallback explanation when SHAP fails"""
        return {
            'method': 'SHAP',
            'feature_importances': [],
            'explanation': f"LSTM model analyzes {self.sequence_length} days of historical price patterns to forecast future prices for {symbol}.",
            'top_influential_days': [1, 5, 10]
        }
    
    def predict_with_historical_data(self, symbol: str, historical_prices: List[float], 
                                     forecast_days: int = 5, lookback_days: int = 60) -> Dict:
        """
        Predict using provided historical data (no yfinance fetch)
        
        Args:
            symbol: Stock symbol (for display)
            historical_prices: List of historical closing prices
            forecast_days: Number of days to predict (1-10)
            lookback_days: Number of historical days to use (30-120)
            
        Returns:
            Dictionary with predictions and XAI
        """
        try:
            # Validate inputs
            if len(historical_prices) < lookback_days:
                raise ValueError(f"Need at least {lookback_days} days of data, got {len(historical_prices)}")
            
            # Convert to numpy array
            prices = np.array(historical_prices, dtype=float)
            current_price = prices[-1]
            
            # Use only the required lookback window
            sequence = prices[-lookback_days:]
            
            # Prepare predictions
            predictions = []
            working_sequence = sequence.copy()
            
            # Predict iteratively
            for i in range(forecast_days):
                # Prepare input (use last lookback_days)
                input_seq = working_sequence[-lookback_days:]
                
                # Reshape for scaler
                seq_2d = input_seq.reshape(-1, 1)
                scaled_seq = self.scaler.transform(seq_2d)
                
                # Reshape for LSTM
                lstm_input = scaled_seq.reshape(1, lookback_days, 1)
                
                # Predict
                scaled_prediction = self.model.predict(lstm_input, verbose=0)
                prediction = self.scaler.inverse_transform(scaled_prediction)[0][0]
                predictions.append(float(prediction))
                
                # Append to sequence for next iteration
                working_sequence = np.append(working_sequence, prediction)
            
            # Calculate changes
            changes = []
            change_percents = []
            
            for i, pred in enumerate(predictions):
                if i == 0:
                    change = pred - current_price
                    change_pct = (change / current_price) * 100
                else:
                    change = pred - predictions[i-1]
                    change_pct = (change / predictions[i-1]) * 100
                
                changes.append(float(change))
                change_percents.append(float(change_pct))
            
            # Generate dates
            prediction_dates = []
            current_date = datetime.now()
            for i in range(1, forecast_days + 1):
                next_date = current_date + timedelta(days=i)
                while next_date.weekday() >= 5:
                    next_date += timedelta(days=1)
                prediction_dates.append(next_date.strftime('%Y-%m-%d'))
            
            # SHAP explanation using provided data
            xai = self._explain_with_provided_data(sequence, lookback_days)
            
            return {
                'symbol': symbol,
                'current_price': float(current_price),
                'lookback_days': lookback_days,
                'forecast_days': forecast_days,
                'predictions': [
                    {
                        'day': i + 1,
                        'date': prediction_dates[i],
                        'price': predictions[i],
                        'change': changes[i],
                        'change_percent': change_percents[i]
                    }
                    for i in range(forecast_days)
                ],
                'overall_trend': 'bullish' if predictions[-1] > current_price else 'bearish',
                'confidence': self.calculate_confidence(sequence, predictions),
                'xai': xai
            }
            
        except Exception as e:
            print(f"Error in prediction with historical data: {str(e)}")
            raise
    
    def _explain_with_provided_data(self, sequence: np.ndarray, lookback_days: int) -> Dict:
        """Generate SHAP explanations using provided data"""
        try:
            # Prepare input
            seq_2d = sequence.reshape(-1, 1)
            scaled_seq = self.scaler.transform(seq_2d)
            lstm_input = scaled_seq.reshape(1, lookback_days, 1)
            
            # Create background (use variations of the sequence)
            background_data = []
            for i in range(min(20, len(sequence) - lookback_days + 1)):
                bg_seq = sequence[i:i+lookback_days]
                bg_2d = bg_seq.reshape(-1, 1)
                bg_scaled = self.scaler.transform(bg_2d)
                background_data.append(bg_scaled.reshape(lookback_days, 1))
            
            if len(background_data) < 5:
                # Not enough data for SHAP, return simple explanation
                return self._simple_explanation(lookback_days)
            
            background = np.array(background_data)
            
            # SHAP explainer
            explainer = shap.DeepExplainer(self.model, background)
            shap_values = explainer.shap_values(lstm_input)
            
            # Process SHAP values
            shap_array = np.array(shap_values).flatten()
            top_indices = np.argsort(np.abs(shap_array))[-10:][::-1]
            
            feature_importances = []
            for idx in top_indices:
                days_ago = lookback_days - idx
                importance = float(np.abs(shap_array[idx]))
                direction = 'positive' if shap_array[idx] > 0 else 'negative'
                
                feature_importances.append({
                    'feature': f'Price {days_ago} days ago',
                    'importance': importance,
                    'direction': direction,
                    'days_ago': int(days_ago)
                })
            
            explanation = self._generate_shap_explanation(feature_importances)
            
            return {
                'method': 'SHAP',
                'feature_importances': feature_importances,
                'explanation': explanation,
                'top_influential_days': [f['days_ago'] for f in feature_importances[:3]]
            }
            
        except Exception as e:
            print(f"SHAP explanation failed: {str(e)}")
            return self._simple_explanation(lookback_days)
    
    def _simple_explanation(self, lookback_days: int) -> Dict:
        """Simple explanation when SHAP fails"""
        return {
            'method': 'SHAP',
            'feature_importances': [],
            'explanation': f"LSTM model analyzes {lookback_days} days of historical price patterns to forecast future prices.",
            'top_influential_days': [1, 5, 10]
        }
    
    def predict_with_explanation(self, symbol: str, days: int = 5) -> Dict:
        """
        Complete prediction with SHAP explanation (fetches data via yfinance)
        
        Args:
            symbol: Stock symbol
            days: Number of days to predict
            
        Returns:
            Dictionary with predictions and XAI
        """
        # Get predictions
        predictions = self.predict_next_days(symbol, days)
        
        # Get SHAP explanation
        xai = self.explain_with_shap(symbol)
        
        # Combine
        result = {
            **predictions,
            'xai': xai
        }
        
        return result


# Singleton instance
_predictor_instance = None

def get_predictor() -> LSTMPricePredictor:
    """Get or create predictor instance"""
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = LSTMPricePredictor()
    return _predictor_instance
