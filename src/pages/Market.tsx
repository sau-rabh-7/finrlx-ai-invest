import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MarketIndex {
  name: string;
  ticker: string;
  value: number;
  change: number;
  changePercent: number;
}

export default function Market() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async () => {
    try {
      const tickers = ['^GSPC', '^DJI', '^IXIC', '^RUT'];
      const names = ['S&P 500', 'Dow Jones', 'NASDAQ', 'Russell 2000'];
      
      const promises = tickers.map(ticker =>
        supabase.functions.invoke('stock-data', { body: { ticker } })
      );

      const results = await Promise.all(promises);
      
      const marketData = results.map((result, i) => {
        if (result.data) {
          return {
            name: names[i],
            ticker: tickers[i],
            value: result.data.currentPrice,
            change: result.data.change,
            changePercent: result.data.changePercent
          };
        }
        return null;
      }).filter(Boolean) as MarketIndex[];

      setIndices(marketData);
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Market Overview</h1>
        <p className="text-muted-foreground">Real-time market indices and performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-muted rounded w-24"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-32 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-20"></div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          indices.map((index) => (
            <Card key={index.ticker} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {index.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">
                  {index.value.toLocaleString('en-US', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  })}
                </div>
                <div className={`flex items-center text-sm ${
                  index.change >= 0 ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'
                }`}>
                  {index.change >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {index.change >= 0 ? '+' : ''}
                  {index.changePercent.toFixed(2)}%
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Top Movers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Market movers data will be displayed here
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Market Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Market Status</div>
                <div className="text-lg font-semibold">
                  {new Date().getHours() >= 9 && new Date().getHours() < 16 ? 
                    <span className="text-[hsl(var(--bullish))]">Open</span> : 
                    <span className="text-[hsl(var(--bearish))]">Closed</span>
                  }
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Last Updated</div>
                <div className="text-sm">{new Date().toLocaleTimeString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
