# Quick Start Guide: FinBERT Sentiment Analysis with XAI

## 🚀 Get Started in 5 Minutes

This guide shows you how to quickly integrate FinBERT sentiment analysis with Explainable AI into your pages.

---

## Option 1: Using the Hook (Recommended)

### Step 1: Import the hook and component
```typescript
import { useSentimentAnalysis } from "@/hooks/useSentimentAnalysis";
import { SentimentAnalysis } from "@/components/SentimentAnalysis";
```

### Step 2: Use in your component
```typescript
function MyComponent() {
  const { analyzeSentiment, loading, data } = useSentimentAnalysis();

  const handleAnalyze = async () => {
    await analyzeSentiment("Your financial text here");
  };

  return (
    <div>
      <button onClick={handleAnalyze} disabled={loading}>
        {loading ? "Analyzing..." : "Analyze Sentiment"}
      </button>
      
      {data && <SentimentAnalysis sentiment={data} showXAI={true} />}
    </div>
  );
}
```

**That's it!** You now have sentiment analysis with XAI explanations.

---

## Option 2: Direct API Call

### Step 1: Import Supabase client
```typescript
import { supabase } from "@/integrations/supabase/client";
import { SentimentAnalysis, SentimentData } from "@/components/SentimentAnalysis";
```

### Step 2: Call the API
```typescript
const { data, error } = await supabase.functions.invoke('finbert-sentiment', {
  body: { 
    text: "Your text here",
    title: "Optional title" 
  }
});

if (data) {
  // data is SentimentData type
  console.log(data.sentiment); // 'positive' | 'negative' | 'neutral'
  console.log(data.recommendation); // 'BUY' | 'SELL' | 'HOLD'
}
```

### Step 3: Display the results
```typescript
{data && <SentimentAnalysis sentiment={data as SentimentData} showXAI={true} />}
```

---

## Option 3: Batch Analysis

### For multiple texts at once
```typescript
import { useBatchSentimentAnalysis } from "@/hooks/useSentimentAnalysis";

function BatchExample() {
  const { analyzeBatch, loading, results } = useBatchSentimentAnalysis();

  const handleBatch = async () => {
    const items = [
      { text: "First article...", title: "Article 1" },
      { text: "Second article...", title: "Article 2" },
      { text: "Third article...", title: "Article 3" }
    ];
    
    await analyzeBatch(items);
  };

  return (
    <div>
      <button onClick={handleBatch} disabled={loading}>
        Analyze All
      </button>
      
      {results.map((sentiment, idx) => (
        <SentimentAnalysis key={idx} sentiment={sentiment} showXAI={true} />
      ))}
    </div>
  );
}
```

---

## Component Props

### SentimentAnalysis Component

```typescript
<SentimentAnalysis 
  sentiment={data}      // Required: SentimentData object
  showXAI={true}        // Optional: Show XAI explanations (default: true)
  compact={false}       // Optional: Compact display mode (default: false)
/>
```

---

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
    wordImportances: Array<{
      word: string;
      importance: number;
      sentiment: 'positive' | 'negative' | 'neutral';
    }>;
    topPositiveWords: string[];
    topNegativeWords: string[];
    explanation: string;
  };
}
```

---

## Common Use Cases

### 1. Analyze News Article
```typescript
const { analyzeSentiment } = useSentimentAnalysis();

await analyzeSentiment(
  article.content,
  article.title
);
```

### 2. Analyze Social Media Post
```typescript
await analyzeSentiment(tweet.text);
```

### 3. Analyze Earnings Report
```typescript
await analyzeSentiment(
  earningsReport.summary,
  `${company} Q4 Earnings`
);
```

### 4. Analyze Multiple Sources
```typescript
const { analyzeBatch } = useBatchSentimentAnalysis();

const sources = newsArticles.map(article => ({
  text: article.content,
  title: article.headline
}));

