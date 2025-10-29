import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PriceData {
  date: string;
  price: number;
  volume?: number;
  change?: number;
}

interface PriceChartProps {
  symbol: string;
}

const timeRanges = [
  { label: "1D", value: "1d", days: 1 },
  { label: "1W", value: "1w", days: 7 },
  { label: "1M", value: "1m", days: 30 },
  { label: "3M", value: "3m", days: 90 },
  { label: "6M", value: "6m", days: 180 },
  { label: "1Y", value: "1y", days: 365 },
];

export default function PriceChart({ symbol }: PriceChartProps) {
  const [allPriceData, setAllPriceData] = useState<PriceData[]>([]);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState("1m");
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (symbol) {
      fetchAllPriceData();
    }
  }, [symbol]);

  // Filter data when range changes
  useEffect(() => {
    if (allPriceData.length > 0) {
      filterDataByRange(selectedRange);
    }
  }, [selectedRange, allPriceData]);

  const fetchAllPriceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all historical data from Supabase (without range parameter)
      const { data, error } = await supabase.functions.invoke('stock-detail', {
        body: { symbol }
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch price data');
      }

      if (data && (data.historicalData || data.closingPrices)) {
        // Process the data - try new format first, fallback to old format
        let rawData: any[] = [];

        if (data.closingPrices && Array.isArray(data.closingPrices)) {
          // New format with closing prices
          rawData = data.closingPrices;
        } else if (data.historicalData && Array.isArray(data.historicalData)) {
          // Old format with full historical data
          rawData = data.historicalData
            .filter((item: any) => item.close !== null && item.close !== undefined)
            .map((item: any) => ({
              date: item.date,
              price: item.close,
              volume: item.volume || 0
            }));
        }

        if (rawData.length === 0) {
          throw new Error('No historical price data available');
        }

        // Convert to our PriceData format
        const processedData: PriceData[] = rawData.map((item: any, index: number) => {
          const price = typeof item === 'number' ? item : item.price || item.close;
          const date = typeof item === 'object' && item.date ? item.date : new Date(Date.now() - (rawData.length - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const volume = typeof item === 'object' ? item.volume : undefined;

          return {
            date,
            price: Number(price),
            volume: volume ? Number(volume) : undefined
          };
        });

        // Sort by date (oldest first)
        processedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate changes for each point
        const dataWithChanges = processedData.map((point, index) => {
          if (index === 0) {
            return { ...point, change: 0 };
          }
          const prevPrice = processedData[index - 1].price;
          const change = point.price - prevPrice;
          return { ...point, change };
        });

        setAllPriceData(dataWithChanges);

        // Set current price and change (last point vs first point for the entire dataset)
        if (dataWithChanges.length > 0) {
          const lastPrice = dataWithChanges[dataWithChanges.length - 1].price;
          const firstPrice = dataWithChanges[0].price;

          setCurrentPrice(lastPrice);
          setPriceChange(lastPrice - firstPrice);
        }
      } else {
        throw new Error('Invalid response format from API');
      }
    } catch (err) {
      console.error('Error fetching price data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load price data');
      setAllPriceData([]);
      setPriceData([]);
      setCurrentPrice(0);
      setPriceChange(0);
    } finally {
      setLoading(false);
    }
  };

  const filterDataByRange = (range: string) => {
    const rangeData = timeRanges.find(r => r.value === range);
    const days = rangeData?.days || 30;

    // Take the last N days of data
    const filteredData = allPriceData.slice(-days);
    setPriceData(filteredData);

    // Update price change for the selected range
    if (filteredData.length > 1) {
      const lastPrice = filteredData[filteredData.length - 1].price;
      const firstPrice = filteredData[0].price;
      setPriceChange(lastPrice - firstPrice);
    } else if (filteredData.length === 1) {
      setPriceChange(0); // No change if only one data point
    }
  };

  const formatPrice = (value: number) => `$${value.toFixed(2)}`;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const range = timeRanges.find(r => r.value === selectedRange);

    if (range?.value === '1d') {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else if (range?.value === '1w') {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const isPositive = priceChange >= 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Price Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading chart data...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Price Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-sm mb-2">Failed to load chart data</p>
              <p className="text-xs">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPriceData}
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Price Chart
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="text-lg font-semibold">{formatPrice(currentPrice)}</div>
              <div className={`text-sm flex items-center justify-end ${
                isPositive ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'
              }`}>
                {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {isPositive ? '+' : ''}{formatPrice(Math.abs(priceChange))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-1">
          {timeRanges.map((range) => (
            <Button
              key={range.value}
              variant={selectedRange === range.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRange(range.value)}
              className="h-8 px-3"
              disabled={allPriceData.length === 0} // Only disable if no data available
            >
              {range.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={priceData}>
              <defs>
                <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? "hsl(var(--bullish))" : "hsl(var(--bearish))"} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isPositive ? "hsl(var(--bullish))" : "hsl(var(--bearish))"} stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                domain={['dataMin - 5', 'dataMax + 5']}
                tickFormatter={formatPrice}
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                labelFormatter={(value) => formatDate(value)}
                formatter={(value: number, name, props) => {
                  const change = props.payload?.change;
                  const changeStr = change != null ? ` (${change >= 0 ? '+' : ''}${change.toFixed(2)})` : '';
                  return [`${formatPrice(value)}${changeStr}`, 'Price'];
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={isPositive ? "hsl(var(--bullish))" : "hsl(var(--bearish))"}
                strokeWidth={2}
                fill={`url(#gradient-${symbol})`}
                dot={false}
                activeDot={{ r: 4, fill: isPositive ? "hsl(var(--bullish))" : "hsl(var(--bearish))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}