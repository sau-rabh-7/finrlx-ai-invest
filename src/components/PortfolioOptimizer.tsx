import { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PortfolioData {
  labels: string[];
  values: number[];
}

export const PortfolioOptimizer = () => {
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('portfolio-optimizer', {
          body: {}
        });

        if (error) throw error;
        setPortfolio(data);
      } catch (error) {
        console.error('Error fetching portfolio:', error);
        toast.error('Failed to fetch portfolio optimization');
        // Fallback to mock data
        setPortfolio({
          labels: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'],
          values: [25, 20, 22, 18, 15]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, []);

  if (loading) {
    return (
      <Card className="p-6 bg-card border-border">
        <Skeleton className="h-[350px] w-full" />
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card border-border backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">AI-Optimized Portfolio</h2>
      </div>

      <Plot
        data={[
          {
            type: 'pie',
            labels: portfolio!.labels,
            values: portfolio!.values,
            marker: {
              colors: [
                'hsl(263, 70%, 65%)',
                'hsl(142, 76%, 36%)',
                'hsl(200, 70%, 50%)',
                'hsl(30, 80%, 55%)',
                'hsl(0, 84%, 60%)',
              ],
            },
            textinfo: 'label+percent',
            textfont: {
              color: 'hsl(210, 40%, 98%)',
              size: 12,
            },
            hovertemplate: '<b>%{label}</b><br>%{value}%<extra></extra>',
          },
        ]}
        layout={{
          autosize: true,
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          showlegend: true,
          legend: {
            font: { color: 'hsl(215, 20%, 65%)' },
          },
          margin: { t: 20, r: 20, b: 20, l: 20 },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%', height: '300px' }}
      />

      <div className="pt-4 border-t border-border mt-4">
        <p className="text-xs text-muted-foreground">
          Powered by PPO (Reinforcement Learning) • Optimized for maximum Sharpe Ratio
        </p>
      </div>
    </Card>
  );
};
