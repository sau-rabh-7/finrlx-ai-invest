import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, BarChart3, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
}

export default function Market() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [gainers, setGainers] = useState<Stock[]>([]);
  const [losers, setLosers] = useState<Stock[]>([]);
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async () => {
    try {
      // Fetch market overview
      const { data: overviewData } = await supabase.functions.invoke('nse-market-data', {
        body: { type: 'overview' }
      });
      if (overviewData?.indices) {
        setIndices(overviewData.indices);
      }

      // Fetch top gainers
      const { data: gainersData } = await supabase.functions.invoke('nse-market-data', {
        body: { type: 'gainers' }
      });
      if (gainersData?.stocks) {
        setGainers(gainersData.stocks);
      }

      // Fetch top losers
      const { data: losersData } = await supabase.functions.invoke('nse-market-data', {
        body: { type: 'losers' }
      });
      if (losersData?.stocks) {
        setLosers(losersData.stocks);
      }

      // Fetch market summary
      const { data: summaryData } = await supabase.functions.invoke('nse-market-data', {
        body: { type: 'market-summary' }
      });
      if (summaryData) {
        setSummary(summaryData);
      }
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
        <p className="text-muted-foreground">Real-time NSE market data and performance</p>
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                Total Turnover
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{(summary.totalTurnover / 10000000).toFixed(2)}Cr
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
                Total Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totalTransactions.toLocaleString('en-IN')}
              </div>
            </CardContent>
          </Card>
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
                    <TableRow key={stock.symbol}>
                      <TableCell className="font-medium">{stock.symbol}</TableCell>
                      <TableCell className="text-right">
                        ₹{stock.lastPrice.toFixed(2)}
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
                    <TableRow key={stock.symbol}>
                      <TableCell className="font-medium">{stock.symbol}</TableCell>
                      <TableCell className="text-right">
                        ₹{stock.lastPrice.toFixed(2)}
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
    </div>
  );
}
