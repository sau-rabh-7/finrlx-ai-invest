import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, Loader2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import PriceChart from "@/components/PriceChart";
import { SentimentAnalysis, SentimentData } from "@/components/SentimentAnalysis";
import { toast } from "sonner";

interface StockDetail {
  symbol: string;
  companyName: string;
  industry: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  previousClose: number;
  volume: number;
  marketCap: number;
  week52High: number;
  week52Low: number;
  aiAnalysis: {
    recommendation: string;
    confidence: number;
    summary: string;
    reasoning: string;
  };
}

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
}

interface NewsWithSentiment extends NewsArticle {
  sentiment: SentimentData | null;
  sentimentLoading: boolean;
}

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [stock, setStock] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState<NewsWithSentiment[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [analyzingAll, setAnalyzingAll] = useState(false);

  useEffect(() => {
    if (symbol) {
      fetchStockDetail();
    }
  }, [symbol]);

  const fetchStockDetail = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stock-detail', {
        body: { symbol }
      });

      if (error) throw error;
      if (data) {
        setStock(data);
      }
    } catch (error) {
      console.error('Error fetching stock detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyNews = async () => {
    if (!stock) return;
    
    try {
      setNewsLoading(true);
      const { data, error } = await supabase.functions.invoke('news', {
        body: { query: stock.companyName }
      });

      if (error) throw error;
      
      if (data?.articles) {
        const articlesWithSentiment: NewsWithSentiment[] = data.articles.slice(0, 5).map((article: NewsArticle) => ({
          ...article,
          sentiment: null,
          sentimentLoading: false
        }));
        
        setNews(articlesWithSentiment);
        setShowNews(true);
        toast.success(`Found ${articlesWithSentiment.length} articles for ${stock.companyName}`);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      toast.error("Failed to fetch news");
    } finally {
      setNewsLoading(false);
    }
  };

  const analyzeSingleNews = async (index: number) => {
    const article = news[index];
    if (!article || article.sentimentLoading) return;

    setNews(prev => {
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

      setNews(prev => {
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
      setNews(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], sentimentLoading: false };
        return updated;
      });
      toast.error("Failed to analyze sentiment");
    }
  };

  const analyzeAllNews = async () => {
    if (news.length === 0) return;

    setAnalyzingAll(true);
    setNews(prev => prev.map(article => ({ ...article, sentimentLoading: true })));
    
    toast.info(`Analyzing ${news.length} articles with FinBERT...`);

    try {
      const { sentimentApi } = await import('@/services/sentimentApi');
      
      for (let i = 0; i < news.length; i++) {
        const article = news[i];
        try {
          const sentimentData = await sentimentApi.analyzeSentiment(
            article.summary,
            article.title
          );

          setNews(prev => {
            const updated = [...prev];
            updated[i] = {
              ...updated[i],
              sentiment: sentimentData as SentimentData,
              sentimentLoading: false
            };
            return updated;
          });
        } catch (err) {
          console.error(`Error analyzing article ${i}:`, err);
          setNews(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], sentimentLoading: false };
            return updated;
          });
        }
      }

      toast.success("All articles analyzed!");
    } catch (error) {
      console.error('Error in batch analysis:', error);
      toast.error("Some analyses failed");
    } finally {
      setAnalyzingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Stock not found</p>
      </div>
    );
  }

  const isPositive = stock.change >= 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate('/stocks')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Stocks
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Stock Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-3xl">{stock.symbol}</CardTitle>
                  <p className="text-muted-foreground mt-1">{stock.companyName}</p>
                  <Badge variant="outline" className="mt-2">{stock.industry}</Badge>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    ${stock.currentPrice.toFixed(2)}
                  </div>
                  <div className={`flex items-center justify-end text-sm mt-1 ${
                    isPositive ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'
                  }`}>
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    {isPositive ? '+' : ''}{stock.change.toFixed(2)} ({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Open</div>
                  <div className="text-lg font-semibold">${stock.open.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Day High</div>
                  <div className="text-lg font-semibold">${stock.dayHigh.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Day Low</div>
                  <div className="text-lg font-semibold">${stock.dayLow.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Prev Close</div>
                  <div className="text-lg font-semibold">${stock.previousClose.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Volume</div>
                  <div className="text-lg font-semibold">{stock.volume.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Market Cap</div>
                  <div className="text-lg font-semibold">${(stock.marketCap / 1000000000).toFixed(2)}B</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">52W High</div>
                  <div className="text-lg font-semibold">${stock.week52High.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">52W Low</div>
                  <div className="text-lg font-semibold">${stock.week52Low.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <PriceChart symbol={stock.symbol} />
        </div>

        {/* AI Analysis Sidebar */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>AI Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">Powered by FinBERT</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-2">Recommendation</div>
                <Badge 
                  variant="outline" 
                  className="text-lg px-4 py-2 bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300"
                >
                  {stock.aiAnalysis.recommendation}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  Confidence: {stock.aiAnalysis.confidence}%
                </p>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-2">Summary</div>
                <p className="text-sm bg-muted p-3 rounded-md italic">
                  {stock.aiAnalysis.summary}
                </p>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-2">Reasoning</div>
                <p className="text-sm bg-muted p-3 rounded-md italic">
                  {stock.aiAnalysis.reasoning}
                </p>
              </div>

              {/* News Sentiment Analysis Section */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold">News Sentiment</div>
                  {!showNews && (
                    <Button
                      size="sm"
                      onClick={fetchCompanyNews}
                      disabled={newsLoading}
                      className="h-8"
                    >
                      {newsLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          Fetch News
                        </>
                      )}
                    </Button>
                  )}
                  {showNews && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowNews(false)}
                      className="h-8"
                    >
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Hide
                    </Button>
                  )}
                </div>

                {showNews && news.length > 0 && (
                  <div className="space-y-3">
                    {/* Analyze All Button */}
                    <Button
                      size="sm"
                      onClick={analyzeAllNews}
                      disabled={analyzingAll || news.every(n => n.sentiment !== null)}
                      className="w-full gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <Loader2 className={`h-3 w-3 ${analyzingAll ? 'animate-spin' : ''}`} />
                      {news.every(n => n.sentiment !== null) ? 'All Analyzed' : `Analyze All (${news.length})`}
                    </Button>

                    {/* News Articles */}
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {news.map((article, index) => (
                        <Card key={article.id} className="border">
                          <CardContent className="p-3 space-y-2">
                            <div>
                              <h4 className="text-xs font-semibold line-clamp-2 mb-1">
                                {article.title}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{article.source}</span>
                                <span>•</span>
                                <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                              </div>
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                              >
                                Read article
                                <ExternalLink className="h-2 w-2" />
                              </a>
                            </div>

                            {article.sentimentLoading ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              </div>
                            ) : article.sentiment ? (
                              <SentimentAnalysis sentiment={article.sentiment} showXAI={true} />
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => analyzeSingleNews(index)}
                                className="w-full h-8 text-xs"
                              >
                                <Loader2 className="h-3 w-3 mr-1" />
                                Analyze Sentiment
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {showNews && news.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No recent news found for {stock.companyName}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Real-time sentiment analysis powered by FinBERT. Click "Fetch News" to analyze recent articles.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
