import { useState } from "react";
import { sentimentApi } from "@/services/sentimentApi";
import { SentimentData } from "@/components/SentimentAnalysisOld";

interface UseSentimentAnalysisOptions {
  onSuccess?: (data: SentimentData) => void;
  onError?: (error: Error) => void;
}

export function useSentimentAnalysis(options?: UseSentimentAnalysisOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<SentimentData | null>(null);

  const analyzeSentiment = async (text: string, title?: string): Promise<SentimentData | null> => {
    if (!text || text.trim().length === 0) {
      const err = new Error("Text is required for sentiment analysis");
      setError(err);
      options?.onError?.(err);
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await sentimentApi.analyzeSentiment(text, title);

      if (!result) {
        throw new Error("No data returned from sentiment analysis");
      }

      setData(result);
      options?.onSuccess?.(result);
      return result;

    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to analyze sentiment");
      console.error('Sentiment analysis error:', error);
      setError(error);
      options?.onError?.(error);
      return null;

    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setLoading(false);
  };

  return {
    analyzeSentiment,
    loading,
    error,
    data,
    reset
  };
}

/**
 * Batch analyze multiple texts
 */
export function useBatchSentimentAnalysis(options?: UseSentimentAnalysisOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [results, setResults] = useState<SentimentData[]>([]);

  const analyzeBatch = async (
    items: Array<{ text: string; title?: string }>
  ): Promise<SentimentData[]> => {
    if (!items || items.length === 0) {
      return [];
    }

    try {
      setLoading(true);
      setError(null);

      // Use the Python Flask API for batch analysis
      const allResults = await sentimentApi.analyzeBatch(items);

      setResults(allResults);
      return allResults;

    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to analyze batch");
      console.error('Batch sentiment analysis error:', error);
      setError(error);
      options?.onError?.(error);
      return [];

    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResults([]);
    setError(null);
    setLoading(false);
  };

  return {
    analyzeBatch,
    loading,
    error,
    results,
    reset
  };
}
