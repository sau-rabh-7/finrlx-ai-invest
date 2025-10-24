import { useState } from "react";
import { StockSelector } from "@/components/StockSelector";
import PriceChart from "@/components/PriceChart";
import { AIAnalysis } from "@/components/AIAnalysis";
import { PortfolioOptimizer } from "@/components/PortfolioOptimizer";

const Index = () => {
  const [selectedStock, setSelectedStock] = useState("AAPL");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <StockSelector value={selectedStock} onChange={setSelectedStock} />
          <p className="text-muted-foreground mt-2 text-sm">
            AI-powered decision support for intelligent trading
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PriceChart symbol={selectedStock} />
          </div>
          
          <div className="space-y-6">
            <AIAnalysis ticker={selectedStock} />
          </div>
        </div>

        <div className="mt-6">
          <PortfolioOptimizer />
        </div>
      </div>
    </div>
  );
};

export default Index;
