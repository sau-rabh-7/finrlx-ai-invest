import { SentimentData } from "@/components/SentimentAnalysisOld";

// API Configuration
const API_BASE_URL = import.meta.env.VITE_SENTIMENT_API_URL || 'http://localhost:5000';

interface AnalyzeRequest {
  text: string;
  title?: string;
}

interface BatchAnalyzeRequest {
  items: Array<{
    text: string;
    title?: string;
  }>;
}

/**
 * Sentiment Analysis API Service
 * Communicates with Python Flask backend
 */
export class SentimentApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if the API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Analyze sentiment of a single text
   */
  async analyzeSentiment(text: string, title?: string): Promise<SentimentData> {
    try {
      console.log(`[SentimentAPI] Calling: ${this.baseUrl}/api/sentiment/analyze`);
      console.log(`[SentimentAPI] Text length: ${text.length}`);
      
      const response = await fetch(`${this.baseUrl}/api/sentiment/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          title
        } as AnalyzeRequest),
      });

      console.log(`[SentimentAPI] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[SentimentAPI] Error response:`, errorText);
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log(`[SentimentAPI] Success! Sentiment:`, data.sentiment);
      return data as SentimentData;
    } catch (error) {
      console.error('[SentimentAPI] Error analyzing sentiment:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to backend. Make sure Flask server is running on http://localhost:5000');
      }
      throw error;
    }
  }

  /**
   * Analyze sentiment of multiple texts in batch
   */
  async analyzeBatch(items: Array<{ text: string; title?: string }>): Promise<SentimentData[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sentiment/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items
        } as BatchAnalyzeRequest),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to analyze batch');
      }

      const data = await response.json();
      return data.results as SentimentData[];
    } catch (error) {
      console.error('Error analyzing batch:', error);
      throw error;
    }
  }

  /**
   * Get financial keywords used by the analyzer
   */
  async getKeywords(): Promise<{ positive_keywords: string[]; negative_keywords: string[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sentiment/keywords`);

      if (!response.ok) {
        throw new Error('Failed to get keywords');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting keywords:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const sentimentApi = new SentimentApiService();
