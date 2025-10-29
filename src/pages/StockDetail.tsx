import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, TrendingUp, TrendingDown, Loader2, ExternalLink, Brain, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import PriceChart from "@/components/PriceChart";
import { SentimentAnalysis, SentimentData } from "@/components/SentimentAnalysis";
import { priceApi, PriceForecast } from "@/services/priceApi";
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
  
  // Price prediction state
  const [forecast, setForecast] = useState<PriceForecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastDays, setForecastDays] = useState(5);
  const [lookbackDays, setLookbackDays] = useState(60);
  const [historicalPrices, setHistoricalPrices] = useState<number[]>([]);
  
  // News sentiment state
  const [news, setNews] = useState<NewsWithSentiment[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [analyzingAll, setAnalyzingAll] = useState(false);

  useEffect(() => {
    if (symbol) {
      fetchStockDetail(); // This now also loads historical prices
    }
  }, [symbol]);

  useEffect(() => {
    if (historicalPrices.length >= lookbackDays) {
      fetchPriceForecast();
    }
  }, [historicalPrices, forecastDays, lookbackDays]);

  const fetchStockDetail = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stock-detail', {
        body: { symbol }
      });

      if (error) throw error;
      if (data) {
        setStock(data);
        
        // Extract closing prices for LSTM predictions
        // Try closingPrices first (new format), fallback to historicalData (current format)
        let prices: number[] = [];
        
        if (data.closingPrices && data.closingPrices.length > 0) {
          // New format (after edge function is redeployed)
          prices = data.closingPrices;
          console.log(`✅ Loaded ${prices.length} days of historical data from closingPrices`);
        } else if (data.historicalData && data.historicalData.length > 0) {
          // Current format (extract from historicalData)
          prices = data.historicalData
            .filter((d: any) => d.close !== null && d.close !== undefined)
            .map((d: any) => d.close);
          console.log(`✅ Extracted ${prices.length} closing prices from historicalData`);
        } else {
          console.warn('⚠️ No historical data in stock-detail response');
        }
        
        setHistoricalPrices(prices);
      }
    } catch (error) {
      console.error('Error fetching stock detail:', error);
      toast.error('Failed to load stock data');
      setHistoricalPrices([]);
    } finally {
      setLoading(false);
    }
  };


  const fetchPriceForecast = async () => {
    if (!symbol || historicalPrices.length < lookbackDays) return;
    
    try {
      setForecastLoading(true);
      const data = await priceApi.predictPriceWithData(
        symbol,
        historicalPrices,
        forecastDays,
        lookbackDays
      );
      setForecast(data);
    } catch (error) {
      console.error('Error fetching price forecast:', error);
      toast.error("Failed to load price forecast");
    } finally {
      setForecastLoading(false);
    }
  };

  const handleForecastDaysChange = (value: number[]) => {
    setForecastDays(value[0]);
  };

  const handleLookbackDaysChange = (value: number[]) => {
    setLookbackDays(value[0]);
  };

  const fetchCompanyNews = async () => {
  // Ensure stock data (including the symbol) is available
  if (!stock || !stock.symbol) {
    console.log("Stock data or symbol not available for news fetch.");
    return;
  }

  try {
    setNewsLoading(true);
    // *** CHANGE: Pass stock.symbol as the 'ticker' parameter ***
    const { data, error } = await supabase.functions.invoke('news', {
      body: { ticker: stock.symbol } // Use 'ticker' to match the Supabase function expectation
    });

    if (error) {
        // Log the specific error from the function invoke
        console.error('Supabase function invoke error:', error);
        throw new Error(error.message || 'Function invocation failed');
    }

    if (data?.articles && Array.isArray(data.articles)) {
      // Map articles, keep placeholder for sentiment
      const articlesWithSentiment: NewsWithSentiment[] = data.articles
        // Ensure basic article structure before mapping
        .filter((article: any) => article && article.title && article.url)
        .slice(0, 10) // Limit to 10 articles client-side
        .map((article: NewsArticle) => ({
          ...article,
          sentiment: null, // Placeholder for future FinBERT integration
          sentimentLoading: false
        }));

      setNews(articlesWithSentiment);
      setShowNews(articlesWithSentiment.length > 0); // Only show if there are articles

      // Optional: Remove or make this toast conditional if it's too noisy
      // toast.success(`Found ${articlesWithSentiment.length} relevant articles for ${stock.symbol}`);

    } else {
        console.log("No articles array received from the news function.");
        setNews([]); // Clear news if none found
        setShowNews(false);
        // Optional: Inform user if no news found specifically
        // toast.info(`No recent news found for ${stock.symbol}`);
    }
  } catch (error) {
    console.error('Error fetching company news:', error);
    toast.error(`Failed to fetch news for ${stock.symbol}`);
    setNews([]); // Clear news on error
    setShowNews(false);
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
        {/* Main Stock Info - Left Side (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stock Header */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-3xl">{stock.symbol}</CardTitle>
                  <p className="text-muted-foreground">{stock.companyName}</p>
                  <Badge variant="outline" className="mt-2">{stock.industry}</Badge>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">${stock.currentPrice.toFixed(2)}</div>
                  <div className={`flex items-center justify-end gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    <span className="font-semibold">
                      {isPositive ? '+' : ''}{stock.change.toFixed(2)} ({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                    </span>
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
                  <div className="text-sm text-muted-foreground">High</div>
                  <div className="text-lg font-semibold">${stock.dayHigh.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Low</div>
                  <div className="text-lg font-semibold">${stock.dayLow.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Prev Close</div>
                  <div className="text-lg font-semibold">${stock.previousClose.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Volume</div>
                  <div className="text-lg font-semibold">{(stock.volume / 1000000).toFixed(2)}M</div>
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

          {/* Price Chart */}
          <PriceChart symbol={stock.symbol} />
        </div>

        {/* AI Analysis Sidebar - Right Side (1 column) */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                <CardTitle>AI Price Forecast</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">LSTM Model with SHAP</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {forecastLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : historicalPrices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Unable to fetch historical data</p>
                  <p className="text-xs text-muted-foreground">Please check your connection and try again</p>
                  <Button 
                    onClick={fetchStockDetail} 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                  >
                    Retry
                  </Button>
                </div>
              ) : forecast ? (
                <>
                  {/* Lookback Days Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Lookback Days</label>
                      <span className="text-sm font-bold text-blue-600">{lookbackDays}</span>
                    </div>
                    <Slider
                      value={[lookbackDays]}
                      onValueChange={handleLookbackDaysChange}
                      min={30}
                      max={120}
                      step={10}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>30 days</span>
                      <span>120 days</span>
                    </div>
                  </div>

                  {/* Forecast Days Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Forecast Days</label>
                      <span className="text-sm font-bold text-purple-600">{forecastDays}</span>
                    </div>
                    <Slider
                      value={[forecastDays]}
                      onValueChange={handleForecastDaysChange}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1 day</span>
                      <span>10 days</span>
                    </div>
                  </div>

                  {/* Overall Trend */}
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Trend</div>
                    <Badge 
                      className={`text-lg px-4 py-2 ${
                        forecast.overall_trend === 'bullish' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {forecast.overall_trend === 'bullish' ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                      {forecast.overall_trend.toUpperCase()}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      Confidence: {(forecast.confidence * 100).toFixed(0)}%
                    </p>
                  </div>

                  {/* Price Predictions */}
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Predictions</div>
                    <div className="space-y-2">
                      {forecast.predictions.map((pred) => (
                        <div key={pred.day} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium">Day {pred.day}</span>
                            <span className="text-xs text-muted-foreground">{pred.date}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold">${pred.price.toFixed(2)}</div>
                            <div className={`text-xs ${pred.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {pred.change >= 0 ? '+' : ''}{pred.change_percent.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SHAP Explanation */}
                  <div className="pt-4 border-t">
                    <div className="text-sm font-semibold mb-2">Explainable AI (SHAP)</div>
                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {forecast.xai.explanation}
                      </p>
                    </div>
                    
                    {/* Top Influential Days */}
                    <div className="mt-3">
                      <div className="text-xs text-muted-foreground mb-2">Most Influential Days</div>
                      <div className="flex flex-wrap gap-1.5">
                        {forecast.xai.top_influential_days.map((days, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {days} days ago
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Feature Importances */}
                    {forecast.xai.feature_importances.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs text-muted-foreground mb-2">Feature Importance</div>
                        <div className="space-y-1">
                          {forecast.xai.feature_importances.slice(0, 5).map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className={`text-xs ${
                                feature.direction === 'positive' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {feature.days_ago}d
                              </span>
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${
                                    feature.direction === 'positive' ? 'bg-green-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${feature.importance * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {(feature.importance * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Failed to load forecast
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* News Sentiment Section - Bottom (Full Width) */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>News Sentiment Analysis</CardTitle>
                <p className="text-sm text-muted-foreground">AI-powered sentiment analysis on latest news</p>
              </div>
              {!showNews ? (
                <Button
                  onClick={fetchCompanyNews}
                  disabled={newsLoading}
                  className="gap-2"
                >
                  {newsLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Fetch News'
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => setShowNews(false)}
                  variant="outline"
                >
                  Hide News
                </Button>
              )}
            </div>
          </CardHeader>
          
          {showNews && news.length > 0 && (
            <CardContent className="space-y-4">
              {/* Analyze All Button */}
              <Button
                onClick={analyzeAllNews}
                disabled={analyzingAll || news.every(n => n.sentiment !== null)}
                className="w-full gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {/* <Loader2 className={`h-4 w-4 ${analyzingAll ? 'animate-spin' : ''}`} /> */}
                {news.every(n => n.sentiment !== null) ? 'All Analyzed' : `Analyze All (${news.length})`}
              </Button>

              {/* News Grid - Horizontal Layout like News Page */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {news.map((article, index) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold line-clamp-2 mb-2">
                          {article.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <span>{article.source}</span>
                          <span>•</span>
                          <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {article.summary}
                        </p>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          Read full article
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      {article.sentimentLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : article.sentiment ? (
                        <SentimentAnalysis sentiment={article.sentiment} showXAI={true} />
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => analyzeSingleNews(index)}
                          className="w-full gap-2"
                        >
                          {/* <Loader2 className="h-3 w-3" /> */}
                          Analyze Sentiment
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          )}

          {showNews && news.length === 0 && (
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                No recent news found for {stock.companyName}
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
