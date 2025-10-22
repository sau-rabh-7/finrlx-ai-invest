import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface NewsArticle {
  id: number;
  title: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  publishedAt: string;
  sentiment: {
    sentiment: string;
    score: number;
    recommendation: string;
    confidence: number;
    analysis: string;
  };
}

export default function News() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('nse-news', {
        body: {}
      });

      if (error) throw error;
      if (data?.articles) {
        setArticles(data.articles);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter(article => {
    if (filter === "all") return true;
    return article.sentiment.recommendation === filter;
  });

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-[hsl(var(--bullish))] bg-[hsl(var(--bullish)/0.1)]";
      case "negative":
        return "text-[hsl(var(--bearish))] bg-[hsl(var(--bearish)/0.1)]";
      default:
        return "text-[hsl(var(--neutral))] bg-muted";
    }
  };

  const getSentimentIcon = (recommendation: string) => {
    switch (recommendation) {
      case "BUY":
        return <TrendingUp className="h-4 w-4" />;
      case "SELL":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Market News & Sentiment</h1>
        <p className="text-muted-foreground">
          AI-powered sentiment analysis on latest financial news
        </p>
      </div>

      <div className="mb-6 flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All News
        </Button>
        <Button
          variant={filter === "BUY" ? "default" : "outline"}
          onClick={() => setFilter("BUY")}
          className="gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          Buy Signals
        </Button>
        <Button
          variant={filter === "HOLD" ? "default" : "outline"}
          onClick={() => setFilter("HOLD")}
          className="gap-2"
        >
          <Minus className="h-4 w-4" />
          Hold
        </Button>
        <Button
          variant={filter === "SELL" ? "default" : "outline"}
          onClick={() => setFilter("SELL")}
          className="gap-2"
        >
          <TrendingDown className="h-4 w-4" />
          Sell Signals
        </Button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <>
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-full mb-2"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          filteredArticles.map((article) => (
            <Card key={article.id} className="hover:shadow-lg transition-shadow">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* News Content - Left Side */}
                <div className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-xl mb-2">{article.title}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{article.source}</span>
                      <span>•</span>
                      <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{article.summary}</p>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 text-sm"
                    >
                      Read full article
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </CardContent>
                </div>

                {/* AI Analysis - Right Side */}
                <div className="border-l pl-6">
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">AI Sentiment Analysis</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Powered by FinBERT</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Sentiment</div>
                      <Badge className={getSentimentColor(article.sentiment.sentiment)}>
                        {article.sentiment.sentiment}
                      </Badge>
                    </div>
                    
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Recommendation</div>
                      <Badge 
                        variant="outline"
                        className="gap-1"
                      >
                        {getSentimentIcon(article.sentiment.recommendation)}
                        {article.sentiment.recommendation}
                      </Badge>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Analysis</div>
                      <p className="text-sm bg-muted p-3 rounded-md italic">
                        {article.sentiment.analysis}
                      </p>
                    </div>

                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Confidence: {(article.sentiment.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  </CardContent>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
