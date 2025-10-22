import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp } from "lucide-react";

interface StockSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
];

export const StockSelector = ({ value, onChange }: StockSelectorProps) => {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">FinRLX</h1>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[280px] border-border bg-card">
          <SelectValue placeholder="Select a stock" />
        </SelectTrigger>
        <SelectContent>
          {STOCKS.map((stock) => (
            <SelectItem key={stock.symbol} value={stock.symbol}>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{stock.symbol}</span>
                <span className="text-muted-foreground text-sm">{stock.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
