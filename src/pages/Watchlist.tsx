import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, TrendingUp, TrendingDown, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface WatchlistItem {
  id: string;
  ticker: string;
  company_name: string;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
}

interface Stock {
  symbol: string;
  name: string;
  price?: number;
  change?: number;
  changePercent?: number;
}

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndFetchWatchlist();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timer = setTimeout(() => {
        fetchStocks(searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const checkAuthAndFetchWatchlist = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    fetchWatchlist();
  };

  const fetchStocks = async (query: string) => {
    setSearchLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stock-search', {
        body: { query }
      });

      if (error) throw error;
      setSearchResults(data?.stocks || []);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchWatchlist = async () => {
    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .order('added_at', { ascending: false });

      if (error) throw error;

      // Fetch current prices for each ticker
      if (data) {
        const enrichedData = await Promise.all(
          data.map(async (item) => {
            try {
              const { data: stockData } = await supabase.functions.invoke('stock-data', {
                body: { ticker: item.ticker }
              });
              
              return {
                ...item,
                currentPrice: stockData?.currentPrice,
                change: stockData?.change,
                changePercent: stockData?.changePercent
              };
            } catch {
              return item;
            }
          })
        );
        setWatchlist(enrichedData);
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      toast({
        title: "Error",
        description: "Failed to load watchlist",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addToWatchlist = async (stock: Stock) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be signed in to add to watchlist",
          variant: "destructive"
        });
        navigate('/auth');
        return;
      }

      const { error } = await supabase
        .from('watchlist')
        .insert({
          ticker: stock.symbol,
          company_name: stock.name,
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Added ${stock.symbol} to watchlist`
      });

      setDialogOpen(false);
      setSearchQuery("");
      setSearchResults([]);
      fetchWatchlist();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add to watchlist",
        variant: "destructive"
      });
    }
  };

  const removeFromWatchlist = async (id: string) => {
    try {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Removed from watchlist"
      });

      fetchWatchlist();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove from watchlist",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Watchlist</h1>
        <p className="text-muted-foreground">Track your favorite stocks</p>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button className="mb-6">
            <Plus className="h-4 w-4 mr-2" />
            Add Stock to Watchlist
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Search for a Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search stocks by name or symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {searchLoading ? (
              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-6 bg-muted rounded w-32 mb-2"></div>
                      <div className="h-4 bg-muted rounded w-48"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {searchResults.map((stock) => (
                  <Card 
                    key={stock.symbol} 
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => addToWatchlist(stock)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold">{stock.symbol}</h3>
                          <p className="text-sm text-muted-foreground">{stock.name}</p>
                        </div>
                        {stock.price && (
                          <div className="text-right">
                            <div className="text-xl font-bold">${stock.price.toFixed(2)}</div>
                            <div className={`text-sm ${
                              stock.changePercent && stock.changePercent >= 0 
                                ? 'text-[hsl(var(--bullish))]' 
                                : 'text-[hsl(var(--bearish))]'
                            }`}>
                              {stock.changePercent && stock.changePercent >= 0 ? '+' : ''}
                              {stock.changePercent?.toFixed(2)}%
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchQuery.trim() ? (
              <p className="text-center text-muted-foreground py-8">No stocks found</p>
            ) : (
              <p className="text-center text-muted-foreground py-8">Start typing to search for stocks</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <>
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-24"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-32 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-20"></div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : watchlist.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Your watchlist is empty. Add some stocks to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          watchlist.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div 
                    className="cursor-pointer flex-1"
                    onClick={() => navigate(`/stocks/${item.ticker}`)}
                  >
                    <CardTitle className="text-2xl hover:text-primary transition-colors">{item.ticker}</CardTitle>
                    <p className="text-sm text-muted-foreground">{item.company_name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFromWatchlist(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {item.currentPrice ? (
                  <>
                    <div className="text-3xl font-bold mb-1">
                      ${item.currentPrice.toFixed(2)}
                    </div>
                    <div className={`flex items-center text-sm ${
                      item.changePercent && item.changePercent >= 0 
                        ? 'text-[hsl(var(--bullish))]' 
                        : 'text-[hsl(var(--bearish))]'
                    }`}>
                      {item.changePercent && item.changePercent >= 0 ? (
                        <TrendingUp className="h-4 w-4 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 mr-1" />
                      )}
                      {item.changePercent && item.changePercent >= 0 ? '+' : ''}
                      {item.changePercent?.toFixed(2)}%
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading price...</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
