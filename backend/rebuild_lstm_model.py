"""
Rebuild LSTM model with current TensorFlow/Keras version
This fixes compatibility issues with older model formats
"""

import numpy as np
from tensorflow import keras
from tensorflow.keras import layers
import joblib

def rebuild_lstm_model():
    """
    Rebuild the LSTM model with current Keras version
    Creates a simple LSTM model for stock price prediction
    """
    print("Building new LSTM model...")
    
    # Model architecture (standard LSTM for time series)
    model = keras.Sequential([
        layers.Input(shape=(60, 1)),  # 60 timesteps, 1 feature
        layers.LSTM(50, return_sequences=True),
        layers.Dropout(0.2),
        layers.LSTM(50, return_sequences=False),
        layers.Dropout(0.2),
        layers.Dense(25),
        layers.Dense(1)
    ])
    
    # Compile model
    model.compile(
        optimizer='adam',
        loss='mean_squared_error'
    )
    
    print("✅ Model architecture created")
    print(f"   Input shape: {model.input_shape}")
    print(f"   Output shape: {model.output_shape}")
    print(f"   Total parameters: {model.count_params():,}")
    
    # Save the new model
    model.save('models/sp500_lstm_model_new.h5')
    print("✅ New model saved as 'models/sp500_lstm_model_new.h5'")
    
    return model

def test_model_loading():
    """Test if the new model can be loaded"""
    try:
        print("\nTesting model loading...")
        model = keras.models.load_model('models/sp500_lstm_model_new.h5')
        print("✅ Model loaded successfully!")
        
        # Test prediction
        test_input = np.random.random((1, 60, 1))
        prediction = model.predict(test_input, verbose=0)
        print(f"✅ Test prediction successful: {prediction[0][0]:.4f}")
        
        return True
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("LSTM Model Rebuilder")
    print("=" * 60)
    print()
    
    # Check if scaler exists
    try:
        scaler = joblib.load('models/scaler.joblib')
        print("✅ Scaler loaded successfully")
    except Exception as e:
        print(f"⚠️ Warning: Could not load scaler: {e}")
        print("   The scaler is needed for proper predictions")
    
    print()
    
    # Rebuild model
    model = rebuild_lstm_model()
    
    print()
    
    # Test loading
    test_model_loading()
    
    print()
    print("=" * 60)
    print("INSTRUCTIONS:")
    print("=" * 60)
    print("1. Backup old model:")
    print("   Move 'models/sp500_lstm_model.h5' to 'models/sp500_lstm_model_old.h5'")
    print()
    print("2. Use new model:")
    print("   Rename 'models/sp500_lstm_model_new.h5' to 'models/sp500_lstm_model.h5'")
    print()
    print("3. Restart Flask server:")
    print("   python app.py")
    print()
    print("NOTE: The new model has random weights (not trained).")
    print("      Predictions will be random until you train it with real data.")
    print("      For demo purposes, this will work to show the UI.")
    print("=" * 60)
