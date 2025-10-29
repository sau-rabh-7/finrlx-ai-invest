// Portfolio types
export interface PortfolioItem {
  id: string;
  ticker: string;
  shares: number;
  avgPrice: number;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
  marketValue?: number;
  costBasis?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  sector?: string;
  industry?: string;
  lastUpdated?: string;
}

export interface OptimizationResult {
  status: string;
  optimization: {
    objective: string;
    expected_return: number;
    volatility: number;
    sharpe_ratio: number;
    weights: Record<string, number>;
  };
  allocation: {
    allocation: Record<string, number>;
    leftover: number;
    total_value: number;
    latest_prices: Record<string, number>;
  };
}

// News types
export interface NewsArticle {
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  description?: string;
  imageUrl?: string;
  sentiment?: 'positive' | 'negative' | 'neutral' | null;
  sentimentScore?: number | null;
  sentimentLoading?: boolean;
  analysis?: string;
  xai?: {
    method: string;
    wordImportances: Array<{ word: string; importance: number }>;
    topPositiveWords: string[];
    topNegativeWords: string[];
    explanation: string;
  };
}

// Stock types
export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  peRatio: number;
  dividendYield: number;
  week52High: number;
  week52Low: number;
  sector?: string;
  industry?: string;
  description?: string;
  website?: string;
  logo?: string;
}

// Sentiment types
export interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  analysis: string;
  xai: {
    method: 'LIME' | 'SHAP';
    wordImportances: Array<{ word: string; importance: number }>;
    topPositiveWords: string[];
    topNegativeWords: string[];
    explanation: string;
  };
}

// Price prediction types
export interface PricePrediction {
  symbol: string;
  currentPrice: number;
  lookbackDays: number;
  forecastDays: number;
  predictions: Array<{
    day: number;
    date: string;
    price: number;
    change: number;
    changePercent: number;
  }>;
  overallTrend: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  xai: {
    method: string;
    featureImportances: Array<{ feature: string; importance: number }>;
    explanation: string;
    topInfluentialDays: number[];
  };
}

// User types
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    defaultView?: 'dashboard' | 'portfolio' | 'market' | 'news';
    notifications?: {
      email?: boolean;
      priceAlerts?: boolean;
      portfolioUpdates?: boolean;
      newsAlerts?: boolean;
    };
  };
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: 'success' | 'error';
  timestamp: string;
}
