import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Minus, Brain, ChevronDown, ChevronUp, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WordImportance {
  word: string;
  importance: number;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface XAIData {
  method: 'LIME' | 'SHAP';
  wordImportances: WordImportance[];
  topPositiveWords: string[];
  topNegativeWords: string[];
  explanation: string;
}

export interface SentimentData {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  analysis: string;
  xai?: XAIData;
}

interface SentimentAnalysisProps {
  sentiment: SentimentData;
  showXAI?: boolean;
}

export function SentimentAnalysis({ sentiment, showXAI = true }: SentimentAnalysisProps) {
  const [topK, setTopK] = useState(10);
  const [wordFilter, setWordFilter] = useState<'all' | 'positive' | 'negative'>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const getSentimentColor = (sent: string) => {
    switch (sent) {
      case "positive":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "negative":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case "BUY":
        return <TrendingUp className="h-4 w-4" />;
      case "SELL":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case "BUY":
        return "bg-green-500 text-white";
      case "SELL":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  // Filter and sort word importances
  const filteredWords = sentiment.xai?.wordImportances
    .filter(w => {
      if (wordFilter === 'positive') return w.sentiment === 'positive';
      if (wordFilter === 'negative') return w.sentiment === 'negative';
      return true;
    })
    .slice(0, topK) || [];

  // Calculate additional metrics
  const avgImportance = filteredWords.length > 0
    ? filteredWords.reduce((sum, w) => sum + w.importance, 0) / filteredWords.length
    : 0;

  const positiveCount = sentiment.xai?.wordImportances.filter(w => w.sentiment === 'positive').length || 0;
  const negativeCount = sentiment.xai?.wordImportances.filter(w => w.sentiment === 'negative').length || 0;

  return (
    <div className="space-y-4">
      {/* Compact Header - Horizontal Layout */}
      <div className="grid grid-cols-2 gap-3">
        {/* Sentiment & Recommendation */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Sentiment</span>
            <Badge className={`${getSentimentColor(sentiment.sentiment)} border`}>
              {sentiment.sentiment.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Action</span>
            <Badge className={`${getRecommendationColor(sentiment.recommendation)} gap-1`}>
              {getRecommendationIcon(sentiment.recommendation)}
              {sentiment.recommendation}
            </Badge>
          </div>
        </div>

        {/* Scores */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Confidence</span>
            <span className="text-sm font-bold">{(sentiment.confidence * 100).toFixed(0)}%</span>
          </div>
          <Progress value={sentiment.confidence * 100} className="h-2" />
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Score</span>
            <span className="text-sm font-bold">{sentiment.score.toFixed(2)}</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`absolute h-full ${sentiment.score >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ 
                width: `${Math.abs(sentiment.score) * 50}%`,
                left: sentiment.score >= 0 ? '50%' : `${50 - Math.abs(sentiment.score) * 50}%`
              }}
            />
            <div className="absolute left-1/2 top-0 w-px h-full bg-border" />
          </div>
        </div>
      </div>

      {/* Analysis Text */}
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        {sentiment.analysis}
      </div>

      {/* XAI Section */}
      {showXAI && sentiment.xai && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-semibold">Explainable AI ({sentiment.xai.method})</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      {sentiment.xai.method === 'LIME' 
                        ? 'Local Interpretable Model-agnostic Explanations: Shows which words influenced the prediction'
                        : 'SHapley Additive exPlanations: Game theory approach to explain predictions'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-7 gap-1"
            >
              {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showAdvanced ? 'Less' : 'More'}
            </Button>
          </div>

          {/* Quick Indicators */}
          <div className="flex flex-wrap gap-1.5">
            {sentiment.xai.topPositiveWords.slice(0, 5).map((word, idx) => (
              <Badge key={idx} variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20 text-xs">
                +{word}
              </Badge>
            ))}
            {sentiment.xai.topNegativeWords.slice(0, 5).map((word, idx) => (
              <Badge key={idx} variant="outline" className="bg-red-500/10 text-red-700 border-red-500/20 text-xs">
                -{word}
              </Badge>
            ))}
          </div>

          {/* Advanced Controls */}
          {showAdvanced && (
            <div className="space-y-4 border-t pt-4">
              {/* Controls Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Top-K Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">Top-K Words</label>
                    <span className="text-xs font-bold text-purple-600">{topK}</span>
                  </div>
                  <Slider
                    value={[topK]}
                    onValueChange={(value) => setTopK(value[0])}
                    min={5}
                    max={50}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5</span>
                    <span>50</span>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="space-y-2">
                  <label className="text-xs font-medium">Word Filter</label>
                  <Tabs value={wordFilter} onValueChange={(v) => setWordFilter(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 h-8">
                      <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                      <TabsTrigger value="positive" className="text-xs">Positive</TabsTrigger>
                      <TabsTrigger value="negative" className="text-xs">Negative</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-3 bg-muted/50 p-3 rounded-lg">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Positive Words</div>
                  <div className="text-lg font-bold text-green-600">{positiveCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Negative Words</div>
                  <div className="text-lg font-bold text-red-600">{negativeCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Avg Importance</div>
                  <div className="text-lg font-bold text-purple-600">{(avgImportance * 100).toFixed(0)}%</div>
                </div>
              </div>

              {/* Word Importance Visualization */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Word Importance Distribution</span>
                  <span className="text-xs text-muted-foreground">Showing {filteredWords.length} words</span>
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-2">
                  {filteredWords.map((word, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${
                          word.sentiment === 'positive' ? 'text-green-600' : 
                          word.sentiment === 'negative' ? 'text-red-600' : 
                          'text-gray-600'
                        }`}>
                          {word.word}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {(word.importance * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            word.sentiment === 'positive' ? 'bg-green-500' : 
                            word.sentiment === 'negative' ? 'bg-red-500' : 
                            'bg-gray-500'
                          }`}
                          style={{ width: `${word.importance * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Brain className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {sentiment.xai.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
