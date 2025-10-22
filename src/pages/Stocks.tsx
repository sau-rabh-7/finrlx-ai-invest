import { useState } from "react";
import { StockSelector } from "@/components/StockSelector";
import { PriceChart } from "@/components/PriceChart";
import { AIAnalysis } from "@/components/AIAnalysis";

export default function Stocks() {
  const [selectedStock, setSelectedStock] = useState("AAPL");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Stock Analysis</h1>
        <p className="text-muted-foreground">
          AI-powered analysis and real-time stock data
        </p>
      </div>

      <div className="mb-6">
        <StockSelector value={selectedStock} onChange={setSelectedStock} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PriceChart ticker={selectedStock} />
        </div>
        
        <div className="space-y-6">
          <AIAnalysis ticker={selectedStock} />
        </div>
      </div>
    </div>
  );
}
