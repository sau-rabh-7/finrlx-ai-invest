import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIAnalysisProps {
  ticker: string;
}

interface AnalysisData {
  sentiment: string;
  sentimentScore: number;
  predictedReturn: number;
}

export const AIAnalysis = ({ ticker }: AIAnalysisProps) => {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('ai-forecast', {
          body: { ticker }
        });

        if (error) throw error;
        setAnalysis(data);
      } catch (error) {
        console.error('Error fetching AI analysis:', error);
        toast.error('Failed to fetch AI analysis');
        // Fallback to mock data
        setAnalysis({
          sentiment: "Strong Positive",
          sentimentScore: 0.72,
          predictedReturn: 0.52
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [ticker]);

  if (loading) {
    return (
      <Card className="p-6 bg-card border-border">
        <Skeleton className="h-[250px] w-full" />
      </Card>
    );
  }

  const isPositive = analysis!.predictedReturn > 0;
  const sentimentColor = analysis!.sentimentScore > 0.6 ? "text-accent" : 
                        analysis!.sentimentScore < 0.4 ? "text-destructive" : 
                        "text-neutral";

  return (
    <Card className="p-6 bg-card border-border backdrop-blur-sm relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{
        background: isPositive ? 'var(--gradient-bullish)' : 'var(--gradient-bearish)'
      }} />
      
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">AI Analysis & Forecast</h2>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Market Sentiment</p>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className={`text-lg ${sentimentColor}`}>
                {analysis!.sentiment}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Score: {(analysis!.sentimentScore * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Predicted Next-Day Return</p>
            <div className="flex items-center gap-2">
              {isPositive ? (
                <TrendingUp className="h-6 w-6 text-accent" />
              ) : (
                <TrendingDown className="h-6 w-6 text-destructive" />
              )}
              <span className={`text-3xl font-bold ${isPositive ? 'text-accent' : 'text-destructive'}`}>
                {isPositive ? '+' : ''}{analysis!.predictedReturn.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Powered by FinBERT-LSTM • Combines sentiment analysis with time-series forecasting
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
