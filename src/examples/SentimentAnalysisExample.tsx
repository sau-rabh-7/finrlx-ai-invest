/**
 * Example implementations of the SentimentAnalysis component
 * This file demonstrates various ways to use the FinBERT sentiment analysis
 * with XAI in different contexts throughout the application.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SentimentAnalysis, SentimentData } from "@/components/SentimentAnalysisOld";
import { useSentimentAnalysis, useBatchSentimentAnalysis } from "@/hooks/useSentimentAnalysis";
import { Loader2 } from "lucide-react";

// ============================================================================
// Example 1: Simple Single Text Analysis
// ============================================================================
export function SimpleSentimentExample() {
  const [text, setText] = useState("");
  const { analyzeSentiment, loading, data, error } = useSentimentAnalysis();

  const handleAnalyze = async () => {
    await analyzeSentiment(text);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simple Sentiment Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Enter financial text to analyze..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
        />
        <Button onClick={handleAnalyze} disabled={loading || !text.trim()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Analyze Sentiment
        </Button>

        {error && (
          <div className="text-red-500 text-sm">Error: {error.message}</div>
        )}

        {data && <SentimentAnalysis sentiment={data} showXAI={true} />}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Example 2: Batch Analysis with Progress
// ============================================================================
export function BatchSentimentExample() {
  const [items, setItems] = useState<string[]>([
    "Apple reports strong quarterly earnings with record iPhone sales",
    "Tesla faces production challenges amid supply chain disruptions",
    "Microsoft announces new AI initiatives and cloud expansion"
  ]);
  const { analyzeBatch, loading, results } = useBatchSentimentAnalysis();

  const handleBatchAnalyze = async () => {
    const formattedItems = items.map(text => ({ text }));
    await analyzeBatch(formattedItems);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Sentiment Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleBatchAnalyze} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Analyze All ({items.length} items)
        </Button>

        <div className="space-y-4">
          {results.map((sentiment, idx) => (
            <div key={idx} className="border rounded-lg p-4">
              <p className="text-sm mb-3 text-muted-foreground">{items[idx]}</p>
              <SentimentAnalysis sentiment={sentiment} showXAI={true} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Example 3: Compact Display Mode
// ============================================================================
export function CompactSentimentExample() {
  const mockSentiment: SentimentData = {
    sentiment: 'positive',
    score: 0.75,
    confidence: 0.89,
    recommendation: 'BUY',
    analysis: 'Strong positive sentiment driven by growth indicators and market optimism.',
    xai: {
      method: 'LIME',
      wordImportances: [
        { word: 'growth', importance: 0.85, sentiment: 'positive' },
        { word: 'strong', importance: 0.72, sentiment: 'positive' },
        { word: 'optimism', importance: 0.68, sentiment: 'positive' }
      ],
      topPositiveWords: ['growth', 'strong', 'optimism'],
      topNegativeWords: [],
      explanation: 'Analysis shows strong positive indicators with high confidence.'
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compact Display</CardTitle>
      </CardHeader>
      <CardContent>
        <SentimentAnalysis sentiment={mockSentiment} compact={true} showXAI={false} />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Example 4: Real-time Analysis with Callbacks
// ============================================================================
export function RealtimeSentimentExample() {
  const [text, setText] = useState("");
  const [history, setHistory] = useState<SentimentData[]>([]);

  const { analyzeSentiment, loading } = useSentimentAnalysis({
    onSuccess: (data) => {
      setHistory(prev => [data, ...prev].slice(0, 5)); // Keep last 5
      setText(""); // Clear input
    },
    onError: (error) => {
      console.error("Analysis failed:", error);
    }
  });

  const handleAnalyze = async () => {
    if (text.trim()) {
      await analyzeSentiment(text);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-time Analysis History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Textarea
            placeholder="Enter text and press Analyze..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="flex-1"
          />
          <Button onClick={handleAnalyze} disabled={loading || !text.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Recent Analyses</h3>
          {history.map((sentiment, idx) => (
            <div key={idx} className="border rounded-lg p-3">
              <SentimentAnalysis sentiment={sentiment} showXAI={false} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Example 5: Integration with External Data
// ============================================================================
export function ExternalDataSentimentExample() {
  const [stockSymbol, setStockSymbol] = useState("AAPL");
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const { analyzeSentiment, loading } = useSentimentAnalysis();

  const fetchAndAnalyze = async () => {
    // Simulate fetching data from an external API
    const mockData = `${stockSymbol} shows strong performance with increased revenue and positive market outlook. Analysts recommend buying on continued growth trajectory.`;
    
    const result = await analyzeSentiment(mockData, `${stockSymbol} Analysis`);
    if (result) {
      setSentiment(result);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Symbol Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Stock symbol (e.g., AAPL)"
            value={stockSymbol}
            onChange={(e) => setStockSymbol(e.target.value.toUpperCase())}
            className="flex-1 px-3 py-2 border rounded"
          />
          <Button onClick={fetchAndAnalyze} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Analyze
          </Button>
        </div>

        {sentiment && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">{stockSymbol} Sentiment</h3>
            <SentimentAnalysis sentiment={sentiment} showXAI={true} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Example 6: Comparison View
// ============================================================================
export function ComparisonSentimentExample() {
  const sentiments: { label: string; data: SentimentData }[] = [
    {
      label: "Tech Sector",
      data: {
        sentiment: 'positive',
        score: 0.65,
        confidence: 0.82,
        recommendation: 'BUY',
        analysis: 'Tech sector shows strong growth potential.',
        xai: {
          method: 'LIME',
          wordImportances: [{ word: 'growth', importance: 0.8, sentiment: 'positive' }],
          topPositiveWords: ['growth', 'innovation'],
          topNegativeWords: [],
          explanation: 'Positive indicators dominate the analysis.'
        }
      }
    },
    {
      label: "Energy Sector",
      data: {
        sentiment: 'negative',
        score: -0.45,
        confidence: 0.76,
        recommendation: 'SELL',
        analysis: 'Energy sector faces headwinds from policy changes.',
        xai: {
          method: 'LIME',
          wordImportances: [{ word: 'headwinds', importance: 0.75, sentiment: 'negative' }],
          topPositiveWords: [],
          topNegativeWords: ['headwinds', 'decline'],
          explanation: 'Negative sentiment driven by regulatory concerns.'
        }
      }
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sector Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sentiments.map((item, idx) => (
            <div key={idx} className="border rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3">{item.label}</h3>
              <SentimentAnalysis sentiment={item.data} showXAI={true} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Example 7: Complete Integration Example
// ============================================================================
export default function SentimentAnalysisExamples() {
  const [activeExample, setActiveExample] = useState<number>(1);

  const examples = [
    { id: 1, name: "Simple Analysis", component: <SimpleSentimentExample /> },
    { id: 2, name: "Batch Analysis", component: <BatchSentimentExample /> },
    { id: 3, name: "Compact Display", component: <CompactSentimentExample /> },
    { id: 4, name: "Real-time History", component: <RealtimeSentimentExample /> },
    { id: 5, name: "External Data", component: <ExternalDataSentimentExample /> },
    { id: 6, name: "Comparison View", component: <ComparisonSentimentExample /> }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Sentiment Analysis Examples</h1>
        <p className="text-muted-foreground">
          Various implementations of FinBERT sentiment analysis with XAI
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {examples.map(example => (
          <Button
            key={example.id}
            variant={activeExample === example.id ? "default" : "outline"}
            onClick={() => setActiveExample(example.id)}
          >
            {example.name}
          </Button>
        ))}
      </div>

      <div>
        {examples.find(e => e.id === activeExample)?.component}
      </div>
    </div>
  );
}
