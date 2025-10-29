import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, TrendingDown, Minus, Search, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SentimentAnalysis, SentimentData } from "@/components/SentimentAnalysis";
import { useBatchSentimentAnalysis } from "@/hooks/useSentimentAnalysis";
import { toast } from "sonner";

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
}

interface NewsArticleWithSentiment extends NewsArticle {
  sentiment: SentimentData | null;
  sentimentLoading?: boolean;
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
      
      // Fetch news articles
      const { data, error } = await supabase.functions.invoke('news', {
        body: { query: query.trim() }
      });

      if (error) throw error;
      
      if (data?.articles) {
        // Initialize articles with null sentiment (not analyzed yet)
        const articlesWithoutSentiment: NewsArticleWithSentiment[] = data.articles.map((article: NewsArticle) => ({
          ...article,
          sentiment: null,
          sentimentLoading: false
        }));
        
        setSearchedArticles(articlesWithoutSentiment);
        setIsSearchMode(true);
        setSearchLoading(false);
        toast.success(`Found ${data.articles.length} articles. Click "Analyze All" or analyze individually.`);
      }
    } catch (error) {
      console.error('Error searching news:', error);
      toast.error("Failed to fetch news. Please try again.");
      setSearchLoading(false);
    }
  };

  const analyzeSingleArticle = async (index: number) => {
    const article = searchedArticles[index];
    if (!article || article.sentimentLoading) return;

    // Set loading state
    setSearchedArticles(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], sentimentLoading: true };
      return updated;
    });

    try {
      const { sentimentApi } = await import('@/services/sentimentApi');
      const sentimentData = await sentimentApi.analyzeSentiment(
        article.summary,
        article.title
      );

      setSearchedArticles(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          sentiment: sentimentData as SentimentData,
          sentimentLoading: false
        };
        return updated;
      });

      toast.success("Sentiment analyzed!");
    } catch (err) {
      console.error(`Error analyzing sentiment:`, err);
      setSearchedArticles(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], sentimentLoading: false };
        return updated;
      });
      toast.error("Failed to analyze sentiment");
    }
  };

  const analyzeAllArticles = async () => {
    if (searchedArticles.length === 0) return;

    // Set all to loading
    setSearchedArticles(prev => prev.map(article => ({ ...article, sentimentLoading: true })));
    
    toast.info(`Analyzing ${searchedArticles.length} articles with FinBERT...`);

    try {
      const { sentimentApi } = await import('@/services/sentimentApi');
      
      // Analyze in batches of 5 for better performance
      const batchSize = 5;
      for (let i = 0; i < searchedArticles.length; i += batchSize) {
        const batch = searchedArticles.slice(i, i + batchSize);
        const batchPromises = batch.map(async (article, batchIndex) => {
          const globalIndex = i + batchIndex;
          try {
            const sentimentData = await sentimentApi.analyzeSentiment(
              article.summary,
              article.title
            );

            setSearchedArticles(prev => {
              const updated = [...prev];
              updated[globalIndex] = {
                ...updated[globalIndex],
                sentiment: sentimentData as SentimentData,
                sentimentLoading: false
              };
              return updated;
            });
          } catch (err) {
            console.error(`Error analyzing article ${globalIndex}:`, err);
            setSearchedArticles(prev => {
              const updated = [...prev];
              updated[globalIndex] = { ...updated[globalIndex], sentimentLoading: false };
              return updated;
            });
          }
        });

        await Promise.all(batchPromises);
      }

      toast.success("All articles analyzed!");
    } catch (error) {
      console.error('Error in batch analysis:', error);
      toast.error("Some analyses failed");
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
    if (!article.sentiment) return false;
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

      {/* Filter Buttons and Analyze All - Only show in search mode */}
      {isSearchMode && (
        <div className="mb-6 flex flex-wrap gap-2 items-center">
          <Button
            onClick={analyzeAllArticles}
            disabled={searchedArticles.length === 0 || searchedArticles.some(a => a.sentimentLoading)}
            className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {/* <Loader2 className={`h-4 w-4 ${searchedArticles.some(a => a.sentimentLoading) ? 'animate-spin' : ''}`} /> */}
            Analyze All ({searchedArticles.length})
          </Button>
          
          <div className="h-6 w-px bg-border mx-2" />
          
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
            filteredSearchedArticles.map((article, index) => (
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
                    <CardContent className="pt-6">
                      {article.sentimentLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-3">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">Analyzing with FinBERT...</p>
                        </div>
                      ) : article.sentiment ? (
                        <SentimentAnalysis sentiment={article.sentiment} showXAI={true} />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 space-y-3">
                          <p className="text-sm text-muted-foreground mb-3">Not analyzed yet</p>
                          <Button
                            onClick={() => analyzeSingleArticle(searchedArticles.findIndex(a => a.id === article.id))}
                            size="sm"
                            className="gap-2"
                          >
                            {/* <Loader2 className="h-4 w-4" /> */}
                            Analyze Sentiment
                          </Button>
                        </div>
                      )}
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
