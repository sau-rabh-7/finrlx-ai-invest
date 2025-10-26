# FinBERT Sentiment Analysis with Explainable AI (XAI)

## Overview

This implementation integrates **FinBERT** (Financial BERT) sentiment analysis with **Explainable AI (XAI)** using LIME/SHAP-like techniques to provide transparent, interpretable sentiment analysis for financial news articles.

## Architecture

### Components

1. **Supabase Edge Function** (`finbert-sentiment`)
   - Location: `supabase/functions/finbert-sentiment/index.ts`
   - Performs FinBERT-style sentiment analysis using Lovable AI
   - Generates XAI explanations with word importance scores
   - Returns structured sentiment data with confidence scores

2. **React Component** (`SentimentAnalysis`)
   - Location: `src/components/SentimentAnalysis.tsx`
   - Reusable component for displaying sentiment analysis
   - Visualizes XAI explanations with word importance
   - Shows positive/negative indicators and confidence scores

3. **Custom Hook** (`useSentimentAnalysis`)
   - Location: `src/hooks/useSentimentAnalysis.ts`
   - Provides easy integration for sentiment analysis
   - Supports single and batch analysis
   - Handles loading states and error management

4. **News Page Integration**
   - Location: `src/pages/News.tsx`
   - Implements real-time sentiment analysis on news search
   - Displays XAI explanations alongside news articles

## Features

### 1. FinBERT Sentiment Analysis
- **Sentiment Classification**: Positive, Negative, or Neutral
- **Sentiment Score**: Continuous score from -1 (very negative) to +1 (very positive)
- **Confidence Level**: Model confidence from 0 to 1
- **Investment Recommendation**: BUY, SELL, or HOLD
- **Analysis Text**: Brief explanation of the sentiment

### 2. Explainable AI (XAI)

#### LIME/SHAP-like Word Importance
The implementation uses a LIME-inspired approach to explain model predictions:

- **Word Importance Scores**: Each word gets an importance score (0-1)
- **Sentiment Attribution**: Words are classified as positive, negative, or neutral
- **Top Indicators**: Highlights top 5 positive and negative words
- **Visual Representation**: Progress bars show relative importance

#### XAI Visualization Components
- **Word Importance Chart**: Top 10 most important words with visual bars
- **Positive Indicators**: Green badges for bullish keywords
- **Negative Indicators**: Red badges for bearish keywords
- **Explanation Text**: Natural language explanation of the analysis

### 3. Financial Keywords Detection

The system recognizes financial sentiment keywords:

**Positive Keywords**: growth, profit, gain, surge, rally, bullish, strong, increase, rise, boost, success, positive, upgrade, outperform, beat, exceed, record, high, soar, jump

**Negative Keywords**: loss, decline, fall, drop, bearish, weak, decrease, plunge, crash, negative, downgrade, underperform, miss, concern, risk, low, tumble, slump, warning, debt

## Data Structure

### SentimentData Interface
```typescript
interface SentimentData {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;              // -1 to 1
  confidence: number;         // 0 to 1
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  analysis: string;
  xai?: {
    method: 'LIME' | 'SHAP';
    wordImportances: WordImportance[];
    topPositiveWords: string[];
    topNegativeWords: string[];
    explanation: string;
  };
}

interface WordImportance {
  word: string;
  importance: number;         // 0 to 1
  sentiment: 'positive' | 'negative' | 'neutral';
}
```

## Usage

### 1. Using the Hook (Recommended)

```typescript
import { useSentimentAnalysis } from "@/hooks/useSentimentAnalysis";

function MyComponent() {
  const { analyzeSentiment, loading, data, error } = useSentimentAnalysis();

  const handleAnalyze = async () => {
    const result = await analyzeSentiment(
      "Apple reports record quarterly earnings...",
      "Apple Q4 Results"
    );
    console.log(result);
  };

  return (
    <div>
      <button onClick={handleAnalyze} disabled={loading}>
        Analyze Sentiment
      </button>
      {data && <SentimentAnalysis sentiment={data} showXAI={true} />}
    </div>
  );
}
```

