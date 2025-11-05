import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, BarChart3, DollarSign, Flame, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from "@/components/ui/button";

interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  symbol: string; // For API calls & uniqueness
  region: string;
}

interface ChartData {
  time: string;
  value: number;
  change: number; // Storing change percent here
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

const timeRanges = [
  { label: "1D", value: "1d", days: 1 },
  { label: "1W", value: "1w", days: 7 },
  { label: "1M", value: "1m", days: 30 },
  { label: "6M", value: "6m", days: 180 },
  { label: "1Y", value: "1y", days: 365 },
];

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
  const [selectedIndexSymbol, setSelectedIndexSymbol] = useState<string>(""); // Store the symbol
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("1m");
  const [chartLoading, setChartLoading] = useState(false);
  const [periodChange, setPeriodChange] = useState<{ change: number; changePercent: number } | null>(null);

  useEffect(() => {
    fetchMarketData();
  }, []);

  useEffect(() => {
    // Only set default or generate chart if indices are loaded
    if (indices.length > 0) {
      if (!selectedIndexSymbol || !indices.find(idx => idx.symbol === selectedIndexSymbol)) {
        // Set default if no symbol selected OR selected symbol not in list anymore
        const defaultIndex = indices.find(idx => idx.symbol === 'NSEI') || indices.find(idx => idx.region === 'India') || indices[0];
        if (defaultIndex) {
          setSelectedIndexSymbol(defaultIndex.symbol);
        }
      } else {
        // If an index symbol is selected and valid, generate chart data
        generateChartData(selectedIndexSymbol, selectedTimeRange);
      }
    }
  }, [selectedIndexSymbol, indices, selectedTimeRange]); // Rerun when symbol, indices list, or time range changes

  // Debounced chart generation to prevent rapid calls on selection change
  const generateChartData = async (indexSymbol: string, timeRangeValue: string = "1m") => {
    const index = indices.find(idx => idx.symbol === indexSymbol);
    if (!index) return;
    setChartLoading(true); // Start loading chart data
    setChartData([]); // Clear previous data immediately

    // Simulate async data fetching / generation
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay

    try {
      const rangeData = timeRanges.find(r => r.value === timeRangeValue);
      const days = rangeData?.days || 30;

      // Generate historical data - Mock generation
      const data: ChartData[] = [];
      const baseValue = index.value;
      // Start near the base value, slightly adjusted based on total change to make trends look somewhat realistic
      let startValueMultiplier = 1 - (index.changePercent / 100) * (days / 30); // Simple approximation
      startValueMultiplier = Math.max(0.5, Math.min(1.5, startValueMultiplier)); // Clamp multiplier
      let currentValue = baseValue * startValueMultiplier * (0.98 + Math.random() * 0.04);

      let pointsGenerated = 0;
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayOfWeek = date.getDay();

        // Simple skip for weekends on longer ranges
        if (days > 7 && (dayOfWeek === 0 || dayOfWeek === 6)) continue;

        // Generate realistic daily movement (-2% to +2%), trending towards current value
        const targetValue = baseValue; // The current actual value
        const diff = targetValue - currentValue;
        const trendFactor = Math.sign(diff) * Math.min(Math.abs(diff) / baseValue, 0.01) * Math.random(); // Gentle pull towards target
        const randomFactor = (Math.random() - 0.5) * 0.04; // Random daily fluctuation up to +/- 2%

        const dailyChangePercent = (trendFactor + randomFactor) * 100;
        currentValue *= (1 + dailyChangePercent / 100);
        // Ensure non-negative value
        currentValue = Math.max(0, currentValue);


        // Format date based on time range
        let timeLabel: string;
        if (timeRangeValue === "1d") {
           // Simulate intraday time points (e.g., every hour for 8 hours)
           const hours = Math.floor(pointsGenerated / (days / 8)); // Rough hour buckets
           date.setHours(9 + hours, Math.floor(Math.random()*60)); // Simulate market hours 9 AM start
          timeLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } else if (timeRangeValue === "1w") {
          timeLabel = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
        } else {
          timeLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        data.push({
          time: timeLabel,
          value: Math.round(currentValue * 100) / 100,
          change: Math.round(dailyChangePercent * 100) / 100 // Store change percent
        });
        pointsGenerated++;
      }

      // Add the final, actual current value point
       if (data.length > 0) {
           // Ensure the last point is exactly the current value
           data[data.length -1].value = index.value;
           data[data.length -1].change = index.changePercent;
           data[data.length -1].time = (timeRangeValue === "1d" || timeRangeValue === "1w") ? 'Now' : 'Today';
       } else {
           // If no historical points generated (e.g., 1D on weekend), show just the current point
           data.push({ time: 'Now', value: index.value, change: index.changePercent });
       }

      // Calculate period change (from first to last point)
      if (data.length > 1) {
        const firstValue = data[0].value;
        const lastValue = data[data.length - 1].value;
        const absoluteChange = lastValue - firstValue;
        const percentChange = (absoluteChange / firstValue) * 100;
        setPeriodChange({ change: absoluteChange, changePercent: percentChange });
      } else if (data.length === 1) {
        // If only one data point, use the index's current change
        setPeriodChange({ change: index.change, changePercent: index.changePercent });
      } else {
        setPeriodChange(null);
      }

      setChartData(data);
    } catch (error) {
        console.error("Error generating chart data:", error);
        setChartData([]); // Clear data on error
    } finally {
        setChartLoading(false); // Stop loading chart data
    }
  };


