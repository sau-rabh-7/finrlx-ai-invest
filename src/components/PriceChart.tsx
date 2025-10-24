import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";

interface PriceData {
  date: string;
  price: number;
  volume?: number;
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
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState("1m");
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);

  useEffect(() => {
    fetchPriceData();
  }, [symbol, selectedRange]);

  const fetchPriceData = async () => {
    try {
      setLoading(true);
      
      // Generate mock historical data for demonstration
      // In a real app, this would fetch from your API
      const mockData = generateMockPriceData(selectedRange);
      setPriceData(mockData);
      
      if (mockData.length > 0) {
        setCurrentPrice(mockData[mockData.length - 1].price);
        const firstPrice = mockData[0].price;
        const lastPrice = mockData[mockData.length - 1].price;
        setPriceChange(lastPrice - firstPrice);
      }
    } catch (error) {
      console.error('Error fetching price data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockPriceData = (range: string): PriceData[] => {
    const rangeData = timeRanges.find(r => r.value === range);
    const days = rangeData?.days || 30;
    
    const data: PriceData[] = [];
    const basePrice = 150 + Math.random() * 100; // Random base price between 150-250
    let currentPrice = basePrice;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Add some realistic price movement
      const change = (Math.random() - 0.5) * 0.05; // ±2.5% daily change
      currentPrice = currentPrice * (1 + change);
      
      data.push({
        date: date.toISOString().split('T')[0],
        price: parseFloat(currentPrice.toFixed(2)),
        volume: Math.floor(Math.random() * 10000000) + 1000000
      });
    }
    
    return data;
  };

  const formatPrice = (value: number) => `$${value.toFixed(2)}`;
  
  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
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
            <div className="animate-pulse text-muted-foreground">Loading chart...</div>
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
            >
              {range.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={priceData}>
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
                formatter={(value: number) => [formatPrice(value), 'Price']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke={isPositive ? "hsl(var(--bullish))" : "hsl(var(--bearish))"}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: isPositive ? "hsl(var(--bullish))" : "hsl(var(--bearish))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}