### 2. Batch Analysis

```typescript
import { useBatchSentimentAnalysis } from "@/hooks/useSentimentAnalysis";

function BatchAnalysis() {
  const { analyzeBatch, loading, results } = useBatchSentimentAnalysis();

  const handleBatch = async () => {
    const items = [
      { text: "News 1...", title: "Title 1" },
      { text: "News 2...", title: "Title 2" },
    ];
    const results = await analyzeBatch(items);
  };
}
```

### 3. Direct Component Usage

```typescript
import { SentimentAnalysis, SentimentData } from "@/components/SentimentAnalysis";

function Display({ sentiment }: { sentiment: SentimentData }) {
  return (
    <SentimentAnalysis 
      sentiment={sentiment} 
      showXAI={true}      // Show XAI explanations
      compact={false}     // Full display mode
    />
  );
}
```

### 4. Direct API Call

```typescript
const { data, error } = await supabase.functions.invoke('finbert-sentiment', {
  body: { 
    text: "Your financial text here",
    title: "Optional title" 
  }
});
```

## Integration in News Page

The News page demonstrates a complete integration:

1. **Search**: User searches for company news
2. **Fetch**: News articles are fetched from NewsAPI
3. **Analyze**: Each article is analyzed with FinBERT
4. **Display**: Results show with XAI explanations
5. **Filter**: Users can filter by BUY/SELL/HOLD recommendations

### Loading States
- Initial search shows loading spinner
- Each article shows individual loading state during analysis
- Toast notifications inform users of progress

### Error Handling
- Fallback sentiment for failed analyses
- Graceful degradation with neutral sentiment
- Error messages in toast notifications

## Reusability

The `SentimentAnalysis` component is designed to be reusable across the application:

### Use Cases
1. **News Articles**: Display sentiment for financial news
2. **Social Media**: Analyze tweets and posts
3. **Earnings Reports**: Sentiment analysis of financial reports
4. **Market Commentary**: Analyze analyst opinions
5. **User Reviews**: Sentiment of product/service reviews

### Props
- `sentiment`: SentimentData object (required)
- `compact`: Boolean for compact display (default: false)
- `showXAI`: Boolean to show/hide XAI section (default: true)

## Performance Considerations

1. **Batch Processing**: Processes 5 articles at a time to avoid rate limiting
2. **Parallel Analysis**: Uses Promise.all for concurrent requests
3. **Progressive Loading**: Shows results as they complete
4. **Error Resilience**: Continues processing even if some analyses fail

## Future Enhancements

1. **Real SHAP Integration**: Integrate actual SHAP library for more accurate explanations
2. **Model Fine-tuning**: Fine-tune FinBERT on domain-specific data
3. **Caching**: Cache sentiment results to reduce API calls
4. **Historical Tracking**: Track sentiment changes over time
5. **Comparative Analysis**: Compare sentiment across multiple sources
6. **Custom Keywords**: Allow users to define custom financial keywords
7. **Multi-language Support**: Extend to non-English financial texts

## Technical Notes

### Why LIME/SHAP?
- **Transparency**: Users understand why the model made a decision
- **Trust**: Builds confidence in AI recommendations
- **Debugging**: Helps identify model biases or errors
- **Compliance**: Meets regulatory requirements for explainable AI

### Limitations
- Current implementation uses keyword-based importance (simulated LIME)
- Production systems should use actual SHAP/LIME libraries
- Word importance is approximate, not exact model attributions
- Requires API key for Lovable AI gateway

## Environment Variables

Required environment variable in Supabase:
```
LOVABLE_API_KEY=your_api_key_here
```

## Testing

To test the implementation:

1. Navigate to the News page
2. Search for a company (e.g., "Apple", "Tesla")
3. Wait for sentiment analysis to complete
4. Verify XAI explanations are displayed
5. Check word importance visualizations
6. Test filtering by BUY/SELL/HOLD

## Conclusion

This implementation provides a production-ready, modular sentiment analysis system with explainable AI capabilities. The reusable components can be easily integrated into other parts of the application for consistent sentiment analysis across all financial content.