await analyzeBatch(sources);
```

---

## Customization Examples

### Hide XAI Explanations
```typescript
<SentimentAnalysis sentiment={data} showXAI={false} />
```

### Compact Display
```typescript
<SentimentAnalysis sentiment={data} compact={true} />
```

### With Callbacks
```typescript
const { analyzeSentiment } = useSentimentAnalysis({
  onSuccess: (data) => {
    console.log("Analysis complete:", data);
    toast.success("Sentiment analyzed!");
  },
  onError: (error) => {
    console.error("Analysis failed:", error);
    toast.error("Failed to analyze sentiment");
  }
});
```

---

## Styling

The component uses your app's theme automatically:
- ✅ Dark mode support
- ✅ Responsive design
- ✅ Tailwind CSS classes
- ✅ shadcn/ui components

### Custom Styling
Wrap in a container with your classes:
```typescript
<div className="my-custom-class">
  <SentimentAnalysis sentiment={data} showXAI={true} />
</div>
```

---

## Error Handling

### With Hook
```typescript
const { analyzeSentiment, error } = useSentimentAnalysis();

if (error) {
  console.error("Error:", error.message);
}
```

### With Direct API
```typescript
const { data, error } = await supabase.functions.invoke('finbert-sentiment', {
  body: { text: "..." }
});

if (error) {
  console.error("API Error:", error);
}
```

---

## Loading States

### Show Loading Indicator
```typescript
const { loading } = useSentimentAnalysis();

{loading && <Loader2 className="animate-spin" />}
```

### Disable Button While Loading
```typescript
<button disabled={loading}>
  {loading ? "Analyzing..." : "Analyze"}
</button>
```

---

## Complete Example

Here's a complete, copy-paste ready example:

```typescript
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SentimentAnalysis } from "@/components/SentimentAnalysis";
import { useSentimentAnalysis } from "@/hooks/useSentimentAnalysis";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function MySentimentPage() {
  const [text, setText] = useState("");
  
  const { analyzeSentiment, loading, data, error } = useSentimentAnalysis({
    onSuccess: () => toast.success("Analysis complete!"),
    onError: () => toast.error("Analysis failed")
  });

  const handleAnalyze = async () => {
    if (text.trim()) {
      await analyzeSentiment(text);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>FinBERT Sentiment Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter financial text to analyze..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
          />
          
          <Button 
            onClick={handleAnalyze} 
            disabled={loading || !text.trim()}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Analyze Sentiment
          </Button>

          {error && (
            <div className="text-red-500 text-sm">
              Error: {error.message}
            </div>
          )}

          {data && (
            <div className="mt-6">
              <SentimentAnalysis sentiment={data} showXAI={true} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Tips & Best Practices

### ✅ Do's
- Use the hook for state management
- Show loading indicators
- Handle errors gracefully
- Provide user feedback (toasts)
- Use TypeScript types
- Keep text concise (< 1000 words)

### ❌ Don'ts
- Don't analyze empty text
- Don't ignore errors
- Don't block UI during analysis
- Don't analyze very long texts (> 5000 words)
- Don't make too many rapid requests

---

## Performance Tips

1. **Batch Processing**: Use `useBatchSentimentAnalysis` for multiple items
2. **Debouncing**: Debounce user input before analyzing
3. **Caching**: Store results to avoid re-analyzing same text
4. **Progressive Loading**: Show results as they arrive
5. **Error Recovery**: Continue processing even if some items fail

---

## Next Steps

1. ✅ Try the basic example above
2. 📖 Read the full documentation: `docs/FINBERT_XAI_IMPLEMENTATION.md`
3. 🔍 Explore examples: `src/examples/SentimentAnalysisExample.tsx`
4. 🎯 Check the News page implementation: `src/pages/News.tsx`
5. 🚀 Build your own integration!

---

## Need Help?

- **Documentation**: `docs/FINBERT_XAI_IMPLEMENTATION.md`
- **Examples**: `src/examples/SentimentAnalysisExample.tsx`
- **Summary**: `FINBERT_XAI_SUMMARY.md`
- **Component**: `src/components/SentimentAnalysis.tsx`
- **Hook**: `src/hooks/useSentimentAnalysis.ts`
- **API**: `supabase/functions/finbert-sentiment/index.ts`

---

**Happy Analyzing! 🎉**