  const fetchMarketData = async () => {
    setLoading(true); // Start loading general data
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

       // Process Indices - Robust handling
       let fetchedIndices: MarketIndex[] = [];
       if (overviewRes.data?.indices && Array.isArray(overviewRes.data.indices)) {
         fetchedIndices = overviewRes.data.indices
            .filter((index: any) => index && typeof index === 'object' && index.symbol) // Basic validation
            .map((index: any) => ({
             name: index.name || index.symbol || 'Unknown Index', // Ensure name exists
             value: typeof index.value === 'number' ? index.value : 0,
             change: typeof index.change === 'number' ? index.change : 0,
             changePercent: typeof index.changePercent === 'number' ? index.changePercent : 0,
             symbol: index.symbol,
             region: index.region || 'India' // Default region
           }));
       } else if (overviewRes.error) {
          console.error("Error fetching overview:", overviewRes.error);
       }


      // Add international indices (Mock data - ensure structure matches MarketIndex)
      const internationalIndices: MarketIndex[] = [
        { name: "S&P 500", symbol: "^GSPC", region: "US", value: 5100 + Math.random() * 200, change: Math.random() * 100 - 50, changePercent: Math.random() * 2 - 1 },
        { name: "Dow Jones", symbol: "^DJI", region: "US", value: 38000 + Math.random() * 1000, change: Math.random() * 500 - 250, changePercent: Math.random() * 1.5 - 0.75 },
        { name: "NASDAQ Comp.", symbol: "^IXIC", region: "US", value: 16000 + Math.random() * 500, change: Math.random() * 200 - 100, changePercent: Math.random() * 2.5 - 1.25 },
        { name: "FTSE 100", symbol: "^FTSE", region: "UK", value: 7700 + Math.random() * 200, change: Math.random() * 100 - 50, changePercent: Math.random() * 1.5 - 0.75 },
        { name: "DAX", symbol: "^GDAXI", region: "Germany", value: 17500 + Math.random() * 500, change: Math.random() * 200 - 100, changePercent: Math.random() * 2 - 1 },
        { name: "CAC 40", symbol: "^FCHI", region: "France", value: 7900 + Math.random() * 200, change: Math.random() * 100 - 50, changePercent: Math.random() * 1.8 - 0.9 },
        { name: "NIKKEI 225", symbol: "^N225", region: "Japan", value: 39000 + Math.random() * 1000, change: Math.random() * 500 - 250, changePercent: Math.random() * 2 - 1 },
        { name: "Hang Seng", symbol: "^HSI", region: "Hong Kong", value: 16000 + Math.random() * 500, change: Math.random() * 200 - 100, changePercent: Math.random() * -3 }, // More volatile example
        { name: "Shanghai Comp.", symbol: "000001.SS", region: "China", value: 3000 + Math.random() * 100, change: Math.random() * 50 - 25, changePercent: Math.random() * 1.5 - 0.75 },
        { name: "S&P/ASX 200", symbol: "^AXJO", region: "Australia", value: 7600 + Math.random() * 200, change: Math.random() * 100 - 50, changePercent: Math.random() * 1.2 - 0.6 }
      ];

      // Combine and ensure uniqueness based on symbol
      const combinedIndicesMap = new Map<string, MarketIndex>();
      // Add fetched first, so they take precedence if symbol overlaps
      fetchedIndices.forEach(idx => combinedIndicesMap.set(idx.symbol, idx));
      internationalIndices.forEach(idx => {
        if (!combinedIndicesMap.has(idx.symbol)) {
          combinedIndicesMap.set(idx.symbol, idx);
        }
      });
      const uniqueIndices = Array.from(combinedIndicesMap.values());

      setIndices(uniqueIndices);

      // --- Process other data ---
        const safeGetStocks = (res: any): Stock[] => (res?.data?.stocks && Array.isArray(res.data.stocks)) ? res.data.stocks : [];
        if (gainersRes.error) console.error("Error fetching gainers:", gainersRes.error);
        if (losersRes.error) console.error("Error fetching losers:", losersRes.error);
        if (trendingRes.error) console.error("Error fetching trending:", trendingRes.error);
        if (activeRes.error) console.error("Error fetching active:", activeRes.error);
        if (summaryRes.error) console.error("Error fetching summary:", summaryRes.error);

        setGainers(safeGetStocks(gainersRes));
        setLosers(safeGetStocks(losersRes));
        setTrending(safeGetStocks(trendingRes));
        setMostActive(safeGetStocks(activeRes));
        if (summaryRes.data && typeof summaryRes.data === 'object') setSummary(summaryRes.data);


      // Create ticker from a mix of stocks, ensuring uniqueness
      const allStockLists = [
        ...safeGetStocks(gainersRes),
        ...safeGetStocks(trendingRes),
        ...safeGetStocks(activeRes)
      ];
      const uniqueStockMap = new Map<string, Stock>();
      allStockLists.forEach(stock => {
         // Basic validation for stock object
         if (stock && typeof stock === 'object' && stock.symbol && typeof stock.lastPrice === 'number') {
            if (!uniqueStockMap.has(stock.symbol)) {
                uniqueStockMap.set(stock.symbol, stock);
            }
         }
      });
      const uniqueStocksForTicker = Array.from(uniqueStockMap.values()).slice(0, 25); // Take top 25 unique ones

      const ticker = uniqueStocksForTicker.map(s => ({
        symbol: s.symbol,
        price: s.lastPrice,
        change: s.change ?? 0, // Default change if missing
        changePercent: s.pChange ?? 0 // Default pChange if missing
      }));

      setTickerStocks(ticker);
    } catch (error) {
      console.error('Error fetching market data:', error);
      // Optional: Add toast notification for error using useToast hook if available
    } finally {
      setLoading(false); // Stop loading general data
    }
  };

  const selectedIndexData = indices.find(idx => idx.symbol === selectedIndexSymbol);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Market Overview</h1>
        <p className="text-muted-foreground">Real-time market data and performance</p>
      </div>

      {/* Ticker Slideshow */}
      {!loading && tickerStocks.length > 0 && ( // Only render if not loading and has data
        <div className="mb-8 overflow-hidden bg-card border rounded-lg shadow-sm">
          <div className="ticker-wrapper">
            <div className="ticker-content">
              {/* Duplicate array for seamless animation */}
              {[...tickerStocks, ...tickerStocks].map((stock, index) => (
                <div
                  // Use a more robust key combining symbol and index
                  key={`${stock.symbol}-ticker-${index}`}
                  className="ticker-item inline-flex items-center px-4 md:px-6 py-2 md:py-3 border-r last:border-r-0 cursor-pointer hover:bg-muted/50 transition-colors duration-150"
                  onClick={() => navigate(`/stocks/${stock.symbol}`)}
                  title={`View details for ${stock.symbol}`}
                >
                  <span className="font-semibold text-xs md:text-sm mr-2">{stock.symbol}</span>
                  <span className="text-xs md:text-sm mr-2">${stock.price?.toFixed(2) ?? 'N/A'}</span>
                  <span className={`text-xs font-medium ${
                    stock.changePercent >= 0 ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'
                  }`}>
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2) ?? '0.00'}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <style>{`
        .ticker-wrapper { overflow: hidden; white-space: nowrap; }
        .ticker-content { display: inline-block; animation: ticker 60s linear infinite; }
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .ticker-wrapper:hover .ticker-content { animation-play-state: paused; }
        .ticker-item { min-width: 150px; text-align: center; } /* Ensure items have minimum width */
      `}</style>

      {/* Market Indices Chart & Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-8">
        {/* Left: Chart Section */}
        <div className="xl:col-span-4">
          <Card className="shadow-md">
            <CardHeader className="pb-4"> {/* Added padding bottom */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                 {/* Index Info */}
                 <div className="flex-1"> {/* Allow info to take space */}
                   <CardTitle className="text-lg md:text-xl flex items-center mb-1"> {/* Adjusted size */}
                     <BarChart3 className="mr-2 h-5 w-5" />
                     {selectedIndexData?.name || "Market Index"}
                   </CardTitle>
                    {/* Index Value/Change Display */}
                    {loading ? (
                       <div className="space-y-1 mt-2 animate-pulse">
                         <div className="h-7 bg-muted rounded w-32"></div>
                         <div className="h-5 bg-muted rounded w-24"></div>
                       </div>
                     ) : selectedIndexData ? (
                      <div className="mt-1 space-y-0">
                        <div className="text-2xl md:text-3xl font-bold">
                          {selectedIndexData.value.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </div>
                        <div className={`flex items-center text-sm ${
                          (periodChange?.change ?? 0) >= 0 ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'
                        }`}>
                          {(periodChange?.change ?? 0) >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                          {(periodChange?.change ?? 0) >= 0 ? '+' : ''}{(periodChange?.change ?? 0).toFixed(2)}
                          ({(periodChange?.changePercent ?? 0) >= 0 ? '+' : ''}{(periodChange?.changePercent ?? 0).toFixed(2)}%)
                        </div>
                      </div>
                    ) : (
                       <p className="text-sm text-muted-foreground mt-2">Select an index</p>
                    )}
                 </div>
                  {/* Index Selector - Placed to the right */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center pt-1"> {/* Align top on small, center on larger */}
                   <Select value={selectedIndexSymbol} onValueChange={setSelectedIndexSymbol} disabled={loading || indices.length === 0}>
                     <SelectTrigger className="w-auto min-w-[160px] md:min-w-[180px] h-9 text-xs md:text-sm"> {/* Adjusted size */}
                       <SelectValue placeholder="Choose index" />
                     </SelectTrigger>
                     <SelectContent>
                       {indices.map((index) => (
                         <SelectItem key={index.symbol} value={index.symbol} className="text-xs md:text-sm">
                           <div className="flex items-center justify-between w-full">
                             <span>{index.name}</span>
                             <span className="text-xs text-muted-foreground ml-2">
                               ({index.region})
                             </span>
                           </div>
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
              </div>
              {/* Time Range Selector */}
              <div className="flex space-x-1 mt-3">
                {timeRanges.map((range) => (
                  <Button
                    key={range.value}
                    variant={selectedTimeRange === range.value ? "secondary" : "ghost"} // Use secondary for selected
                    size="sm"
                    onClick={() => setSelectedTimeRange(range.value)}
                    className="h-7 px-2 md:px-3 text-xs" // Even smaller
                    disabled={chartLoading} // Disable while chart is loading
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="pt-0"> {/* Remove top padding */}
              {chartLoading ? (
                <div className="h-[350px] md:h-[400px] flex items-center justify-center text-muted-foreground">
                  Loading Chart Data... <Activity className="ml-2 h-4 w-4 animate-spin"/>
                </div>
              ) : chartData.length > 0 ? (
                <div className="h-[350px] md:h-[400px]"> {/* Adjusted height */}
                  <ResponsiveContainer width="100%" height="100%">
                    {(() => {
                      const isPositive = periodChange ? periodChange.change >= 0 : true;
                      const lineColor = isPositive ? "hsl(var(--bullish))" : "hsl(var(--bearish))";
                      // Use the same color for the gradient, but define opacities
                      const gradientId = `chartGradient-${selectedIndexSymbol}-${isPositive ? 'pos' : 'neg'}`;

                      return (
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}> {/* Adjusted margins */}
                          <defs>
                            {/* Define the gradient for the Area fill */}
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={lineColor} stopOpacity={0.4}/> {/* Start slightly more opaque */}
                              <stop offset="95%" stopColor={lineColor} stopOpacity={0.05}/> {/* Fade to almost transparent */}
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} /> {/* Lighter grid, only horizontal */}
                          <XAxis
                            dataKey="time"
                            fontSize={10} // Smaller font
                            tickLine={false}
                            axisLine={false}
                            dy={10} // Push labels down slightly
                             // Show fewer ticks on smaller screens if needed, simple skip logic
                             // tickFormatter={(value, index) => index % Math.ceil(chartData.length / 10) === 0 ? value : ''}
                            interval="preserveStartEnd" // Ensure first/last labels show
                          />
                          <YAxis
                            fontSize={10} // Smaller font
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => value.toLocaleString(undefined, {notation: 'compact', compactDisplay: 'short'})} // Compact format
                            domain={['auto', 'auto']}
                            dx={-5}
                            width={35} // Explicit width for YAxis labels
                          />
                          <Tooltip
                             formatter={(value: number, name, props) => {
                                const changeStr = props.payload.change != null ? `(${props.payload.change >= 0 ? '+' : ''}${props.payload.change.toFixed(2)}%)` : '';
                                return [`${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${changeStr}`, selectedIndexData?.name || 'Value'];
                              }}
                              labelFormatter={(label) => `Time: ${label}`}
                             contentStyle={{
                               backgroundColor: 'hsl(var(--background)/0.9)', // Slightly transparent background
                               border: '1px solid hsl(var(--border))',
                               borderRadius: 'var(--radius)',
                               padding: '6px 10px', // Smaller padding
                               boxShadow: 'var(--shadow-lg)', // Use larger shadow for tooltip
                             }}
                             itemStyle={{ fontSize: '11px' }} // Smaller font
                             labelStyle={{ fontSize: '11px', marginBottom: '2px', color: 'hsl(var(--muted-foreground))' }} // Smaller font and muted color
                             cursor={{ stroke: 'hsl(var(--foreground)/0.3)', strokeWidth: 1 }} // Customize cursor line
                           />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke={lineColor}
                            strokeWidth={2}
                            fill={`url(#${gradientId})`} // Use the gradient ID
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0, fill: lineColor }} // Style the active dot on hover
                          />
                        </AreaChart>
                      );
                    })()}
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[350px] md:h-[400px] flex items-center justify-center text-muted-foreground">
                  <p>No chart data available for the selected range.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Market Summary Stats */}
        <div className="space-y-3 md:space-y-4"> {/* Adjusted spacing */}
          {loading ? (
            <>
              {[1, 2, 3, 4, 5].map(i => ( // Added one more skeleton for volume
                <Card key={`summary-pulse-${i}`} className="animate-pulse h-[80px] md:h-auto"> {/* Give skeleton height */}
                  <CardContent className="pt-4">
                    <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                    <div className="h-6 bg-muted rounded w-16"></div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : summary ? (
            <>
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3"> {/* Compact header */}
                  <CardTitle className="text-xs font-medium text-muted-foreground">Total Turnover</CardTitle>
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg md:text-xl font-bold">
                    ${(summary.totalTurnover / 1000000000).toFixed(2)}B
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                 <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Total Shares</CardTitle>
                  <Activity className="h-3 w-3 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg md:text-xl font-bold">
                    {(summary.totalShares / 1000000).toFixed(2)}M
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Advances / Declines</CardTitle>
                   <BarChart3 className="h-3 w-3 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg md:text-xl font-bold">
                    <span className="text-[hsl(var(--bullish))]">{summary.advances}</span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-[hsl(var(--bearish))]">{summary.declines}</span>
                  </div>
                </CardContent>
              </Card>

               <Card className="shadow-sm">
                 <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Transactions</CardTitle>
                   <Activity className="h-3 w-3 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-lg md:text-xl font-bold">
                    {(summary.totalTransactions / 1000).toFixed(1)}K
                  </div>
                </CardContent>
              </Card>

              {summary.totalVolume != null && ( // Check for null or undefined explicitly
                <Card className="shadow-sm">
                   <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Total Volume</CardTitle>
                    <Zap className="h-3 w-3 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="text-lg md:text-xl font-bold">
                      {(summary.totalVolume / 1000000000).toFixed(2)}B
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
             <Card className="shadow-sm">
                 <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                    Market summary data not available.
                </CardContent>
             </Card>
          )}
        </div>
      </div>

       {/* --- Bottom Tables in 4 Columns --- */}
       <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
         {/* Top Gainers */}
         <Card className="shadow-md">
           <CardHeader className="pt-4 pb-2"> {/* Compact header */}
             <CardTitle className="text-lg md:text-xl flex items-center text-[hsl(var(--bullish))]">
               <TrendingUp className="mr-2 h-4 w-4" />
               Top Gainers
             </CardTitle>
           </CardHeader>
           <CardContent className="px-0 pt-0 pb-2"> {/* Remove padding */}
             {loading ? <TableSkeleton rows={10} /> : <StockTable stocks={gainers} navigate={navigate} />}
           </CardContent>
         </Card>

          {/* Top Losers */}
          <Card className="shadow-md">
           <CardHeader className="pt-4 pb-2">
             <CardTitle className="text-lg md:text-xl flex items-center text-[hsl(var(--bearish))]">
               <TrendingDown className="mr-2 h-4 w-4" />
               Top Losers
             </CardTitle>
           </CardHeader>
           <CardContent className="px-0 pt-0 pb-2">
             {loading ? <TableSkeleton rows={10} /> : <StockTable stocks={losers} navigate={navigate} />}
           </CardContent>
         </Card>

          {/* Trending */}
          {/* <Card className="shadow-md">
           <CardHeader className="pt-4 pb-2">
             <CardTitle className="text-sm md:text-base flex items-center text-orange-500">
               <Flame className="mr-2 h-4 w-4" />
               Trending
             </CardTitle>
           </CardHeader>
           <CardContent className="px-0 pt-0 pb-2">
             {loading ? <TableSkeleton rows={5} /> : <StockTable stocks={trending} navigate={navigate} />}
           </CardContent>
         </Card> */}

          {/* Most Active */}
          {/* <Card className="shadow-md">
           <CardHeader className="pt-4 pb-2">
             <CardTitle className="text-sm md:text-base flex items-center text-blue-500">
               <Zap className="mr-2 h-4 w-4" />
               Most Active
             </CardTitle>
           </CardHeader>
           <CardContent className="px-0 pt-0 pb-2">
             {loading ? <TableSkeleton rows={5} /> : <StockTable stocks={mostActive} navigate={navigate} />}
           </CardContent>
         </Card> */}
       </div>
    </div>
  );
}

// Helper component for stock tables (Shows Top 5)
const StockTable = ({ stocks, navigate }: { stocks: Stock[], navigate: Function }) => {
  const topStocks = stocks.slice(0, 10); // Take only the top 5

  if (topStocks.length === 0) {
    return <div className="text-center py-6 text-sm text-muted-foreground px-2">No data available</div>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-3 py-2 h-8 text-sm font-semibold text-muted-foreground">Symbol</TableHead>
          <TableHead className="px-3 py-2 h-8 text-right text-sm font-semibold text-muted-foreground">Price</TableHead>
          <TableHead className="px-3 py-2 h-8 text-right text-sm font-semibold text-muted-foreground">% Chg</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {topStocks.map((stock) => (
          <TableRow
            key={stock.symbol}
            className="cursor-pointer hover:bg-muted/30 h-12" // Slightly increased height
            onClick={() => navigate(`/stocks/${stock.symbol}`)}
            title={`View ${stock.symbol}`}
          >
            <TableCell className="px-3 py-2 font-medium text-sm">{stock.symbol}</TableCell>
            <TableCell className="px-3 py-2 text-right text-sm">${stock.lastPrice?.toFixed(2) ?? 'N/A'}</TableCell>
            <TableCell className={`px-3 py-2 text-right text-sm font-medium ${
              stock.pChange >= 0 ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'
            }`}>
              {stock.pChange >= 0 ? '+' : ''}{stock.pChange?.toFixed(2) ?? '0.00'}%
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

// Helper component for table loading state
const TableSkeleton = ({ rows = 10 }: { rows?: number }) => (
  <div className="space-y-1 px-3 py-2">
    {[...Array(rows)].map((_, i) => (
      <div key={`skel-${i}`} className="h-8 bg-muted/50 rounded animate-pulse"></div>
    ))}
  </div>
);


