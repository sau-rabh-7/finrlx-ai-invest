import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WatchlistItem {
  id: string;
  ticker: string;
  company_name: string;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
}

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [newTicker, setNewTicker] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchWatchlist();
  }, []);

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

  const addToWatchlist = async () => {
    if (!newTicker.trim()) return;

    try {
      // Fetch stock data to get company name
      const { data: stockData } = await supabase.functions.invoke('stock-data', {
        body: { ticker: newTicker.toUpperCase() }
      });

      const { error } = await supabase
        .from('watchlist')
        .insert({
          ticker: newTicker.toUpperCase(),
          company_name: stockData?.companyName || newTicker.toUpperCase()
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Added ${newTicker.toUpperCase()} to watchlist`
      });

      setNewTicker("");
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter ticker symbol (e.g., AAPL)"
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && addToWatchlist()}
            />
            <Button onClick={addToWatchlist}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

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
                  <div>
                    <CardTitle className="text-2xl">{item.ticker}</CardTitle>
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
