// API Configuration
const API_BASE_URL = import.meta.env.VITE_SENTIMENT_API_URL || 'http://localhost:5000';

export interface PricePrediction {
  day: number;
  date: string;
  price: number;
  change: number;
  change_percent: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  direction: 'positive' | 'negative';
  days_ago: number;
}

export interface PriceXAI {
  method: 'SHAP';
  feature_importances: FeatureImportance[];
  explanation: string;
  top_influential_days: number[];
}

export interface PriceForecast {
  symbol: string;
  current_price: number;
  predictions: PricePrediction[];
  overall_trend: 'bullish' | 'bearish';
  confidence: number;
  xai: PriceXAI;
}

class PriceAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Predict stock prices using provided historical data
   */
  async predictPriceWithData(
    symbol: string,
    historicalPrices: number[],
    forecastDays: number = 5,
    lookbackDays: number = 60
  ): Promise<PriceForecast> {
    try {
      const response = await fetch(`${this.baseUrl}/api/price/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          historical_prices: historicalPrices,
          forecast_days: Math.min(Math.max(forecastDays, 1), 10), // Clamp 1-10
          lookback_days: Math.min(Math.max(lookbackDays, 30), 120), // Clamp 30-120
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to predict price');
      }

      const data: PriceForecast = await response.json();
      return data;
    } catch (error) {
      console.error('Error predicting price:', error);
      throw error;
    }
  }

  /**
   * Predict stock prices for next N days (legacy - fetches via yfinance)
   */
  async predictPrice(symbol: string, days: number = 5): Promise<PriceForecast> {
    try {
      const response = await fetch(`${this.baseUrl}/api/price/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          days: Math.min(Math.max(days, 1), 5), // Clamp between 1-5
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to predict price');
      }

      const data: PriceForecast = await response.json();
      return data;
    } catch (error) {
      console.error('Error predicting price:', error);
      throw error;
    }
  }

  /**
   * Check if API is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const priceApi = new PriceAPI();
