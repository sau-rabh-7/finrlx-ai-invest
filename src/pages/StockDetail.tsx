import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface StockDetail {
  symbol: string;
  companyName: string;
  industry: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  marketCap: number;
  pe: number;
  week52High: number;
  week52Low: number;
  aiAnalysis: {
    recommendation: string;
    confidence: number;
    summary: string;
    reasoning: string;
  };
}

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [stock, setStock] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (symbol) {
      fetchStockDetail();
    }
  }, [symbol]);

  const fetchStockDetail = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('nse-stock-detail', {
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
                    ₹{stock.currentPrice.toFixed(2)}
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
                  <div className="text-lg font-semibold">₹{stock.open.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">High</div>
                  <div className="text-lg font-semibold">₹{stock.high.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Low</div>
                  <div className="text-lg font-semibold">₹{stock.low.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Prev Close</div>
                  <div className="text-lg font-semibold">₹{stock.previousClose.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Volume</div>
                  <div className="text-lg font-semibold">{stock.volume.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">P/E Ratio</div>
                  <div className="text-lg font-semibold">{stock.pe.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">52W High</div>
                  <div className="text-lg font-semibold">₹{stock.week52High.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">52W Low</div>
                  <div className="text-lg font-semibold">₹{stock.week52Low.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Price Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Historical price chart will be displayed here
              </p>
            </CardContent>
          </Card>
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

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  This analysis will be generated by your FinBERT model. The current data is a placeholder.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
