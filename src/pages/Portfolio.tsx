import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, TrendingUp, TrendingDown, Info, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PortfolioOptimizer } from "@/components/portfolio/PortfolioOptimizer";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Trash2, Edit, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface PortfolioItem {
  id: string;
  ticker: string;
  company_name: string;
  shares: number;
  purchase_price: number;
  currentPrice?: number;
  analysis?: any;
}

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

type PieMetric = "shares" | "cost" | "currentValue" | "profitLoss";

const pieMetricOptions: { value: PieMetric; label: string }[] = [
  { value: "shares", label: "Shares Held" },
  { value: "cost", label: "Cost Basis" },
  { value: "currentValue", label: "Current Value" },
  { value: "profitLoss", label: "Profit & Loss" }
];

const pieMetricLabels: Record<PieMetric, string> = {
  shares: "Shares",
  cost: "Cost Basis",
  currentValue: "Current Value",
  profitLoss: "Profit & Loss"
};

type PieChartDatum = {
  name: string;
  rawValue: number;
  value: number;
  fill: string;
  percentage: number;
};

const SLICE_COLOR_GOLDEN_ANGLE = 137.508;

const getSliceColor = (index: number) =>
  `hsl(${(index * SLICE_COLOR_GOLDEN_ANGLE) % 360}, 70%, 50%)`;

