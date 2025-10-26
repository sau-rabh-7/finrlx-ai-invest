import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, BarChart3, DollarSign, Flame, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";

interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

interface Stock {
  symbol: string;
  lastPrice: number;
  pChange: number;
  change: number;
}

interface MarketSummary {
  totalTurnover: number;
  totalShares: number;
  totalTransactions: number;
  advances: number;
  declines: number;
  unchanged: number;
  totalMarketCap?: number;
  totalVolume?: number;
}

interface TickerStock {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function Market() {
  const navigate = useNavigate();
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [gainers, setGainers] = useState<Stock[]>([]);
  const [losers, setLosers] = useState<Stock[]>([]);
  const [trending, setTrending] = useState<Stock[]>([]);
  const [mostActive, setMostActive] = useState<Stock[]>([]);
  const [tickerStocks, setTickerStocks] = useState<TickerStock[]>([]);
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async () => {
    try {
      // Fetch all market data in parallel
      const [overviewRes, gainersRes, losersRes, trendingRes, activeRes, summaryRes] = await Promise.all([
        supabase.functions.invoke('market-data', { body: { type: 'overview' } }),
        supabase.functions.invoke('market-data', { body: { type: 'gainers' } }),
        supabase.functions.invoke('market-data', { body: { type: 'losers' } }),
        supabase.functions.invoke('market-data', { body: { type: 'trending' } }),
        supabase.functions.invoke('market-data', { body: { type: 'most-active' } }),
        supabase.functions.invoke('market-data', { body: { type: 'market-summary' } })
      ]);

      if (overviewRes.data?.indices) setIndices(overviewRes.data.indices);
      if (gainersRes.data?.stocks) setGainers(gainersRes.data.stocks);
      if (losersRes.data?.stocks) setLosers(losersRes.data.stocks);
      if (trendingRes.data?.stocks) setTrending(trendingRes.data.stocks);
      if (activeRes.data?.stocks) setMostActive(activeRes.data.stocks);
      if (summaryRes.data) setSummary(summaryRes.data);

      // Create ticker from all stocks
      const allStocks = [
        ...(gainersRes.data?.stocks || []).slice(0, 8),
        ...(trendingRes.data?.stocks || []).slice(0, 8),
        ...(activeRes.data?.stocks || []).slice(0, 9)
      ];
      
      const ticker = allStocks.map(s => ({
        symbol: s.symbol,
        price: s.lastPrice,
        change: s.change,
        changePercent: s.pChange
      }));
      
      setTickerStocks(ticker);
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
        <p className="text-muted-foreground">Real-time market data and performance</p>
      </div>
      {/* Ticker Slideshow */}
      {tickerStocks.length > 0 && (
        <div className="mb-8 overflow-hidden bg-card border rounded-lg">
          <div className="ticker-wrapper">
            <div className="ticker-content">
              {/* Duplicate for seamless loop */}
              {[...tickerStocks, ...tickerStocks].map((stock, index) => (
                <div
                  key={`${stock.symbol}-${index}`}
                  className="ticker-item inline-flex items-center px-6 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/stocks/${stock.symbol}`)}
                >
                  <span className="font-bold text-sm mr-2">{stock.symbol}</span>
                  <span className="text-sm mr-2">${stock.price.toFixed(2)}</span>
                  <span className={`text-xs font-medium ${
                    stock.changePercent >= 0 ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'
                  }`}>
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .ticker-wrapper {
          overflow: hidden;
          white-space: nowrap;
        }
        
        .ticker-content {
          display: inline-block;
          animation: ticker 60s linear infinite;
        }
        
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .ticker-content:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Market Indices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {loading ? (
          <>
            {[1, 2].map(i => (
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
            <Card key={index.name} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {index.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">
                  {index.value.toLocaleString('en-IN', { 
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

      {/* Market Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                Total Turnover
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(summary.totalTurnover / 1000000000).toFixed(2)}B
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <Activity className="h-4 w-4 mr-1" />
                Total Shares
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(summary.totalShares / 1000000).toFixed(2)}M
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <BarChart3 className="h-4 w-4 mr-1" />
                Advances / Declines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className="text-[hsl(var(--bullish))]">{summary.advances}</span>
                {' / '}
                <span className="text-[hsl(var(--bearish))]">{summary.declines}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <Activity className="h-4 w-4 mr-1" />
                Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(summary.totalTransactions / 1000).toFixed(1)}K
              </div>
            </CardContent>
          </Card>
          {summary.totalVolume && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <Zap className="h-4 w-4 mr-1" />
                  Total Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(summary.totalVolume / 1000000000).toFixed(2)}B
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Top Gainers and Losers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-[hsl(var(--bullish))]">
              <TrendingUp className="mr-2 h-5 w-5" />
              Top Gainers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Change %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gainers.slice(0, 10).map((stock) => (
                    <TableRow 
                      key={stock.symbol}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/stocks/${stock.symbol}`)}
                    >
                      <TableCell className="font-medium">{stock.symbol}</TableCell>
                      <TableCell className="text-right">
                        ${stock.lastPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-[hsl(var(--bullish))]">
                        +{stock.pChange.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-[hsl(var(--bearish))]">
              <TrendingDown className="mr-2 h-5 w-5" />
              Top Losers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Change %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {losers.slice(0, 10).map((stock) => (
                    <TableRow 
                      key={stock.symbol}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/stocks/${stock.symbol}`)}
                    >
                      <TableCell className="font-medium">{stock.symbol}</TableCell>
                      <TableCell className="text-right">
                        ${stock.lastPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-[hsl(var(--bearish))]">
                        {stock.pChange.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trending and Most Active */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-orange-500">
              <Flame className="mr-2 h-5 w-5" />
              Trending Stocks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            ) : trending.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No trending stocks data available</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Change %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trending.slice(0, 10).map((stock) => (
                    <TableRow 
                      key={stock.symbol}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/stocks/${stock.symbol}`)}
                    >
                      <TableCell className="font-medium">{stock.symbol}</TableCell>
                      <TableCell className="text-right">
                        ${stock.lastPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-right ${
                        stock.pChange >= 0 ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'
                      }`}>
                        {stock.pChange >= 0 ? '+' : ''}{stock.pChange.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-blue-500">
              <Zap className="mr-2 h-5 w-5" />
              Most Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            ) : mostActive.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No most active stocks data available</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Change %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mostActive.slice(0, 10).map((stock) => (
                    <TableRow 
                      key={stock.symbol}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/stocks/${stock.symbol}`)}
                    >
                      <TableCell className="font-medium">{stock.symbol}</TableCell>
                      <TableCell className="text-right">
                        ${stock.lastPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-right ${
                        stock.pChange >= 0 ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'
                      }`}>
                        {stock.pChange >= 0 ? '+' : ''}{stock.pChange.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
