"""
Enhanced LSTM Training with GPU Optimization & Advanced Visualizations
Run: python train_lstm_enhanced.py
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os
import joblib
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Bidirectional, BatchNormalization
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau, TensorBoard
import xgboost as xgb
import shap

# Configuration
sns.set_style("whitegrid")
DATA_FILE = 'sp500_historical_data.csv'
SCALER_FILE = 'scaler.joblib'
LSTM_MODEL_FILE = 'sp500_lstm_model.h5'
XGB_MODEL_FILE = 'sp500_xgb_model.json'
OUTPUT_DIR = 'training_outputs'
PLOTS_DIR = os.path.join(OUTPUT_DIR, 'plots')
LOGS_DIR = os.path.join(OUTPUT_DIR, 'logs')
os.makedirs(PLOTS_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)

WINDOW_SIZE = 60
TRAIN_SPLIT = 0.8
EPOCHS = 100
BATCH_SIZE = 32
PATIENCE = 15

def configure_gpu():
    """Configure GPU with mixed precision"""
    print("=" * 70)
    print("GPU CONFIGURATION")
    print("=" * 70)
    print(f"TensorFlow: {tf.__version__}")
    
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        try:
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
            print(f"✅ {len(gpus)} GPU(s) found and configured")
            print(f"   {tf.test.gpu_device_name()}")
            
            # Enable mixed precision for speed
            policy = tf.keras.mixed_precision.Policy('mixed_float16')
            tf.keras.mixed_precision.set_global_policy(policy)
            print(f"   Mixed precision enabled: {policy.name}")
            return True
        except Exception as e:
            print(f"⚠️ GPU config error: {e}")
    else:
        print("⚠️ No GPU found - using CPU")
    return False

def load_and_clean_data(filepath):
    """Load and clean data"""
    print("\nLoading data...")
    df = pd.read_csv(filepath, index_col=0, parse_dates=True)
    clean_df = df.filter(['Close']).copy()
    clean_df['Close'] = pd.to_numeric(clean_df['Close'], errors='coerce')
    clean_df = clean_df.dropna()
    print(f"✅ Loaded {len(clean_df)} rows")
    print(f"   Range: ${clean_df['Close'].min():.2f} - ${clean_df['Close'].max():.2f}")
    return clean_df.values, clean_df

def create_sequences(data, window_size, lstm=True):
    """Create sequences"""
    x, y = [], []
    for i in range(window_size, len(data)):
        x.append(data[i-window_size:i, 0])
        y.append(data[i, 0])
    x, y = np.array(x), np.array(y)
    if lstm:
        x = x.reshape(x.shape[0], x.shape[1], 1)
    return x, y

def build_model(input_shape):
    """Build enhanced LSTM"""
    model = Sequential([
        LSTM(128, return_sequences=True, input_shape=input_shape),
        BatchNormalization(),
        Dropout(0.3),
        LSTM(64, return_sequences=True),
        BatchNormalization(),
        Dropout(0.3),
        LSTM(32, return_sequences=False),
        Dropout(0.2),
        Dense(25, activation='relu'),
        Dense(1)
    ])
    model.compile(optimizer=tf.keras.optimizers.Adam(0.001), 
                 loss='huber', metrics=['mae', 'mse'])
    print("\n✅ Model built")
    model.summary()
    return model

def plot_training(history):
    """Plot training history"""
    fig, axes = plt.subplots(2, 2, figsize=(16, 10))
    fig.suptitle('Training History', fontsize=16, fontweight='bold')
    
    axes[0,0].plot(history.history['loss'], label='Train')
    axes[0,0].plot(history.history['val_loss'], label='Val')
    axes[0,0].set_title('Loss'); axes[0,0].legend(); axes[0,0].grid(True)
    
    axes[0,1].plot(history.history['mae'], label='Train MAE')
    axes[0,1].plot(history.history['val_mae'], label='Val MAE')
    axes[0,1].set_title('MAE'); axes[0,1].legend(); axes[0,1].grid(True)
    
    axes[1,0].plot(history.history['mse'], label='Train MSE')
    axes[1,0].plot(history.history['val_mse'], label='Val MSE')
    axes[1,0].set_title('MSE'); axes[1,0].legend(); axes[1,0].grid(True)
    
    best = np.argmin(history.history['val_loss'])
    axes[1,1].text(0.5, 0.5, f'Best Epoch: {best}\nVal Loss: {history.history["val_loss"][best]:.6f}',
                  ha='center', va='center', transform=axes[1,1].transAxes, fontsize=14)
    axes[1,1].set_title('Best Model')
    
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, 'training_history.png'), dpi=300)
    print(f"✅ Training history saved")
    plt.close()

def plot_predictions(df, train_len, y_test, pred_lstm, pred_xgb):
    """Plot predictions"""
    fig, axes = plt.subplots(2, 1, figsize=(18, 10))
    
    dates = df.index[train_len + WINDOW_SIZE:]
    min_len = min(len(dates), len(y_test), len(pred_lstm))
    
    # Full view
    axes[0].plot(df.index[:train_len], df['Close'][:train_len], label='Train', alpha=0.7)
    axes[0].plot(dates[:min_len], y_test[:min_len], label='Actual', color='blue', linewidth=2)
    axes[0].plot(dates[:min_len], pred_lstm[:min_len], label='LSTM', color='orange', linestyle='--', linewidth=2)
    axes[0].plot(dates[:min_len], pred_xgb[:min_len], label='XGBoost', color='green', linestyle='--', linewidth=2)
    axes[0].set_title('Full Prediction View', fontsize=14, fontweight='bold')
    axes[0].legend(); axes[0].grid(True)
    
    # Zoomed
    axes[1].plot(dates[:min_len], y_test[:min_len], label='Actual', marker='o', markersize=2)
    axes[1].plot(dates[:min_len], pred_lstm[:min_len], label='LSTM', marker='s', markersize=2)
    axes[1].plot(dates[:min_len], pred_xgb[:min_len], label='XGBoost', marker='^', markersize=2)
    axes[1].set_title('Validation Period Detail', fontsize=14, fontweight='bold')
    axes[1].legend(); axes[1].grid(True)
    
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, 'predictions.png'), dpi=300)
    print("✅ Predictions saved")
    plt.close()

def plot_errors(y_test, pred_lstm, pred_xgb):
    """Plot error analysis"""
    fig, axes = plt.subplots(2, 3, figsize=(18, 10))
    fig.suptitle('Error Analysis', fontsize=16, fontweight='bold')
    
    y = y_test.flatten()
    lstm = pred_lstm.flatten()
    xgb = pred_xgb.flatten()
    
    err_lstm = y - lstm
    err_xgb = y - xgb
    
    # Histograms
    axes[0,0].hist(err_lstm, bins=50, alpha=0.7, color='orange', edgecolor='black')
    axes[0,0].axvline(0, color='red', linestyle='--'); axes[0,0].set_title('LSTM Errors')
    axes[0,1].hist(err_xgb, bins=50, alpha=0.7, color='green', edgecolor='black')
    axes[0,1].axvline(0, color='red', linestyle='--'); axes[0,1].set_title('XGBoost Errors')
    axes[0,2].boxplot([err_lstm, err_xgb], labels=['LSTM', 'XGBoost']); axes[0,2].set_title('Error Comparison')
    
    # Scatter plots
    axes[1,0].scatter(y, lstm, alpha=0.5, s=10)
    axes[1,0].plot([y.min(), y.max()], [y.min(), y.max()], 'r--'); axes[1,0].set_title('LSTM: Actual vs Pred')
    axes[1,1].scatter(y, xgb, alpha=0.5, s=10, color='green')
    axes[1,1].plot([y.min(), y.max()], [y.min(), y.max()], 'r--'); axes[1,1].set_title('XGBoost: Actual vs Pred')
    
    # Residuals over time
    axes[1,2].plot(err_lstm, label='LSTM', alpha=0.7)
    axes[1,2].plot(err_xgb, label='XGBoost', alpha=0.7)
    axes[1,2].axhline(0, color='red', linestyle='--'); axes[1,2].set_title('Residuals'); axes[1,2].legend()
    
    for ax in axes.flat: ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, 'error_analysis.png'), dpi=300)
    print("✅ Error analysis saved")
    plt.close()

# Main training
if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("ENHANCED LSTM TRAINING")
    print("=" * 70)
    
    # GPU setup
    has_gpu = configure_gpu()
    
    # Load data
    data, df = load_and_clean_data(DATA_FILE)
    
    # Preprocess
    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(data)
    train_len = int(len(scaled) * TRAIN_SPLIT)
    train_data = scaled[:train_len]
    test_data = scaled[train_len - WINDOW_SIZE:]
    
    # Create sequences
    x_train_lstm, y_train = create_sequences(train_data, WINDOW_SIZE, True)
    x_test_lstm, y_test = create_sequences(test_data, WINDOW_SIZE, True)
    x_train_xgb, _ = create_sequences(train_data, WINDOW_SIZE, False)
    x_test_xgb, _ = create_sequences(test_data, WINDOW_SIZE, False)
    
    # Build and train LSTM
    model = build_model((x_train_lstm.shape[1], 1))
    callbacks = [
        ModelCheckpoint('sp500_lstm_best.h5', monitor='val_loss', save_best_only=True),
        EarlyStopping(monitor='val_loss', patience=PATIENCE, restore_best_weights=True),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5),
        TensorBoard(log_dir=LOGS_DIR)
    ]
    
    print(f"\nTraining LSTM for {EPOCHS} epochs...")
    history = model.fit(x_train_lstm, y_train, batch_size=BATCH_SIZE, epochs=EPOCHS,
                       validation_data=(x_test_lstm, y_test), callbacks=callbacks, verbose=1)
    
    # Train XGBoost
    print("\nTraining XGBoost...")
    tree_method = 'gpu_hist' if has_gpu else 'hist'
    xgb_model = xgb.XGBRegressor(tree_method=tree_method, n_estimators=1000, learning_rate=0.01,
                                 max_depth=5, early_stopping_rounds=50, n_jobs=-1)
    xgb_model.fit(x_train_xgb, y_train, eval_set=[(x_test_xgb, y_test)], verbose=False)
    
    # Predictions
    pred_lstm = scaler.inverse_transform(model.predict(x_test_lstm))
    pred_xgb = scaler.inverse_transform(xgb_model.predict(x_test_xgb).reshape(-1,1))
    y_test_unscaled = scaler.inverse_transform(y_test.reshape(-1,1))
    
    # Metrics
    lstm_rmse = np.sqrt(mean_squared_error(y_test_unscaled, pred_lstm))
    xgb_rmse = np.sqrt(mean_squared_error(y_test_unscaled, pred_xgb))
    print(f"\n📊 LSTM RMSE: ${lstm_rmse:.2f}")
    print(f"📊 XGBoost RMSE: ${xgb_rmse:.2f}")
    
    # Save
    model.save(LSTM_MODEL_FILE)
    xgb_model.save_model(XGB_MODEL_FILE)
    joblib.dump(scaler, SCALER_FILE)
    print(f"\n✅ Models saved")
    
    # Plots
    plot_training(history)
    plot_predictions(df, train_len, y_test_unscaled, pred_lstm, pred_xgb)
    plot_errors(y_test_unscaled, pred_lstm, pred_xgb)
    
    print("\n" + "=" * 70)
    print("✅ TRAINING COMPLETE!")
    print("=" * 70)
    print(f"Outputs in: {PLOTS_DIR}")
    print(f"TensorBoard logs: tensorboard --logdir {LOGS_DIR}")