const formatCurrency = (value: number, withSign = false) => {
  const sign = value < 0 ? "-" : withSign && value > 0 ? "+" : "";
  return `${sign}$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

const formatShares = (value: number) =>
  `${value.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2
  })}`;

const formatPieValue = (metric: PieMetric, datum: PieChartDatum) => {
  switch (metric) {
    case "shares":
      return `${formatShares(datum.rawValue)} shares`;
    case "cost":
    case "currentValue":
      return formatCurrency(datum.rawValue);
    case "profitLoss":
      return formatCurrency(datum.rawValue, true);
    default:
      return datum.rawValue.toString();
  }
};

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [pieMetric, setPieMetric] = useState<PieMetric>("currentValue");
  const [formData, setFormData] = useState({
    shares: "",
    purchasePrice: ""
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      fetchPortfolio();
    };
    checkAuthAndFetch();
  }, [navigate]);

  const fetchPortfolio = async () => {
    try {
      const { data, error } = await supabase
        .from('portfolio')
        .select('*')
        .order('purchase_date', { ascending: false });

      if (error) throw error;

      // Fetch current prices and AI analysis for each position
      if (data) {
        const enrichedData = await Promise.all(
          data.map(async (item) => {
            try {
              const { data: stockData } = await supabase.functions.invoke('stock-data', {
                body: { ticker: item.ticker }
              });

              let analysis = null;
              if (stockData?.currentPrice) {
                const { data: analysisData } = await supabase.functions.invoke('portfolio-analysis', {
                  body: {
                    ticker: item.ticker,
                    shares: item.shares,
                    purchasePrice: item.purchase_price,
                    currentPrice: stockData.currentPrice
                  }
                });
                analysis = analysisData;
              }
              
              return {
                ...item,
                currentPrice: stockData?.currentPrice,
                analysis
              };
            } catch {
              return item;
            }
          })
        );
        setPortfolio(enrichedData);
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      toast({
        title: "Error",
        description: "Failed to load portfolio",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStocks = async (query = "") => {
    try {
      setSearchLoading(true);
      const { data, error } = await supabase.functions.invoke('stock-search', {
        body: { query }
      });

      if (error) throw error;
      if (data?.stocks) {
        setSearchResults(data.stocks);
      }
    } catch (error) {
      console.error('Error fetching stocks:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce search
    const timer = setTimeout(() => {
      fetchStocks(query);
    }, 500);

    return () => clearTimeout(timer);
  };

  const handleStockSelect = (stock: Stock) => {
    setSelectedStock(stock);
    setSearchQuery("");
    setSearchResults([]);
  };

  const addPosition = async () => {
    if (!selectedStock) {
      toast({
        title: "Error",
        description: "Please select a stock first",
        variant: "destructive"
      });
      return;
    }

    if (!formData.shares || !formData.purchasePrice) {
      toast({
        title: "Error",
        description: "Please enter shares and purchase price",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to add positions to your portfolio",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('portfolio')
        .insert({
          ticker: selectedStock.symbol,
          company_name: selectedStock.name,
          shares: parseFloat(formData.shares),
          purchase_price: parseFloat(formData.purchasePrice),
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Position added to portfolio"
      });

      setDialogOpen(false);
      setSelectedStock(null);
      setFormData({ shares: "", purchasePrice: "" });
      fetchPortfolio();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add position",
        variant: "destructive"
      });
    }
  };

  const [expandedAnalysis, setExpandedAnalysis] = useState<Record<string, boolean>>({});
  
  const toggleAnalysis = (id: string) => {
    setExpandedAnalysis(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'STRONG_BUY':
        return 'bg-primary/10 text-primary';
      case 'BUY':
        return 'bg-blue-500/10 text-blue-500';
      case 'HOLD':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'SELL':
        return 'bg-orange-500/10 text-orange-500';
      case 'STRONG_SELL':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'bg-primary';
    if (confidence > 0.6) return 'bg-blue-500';
    if (confidence > 0.4) return 'bg-yellow-500';
    return 'bg-destructive';
  };

  const totalValue = portfolio.reduce((sum, item) => 
    sum + (item.currentPrice || 0) * item.shares, 0
  );
  
  const totalCost = portfolio.reduce((sum, item) => 
    sum + item.purchase_price * item.shares, 0
  );
  
  const totalPL = totalValue - totalCost;
  const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

  const stocksUp = portfolio.filter(item => 
    item.currentPrice && item.currentPrice > item.purchase_price
  ).length;
  const stocksDown = portfolio.filter(item => 
    item.currentPrice && item.currentPrice < item.purchase_price
  ).length;

  const pieData = useMemo<PieChartDatum[]>(() => {
    if (portfolio.length === 0) return [];

    const rawData = portfolio.map((item, index) => {
      const currentPrice = item.currentPrice ?? 0;
      const dataPoints: Record<PieMetric, number> = {
        shares: item.shares,
        cost: item.purchase_price * item.shares,
        currentValue: currentPrice * item.shares,
        profitLoss: (currentPrice - item.purchase_price) * item.shares
      };

      const rawValue = dataPoints[pieMetric];

      return {
        name: item.ticker,
        rawValue,
        fill: getSliceColor(index)
      };
    }).filter(d => !Number.isNaN(d.rawValue));

    const total = rawData.reduce((sum, { rawValue }) => sum + Math.max(rawValue, 0), 0);

    if (total === 0) {
      return rawData.map((datum) => ({
        ...datum,
        value: Math.abs(datum.rawValue),
        percentage: 0
      }));
    }

    return rawData.map((datum) => {
      const value = Math.abs(datum.rawValue);
      const percentage = (value / total) * 100;

      return {
        ...datum,
        value,
        percentage
      };
    });
  }, [portfolio, pieMetric]);

  const formatPieTooltip = (value: number, entry: { payload: PieChartDatum }) => {
    const datum = entry.payload;
    return [formatPieValue(pieMetric, datum), pieMetricLabels[pieMetric]];
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">Portfolio</h1>
          <p className="text-muted-foreground">
            Track your investments with AI-powered recommendations
          </p>
        </div>

        {/* --- ADD POSITION DIALOG --- */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Add Position
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Position</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Search Stock</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search stocks by symbol or name..."
                    value={searchQuery}
                    onChange={handleSearch}
                    className="pl-10"
                    disabled={!!selectedStock}
                  />
                </div>
                
                {/* Search Results */}
                {searchQuery && searchResults.length > 0 && !selectedStock && (
                  <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
                    {searchResults.map((stock) => (
                      <div
                        key={stock.symbol}
                        className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        onClick={() => handleStockSelect(stock)}
                      >
                        <div className="font-semibold">{stock.symbol}</div>
                        <div className="text-sm text-muted-foreground truncate">{stock.name}</div>
                        {stock.price > 0 && (
                          <div className="text-sm">${stock.price.toFixed(2)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Stock */}
                {selectedStock && (
                  <Card className="mt-2">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{selectedStock.symbol}</div>
                          <div className="text-sm text-muted-foreground">{selectedStock.name}</div>
                          {selectedStock.price > 0 && (
                            <div className="text-sm font-medium mt-1">${selectedStock.price.toFixed(2)}</div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedStock(null);
                            setSearchQuery("");
                          }}
                        >
                          Change
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div>
                <Label>Number of Shares</Label>
                <Input
                  type="number"
                  step="0.00000001"
                  placeholder="10"
                  value={formData.shares}
                  onChange={(e) => setFormData({...formData, shares: e.target.value})}
                />
              </div>
              <div>
                <Label>Purchase Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="150.00"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})}
                />
              </div>
              <Button 
                onClick={addPosition} 
                className="w-full"
                disabled={!selectedStock || !formData.shares || !formData.purchasePrice}
              >
                Add Position
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* --- STATS & PIE CHART ROW --- */}
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        
        {/* Left Column: Stats Cards */}
        <div className="w-full lg:max-w-sm flex flex-col gap-3">
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Value
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">
                ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Cost
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">
                ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total P/L
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`text-2xl font-bold ${
                totalPL >= 0 ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'
              }`}>
                {totalPL >= 0 ? '+' : ''}${totalPL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-sm ml-2">
                  ({totalPL >= 0 ? '+' : ''}{totalPLPercent.toFixed(2)}%)
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Stock Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex justify-around items-center">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Up</div>
                  <div className="text-xl font-bold text-[hsl(var(--bullish))]">
                    {stocksUp}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Down</div>
                  <div className="text-xl font-bold text-[hsl(var(--bearish))]">
                    {stocksDown}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Pie Chart */}
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500" />
                Portfolio Allocation
              </CardTitle>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Breakdown</span>
                <Select value={pieMetric} onValueChange={(value) => setPieMetric(value as PieMetric)} disabled={loading}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    {pieMetricOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {loading ? (
              <div className="h-full min-h-[320px] flex items-center justify-center">
                <div className="space-y-4 w-full">
                  {/* Pie Chart Skeleton */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="w-[220px] h-[220px] rounded-full bg-muted animate-pulse"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-[120px] h-[120px] rounded-full bg-background border-2 border-muted"></div>
                      </div>
                    </div>
                  </div>
                  {/* Legend Skeleton */}
                  <div className="flex flex-wrap justify-center gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-muted animate-pulse"></div>
                        <div className="h-4 w-12 bg-muted rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : portfolio.length > 0 ? (
              pieData.length > 0 ? (
                <div className="h-full min-h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        dataKey="value"
                        label={({ payload }) => (payload?.percentage ? `${payload.percentage.toFixed(1)}%` : "")}
                      >
                        {pieData.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, _name, entry) => formatPieTooltip(value as number, entry as { payload: PieChartDatum })}
                        labelFormatter={(label) => `${label}`}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
                  <p>No data available for the selected metric.</p>
                </div>
              )
            ) : (
              <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
                <p>Add positions to your portfolio to see allocation.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- OPTIMIZATION SECTION --- */}
      <PortfolioOptimizer 
        portfolio={portfolio.map(item => ({
          ...item,
          ticker: item.ticker,
          shares: parseFloat(item.shares as any) || 0,
          avgPrice: parseFloat(item.purchase_price as any) || 0,
          currentPrice: item.currentPrice || 0,
          marketValue: (parseFloat(item.shares as any) || 0) * (item.currentPrice || 0),
          costBasis: (parseFloat(item.shares as any) || 0) * (parseFloat(item.purchase_price as any) || 0),
          profitLoss: ((parseFloat(item.shares as any) || 0) * (item.currentPrice || 0)) - 
                     ((parseFloat(item.shares as any) || 0) * (parseFloat(item.purchase_price as any) || 0)),
          profitLossPercent: ((item.currentPrice || 0) / (parseFloat(item.purchase_price as any) || 1) - 1) * 100
        }))}
        onOptimize={(weights) => {
          // This callback is called when optimization is complete
          // You can use the weights to update the UI or perform other actions
          console.log('Optimized weights:', weights);
        }}
        className="mb-6"
      />

      {/* --- PORTFOLIO LIST --- */}
      <div className="space-y-4">
        {loading ? (
          <>
            {[1, 2].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-24"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-32 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : portfolio.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Your portfolio is empty. Add your first position to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          portfolio.map((item) => {
            const currentValue = (item.currentPrice || 0) * item.shares;
            const costBasis = item.purchase_price * item.shares;
            const profitLoss = currentValue - costBasis;
            const profitLossPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

            return (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div 
                      className="cursor-pointer"
                      onClick={() => navigate(`/stocks/${item.ticker}`)}
                    >
                      <CardTitle className="text-2xl hover:text-primary transition-colors">{item.ticker}</CardTitle>
                      <p className="text-sm text-muted-foreground">{item.company_name}</p>
                    </div>
                    {item.analysis && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="ml-auto flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => toggleAnalysis(item.id)}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="text-xs">AI Analysis</span>
                        {expandedAnalysis[item.id] ? (
                          <ChevronUp className="ml-1 h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="ml-1 h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Shares</div>
                      <div className="text-lg font-semibold">{item.shares}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Avg Cost</div>
                      <div className="text-lg font-semibold">${item.purchase_price.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Current Price</div>
                      <div className="text-lg font-semibold">
                        {item.currentPrice ? `$${item.currentPrice.toFixed(2)}` : 'Loading...'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">P/L</div>
                      <div className={`text-lg font-semibold flex items-center ${
                        profitLoss >= 0 ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'
                      }`}>
                        {profitLoss >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                        {profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)}
                        <span className="text-sm ml-2">
                          ({profitLoss >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                  {item.analysis && (
                    <div className="mt-4 p-3 bg-muted rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">AI Recommendation:</span>
                        <Badge className={getRecommendationColor(item.analysis.recommendation)}>
                          {item.analysis.recommendation.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  {item.analysis && expandedAnalysis[item.id] && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Recommendation</span>
                            <Badge className={getRecommendationColor(item.analysis.recommendation) + " text-xs font-medium"}>
                              {item.analysis.recommendation.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Time Horizon</span>
                            <span className="font-medium">{item.analysis.timeHorizon}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Target Price</span>
                            <span className="font-mono">${item.analysis.targetPrice?.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Stop Loss</span>
                            <span className="font-mono">${item.analysis.stopLoss?.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Confidence</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{(item.analysis.confidence * 100).toFixed(0)}%</span>
                              <div className="w-16">
                                <div className="relative h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${item.analysis.confidence * 100}%`,
                                      backgroundColor: getConfidenceColor(item.analysis.confidence)
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <p className="text-sm text-muted-foreground mb-1">Analysis</p>
                        <p className="text-sm">{item.analysis.reasoning}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}


