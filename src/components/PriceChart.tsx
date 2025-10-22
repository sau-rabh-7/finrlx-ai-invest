import { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PriceChartProps {
  ticker: string;
}

export const PriceChart = ({ ticker }: PriceChartProps) => {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    // Simulate API call - will be replaced with real data
    setLoading(true);
    setTimeout(() => {
      // Generate mock candlestick data
      const dates = [];
      const open = [];
      const high = [];
      const low = [];
      const close = [];
      
      let basePrice = 150;
      const today = new Date();
      
      for (let i = 250; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
        
        const change = (Math.random() - 0.5) * 10;
        const o = basePrice;
        const c = basePrice + change;
        const h = Math.max(o, c) + Math.random() * 3;
        const l = Math.min(o, c) - Math.random() * 3;
        
        open.push(o);
        close.push(c);
        high.push(h);
        low.push(l);
        basePrice = c;
      }

      setChartData({ dates, open, high, low, close });
      setLoading(false);
    }, 800);
  }, [ticker]);

  if (loading) {
    return (
      <Card className="p-6 bg-card border-border">
        <Skeleton className="h-[400px] w-full" />
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card border-border backdrop-blur-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{ticker} Price Chart</h2>
        <p className="text-sm text-muted-foreground">1 Year Historical Data</p>
      </div>
      <Plot
        data={[
          {
            type: 'candlestick',
            x: chartData.dates,
            open: chartData.open,
            high: chartData.high,
            low: chartData.low,
            close: chartData.close,
            increasing: { line: { color: 'hsl(142, 76%, 36%)' } },
            decreasing: { line: { color: 'hsl(0, 84%, 60%)' } },
            name: ticker,
          },
        ]}
        layout={{
          autosize: true,
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          xaxis: {
            gridcolor: 'hsl(222, 40%, 18%)',
            color: 'hsl(215, 20%, 65%)',
          },
          yaxis: {
            gridcolor: 'hsl(222, 40%, 18%)',
            color: 'hsl(215, 20%, 65%)',
          },
          margin: { t: 20, r: 20, b: 40, l: 60 },
          hovermode: 'x unified',
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%', height: '400px' }}
      />
    </Card>
  );
};
