import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, TrendingUp, TrendingDown, Info, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [formData, setFormData] = useState({
    shares: "",
    purchasePrice: ""
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPortfolio();
  }, []);

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

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case "HOLD":
        return "bg-[hsl(var(--neutral))] text-white";
      case "SELL":
        return "bg-[hsl(var(--bearish))] text-white";
      case "BUY_MORE":
        return "bg-[hsl(var(--bullish))] text-white";
      default:
        return "bg-muted";
    }
  };

  const totalValue = portfolio.reduce((sum, item) => 
    sum + (item.currentPrice || 0) * item.shares, 0
  );
  
  const totalCost = portfolio.reduce((sum, item) => 
    sum + item.purchase_price * item.shares, 0
  );
  
  const totalPL = totalValue - totalCost;
  const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Portfolio</h1>
        <p className="text-muted-foreground">
          Track your investments with AI-powered recommendations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total P/L
            </CardTitle>
          </CardHeader>
          <CardContent>
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
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button className="mb-6">
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
            const profitLossPercent = ((item.currentPrice || 0) - item.purchase_price) / item.purchase_price * 100;

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
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Info className="h-4 w-4 mr-2" />
                            AI Analysis
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>AI Portfolio Analysis - {item.ticker}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Recommendation</Label>
                              <Badge className={`${getRecommendationColor(item.analysis.recommendation)} mt-2`}>
                                {item.analysis.recommendation.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div>
                              <Label>Time Horizon</Label>
                              <p className="text-sm mt-1">{item.analysis.timeHorizon}</p>
                            </div>
                            <div>
                              <Label>Target Price</Label>
                              <p className="text-sm mt-1">${item.analysis.targetPrice?.toFixed(2)}</p>
                            </div>
                            <div>
                              <Label>Stop Loss</Label>
                              <p className="text-sm mt-1">${item.analysis.stopLoss?.toFixed(2)}</p>
                            </div>
                            <div>
                              <Label>Reasoning</Label>
                              <p className="text-sm mt-1 text-muted-foreground">{item.analysis.reasoning}</p>
                            </div>
                            <div>
                              <Label>Confidence</Label>
                              <p className="text-sm mt-1">{(item.analysis.confidence * 100).toFixed(0)}%</p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
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
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
