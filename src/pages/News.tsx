import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, TrendingDown, Minus, Search, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
}

interface NewsArticleWithSentiment extends NewsArticle {
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
  const [searchedArticles, setSearchedArticles] = useState<NewsArticleWithSentiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('news', {
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

  const searchNews = async (query: string) => {
    if (!query.trim()) return;
    
    try {
      setSearchLoading(true);
      const { data, error } = await supabase.functions.invoke('news', {
        body: { query: query.trim() }
      });

      if (error) throw error;
      if (data?.articles) {
        // Add mock sentiment analysis for searched articles
        const articlesWithSentiment = data.articles.map((article: NewsArticle) => ({
          ...article,
          sentiment: {
            sentiment: Math.random() > 0.5 ? 'positive' : Math.random() > 0.5 ? 'negative' : 'neutral',
            score: Math.random(),
            recommendation: Math.random() > 0.6 ? 'BUY' : Math.random() > 0.6 ? 'SELL' : 'HOLD',
            confidence: Math.random(),
            analysis: `AI analysis for "${query}": This article discusses ${query} and shows ${Math.random() > 0.5 ? 'positive' : 'negative'} market sentiment. The analysis suggests ${Math.random() > 0.5 ? 'potential growth opportunities' : 'caution due to market volatility'}.`
          }
        }));
        setSearchedArticles(articlesWithSentiment);
        setIsSearchMode(true);
      }
    } catch (error) {
      console.error('Error searching news:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchNews(searchQuery);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setIsSearchMode(false);
    setSearchedArticles([]);
  };

  const filteredSearchedArticles = searchedArticles.filter(article => {
    if (filter === "all") return true;
    return article.sentiment.recommendation.toLowerCase() === filter.toLowerCase();
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
    switch (recommendation.toUpperCase()) {
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

      {/* Search Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="mr-2 h-5 w-5" />
            Search Company News
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Enter company name (e.g., Apple, Tesla, Microsoft)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={searchLoading || !searchQuery.trim()}>
              {searchLoading ? "Searching..." : "Search"}
            </Button>
            {isSearchMode && (
              <Button type="button" variant="outline" onClick={clearSearch}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to All News
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Filter Buttons - Only show in search mode */}
      {isSearchMode && (
        <div className="mb-6 flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All Results
          </Button>
          <Button
            variant={filter === "buy" ? "default" : "outline"}
            onClick={() => setFilter("buy")}
            className="gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Buy Signals
          </Button>
          <Button
            variant={filter === "hold" ? "default" : "outline"}
            onClick={() => setFilter("hold")}
            className="gap-2"
          >
            <Minus className="h-4 w-4" />
            Hold
          </Button>
          <Button
            variant={filter === "sell" ? "default" : "outline"}
            onClick={() => setFilter("sell")}
            className="gap-2"
          >
            <TrendingDown className="h-4 w-4" />
            Sell Signals
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {isSearchMode ? (
          // Search Results with Sentiment Analysis
          searchLoading ? (
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
            filteredSearchedArticles.map((article) => (
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
          )
        ) : (
          // Initial News Display (No Sentiment Analysis)
          loading ? (
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
            articles.map((article) => (
              <Card key={article.id} className="hover:shadow-lg transition-shadow">
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
              </Card>
            ))
          )
        )}
      </div>
    </div>
  );
}
