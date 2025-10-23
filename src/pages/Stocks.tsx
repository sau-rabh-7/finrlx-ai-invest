import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function Stocks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async (query = "") => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('stock-search', {
        body: { query }
      });

      if (error) throw error;
      if (data?.stocks) {
        setStocks(data.stocks);
      }
    } catch (error) {
      console.error('Error fetching stocks:', error);
    } finally {
      setLoading(false);
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

  const handleStockClick = (symbol: string) => {
    navigate(`/stocks/${symbol}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Stocks</h1>
        <p className="text-muted-foreground">
          Search and explore international stocks
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search stocks by symbol or name..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <>
            {[...Array(20)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-muted rounded w-24"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-6 bg-muted rounded w-32 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-20"></div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          stocks.map((stock) => (
            <Card 
              key={stock.symbol} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleStockClick(stock.symbol)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{stock.symbol}</CardTitle>
                <p className="text-sm text-muted-foreground truncate">{stock.name}</p>
              </CardHeader>
              <CardContent>
                {stock.price > 0 && (
                  <>
                    <div className="text-2xl font-bold mb-1">
                      ${stock.price.toFixed(2)}
                    </div>
                    <div className={`text-sm ${
                      stock.change >= 0 ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'
                    }`}>
                      {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
