// import { useState, useEffect } from 'react';
// import { Button } from '../../components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
// import { Input } from '../../components/ui/input';
// import { Label } from '../../components/ui/label';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
// import { Slider } from '../../components/ui/slider';
// import { Badge } from '../../components/ui/badge';
// import { Loader2, BarChart2, PieChart, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
// import { useToast } from '../../hooks/use-toast';

// // Define the PortfolioItem interface locally to avoid import issues
// interface PortfolioItem {
//   id: string;
//   ticker: string;
//   shares: number;
//   avgPrice: number;
//   currentPrice?: number;
//   change?: number;
//   changePercent?: number;
//   marketValue?: number;
//   costBasis?: number;
//   profitLoss?: number;
//   profitLossPercent?: number;
//   sector?: string;
//   industry?: string;
//   lastUpdated?: string;
// }

// interface PortfolioOptimizerProps {
//   portfolio: PortfolioItem[];
//   onOptimize?: (optimizedWeights: Record<string, number>) => void;
//   className?: string;
// }

// interface OptimizationResult {
//   status: string;
//   optimization: {
//     objective: string;
//     expected_return: number;
//     volatility: number;
//     sharpe_ratio: number;
//     weights: Record<string, number>;
//   };
//   allocation: {
//     allocation: Record<string, number>;
//     leftover: number;
//     total_value: number;
//     latest_prices: Record<string, number>;
//   };
// }

// const OBJECTIVES = [
//   { value: 'max_sharpe', label: 'Maximize Sharpe Ratio', description: 'Maximize risk-adjusted returns' },
//   { value: 'min_volatility', label: 'Minimize Volatility', description: 'Minimize portfolio risk' },
//   { value: 'efficient_risk', label: 'Efficient Risk', description: 'Maximize return for target risk' },
//   { value: 'efficient_return', label: 'Efficient Return', description: 'Minimize risk for target return' },
// ];

// export function PortfolioOptimizer({ portfolio, onOptimize, className = '' }: PortfolioOptimizerProps) {
//   const { toast } = useToast();
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState<OptimizationResult | null>(null);
//   const [objective, setObjective] = useState('max_sharpe');
//   const [targetReturn, setTargetReturn] = useState(0.2);
//   const [targetRisk, setTargetRisk] = useState(0.15);
//   const [portfolioValue, setPortfolioValue] = useState(10000);
//   const [marketNeutral, setMarketNeutral] = useState(false);
//   const [weightBounds, setWeightBounds] = useState<[number, number]>([0, 1]);

//   const tickers = portfolio.map(item => item.ticker);

//   const handleOptimize = async () => {
//     if (tickers.length < 2) {
//       toast({
//         title: 'Not enough assets',
//         description: 'Add at least 2 assets to optimize your portfolio',
//         variant: 'destructive',
//       });
//       return;
//     }

//     setLoading(true);
//     try {
//       const response = await fetch('http://localhost:5000/api/portfolio/optimize', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           tickers,
//           objective,
//           ...(objective === 'efficient_return' && { target_return: targetReturn }),
//           ...(objective === 'efficient_risk' && { target_risk: targetRisk }),
//           market_neutral: marketNeutral,
//           weight_bounds: weightBounds,
//           portfolio_value: portfolioValue,
//         }),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.message || 'Failed to optimize portfolio');
//       }

//       setResult(data);
//       onOptimize?.(data.optimization.weights);

//       toast({
//         title: 'Optimization complete',
//         description: `Optimized portfolio with ${objective.replace('_', ' ')} objective`,
//       });
//     } catch (error) {
//       console.error('Optimization error:', error);
//       toast({
//         title: 'Optimization failed',
//         description: error instanceof Error ? error.message : 'An unknown error occurred',
//         variant: 'destructive',
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
//   const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

//   return (
//     <Card className={className}>
//       <CardHeader>
//         <div className="flex items-center justify-between">
//           <div>
//             <CardTitle className="flex items-center gap-2">
//               <BarChart2 className="h-5 w-5 text-primary" />
//               Portfolio Optimization
//             </CardTitle>
//             <CardDescription>
//               Optimize your portfolio allocation using modern portfolio theory
//             </CardDescription>
//           </div>
//           <Button
//             onClick={handleOptimize}
//             disabled={loading || tickers.length < 2}
//             className="gap-2"
//           >
//             {loading ? (
//               <>
//                 <Loader2 className="h-4 w-4 animate-spin" />
//                 Optimizing...
//               </>
//             ) : (
//               <>
//                 <ArrowUpDown className="h-4 w-4" />
//                 Optimize
//               </>
//             )}
//           </Button>
//         </div>
//       </CardHeader>
//       <CardContent>
//         <Tabs defaultValue="settings" className="w-full">
//           <TabsList className="grid w-full grid-cols-2">
//             <TabsTrigger value="settings">Optimization Settings</TabsTrigger>
//             <TabsTrigger value="results" disabled={!result}>
//               Results
//             </TabsTrigger>
//           </TabsList>
          
//           <TabsContent value="settings" className="space-y-4 pt-4">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div className="space-y-2">
//                 <Label htmlFor="objective">Optimization Objective</Label>
//                 <Select
//                   value={objective}
//                   onValueChange={setObjective}
//                   disabled={loading}
//                 >
//                   <SelectTrigger>
//                     <SelectValue placeholder="Select optimization objective" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {OBJECTIVES.map((opt) => (
//                       <SelectItem key={opt.value} value={opt.value}>
//                         <div className="flex flex-col">
//                           <span>{opt.label}</span>
//                           <span className="text-xs text-muted-foreground">
//                             {opt.description}
//                           </span>
//                         </div>
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>

//               <div className="space-y-2">
//                 <Label>Portfolio Value</Label>
//                 <div className="relative">
//                   <Input
//                     type="number"
//                     value={portfolioValue}
//                     onChange={(e) => setPortfolioValue(Number(e.target.value))}
//                     disabled={loading}
//                     min={1000}
//                     step={1000}
//                     className="pl-8"
//                   />
//                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
//                 </div>
//               </div>

//               {objective === 'efficient_return' && (
//                 <div className="space-y-2">
//                   <div className="flex justify-between">
//                     <Label>Target Annual Return: {formatPercent(targetReturn)}</Label>
//                     <span className="text-sm text-muted-foreground">
//                       {formatPercent(targetReturn)}
//                     </span>
//                   </div>
//                   <Slider
//                     value={[targetReturn * 100]}
//                     onValueChange={([value]) => setTargetReturn(value / 100)}
//                     min={-50}
//                     max={100}
//                     step={1}
//                     disabled={loading}
//                   />
//                 </div>
//               )}

//               {objective === 'efficient_risk' && (
//                 <div className="space-y-2">
//                   <div className="flex justify-between">
//                     <Label>Target Annual Volatility: {formatPercent(targetRisk)}</Label>
//                     <span className="text-sm text-muted-foreground">
//                       {formatPercent(targetRisk)}
//                     </span>
//                   </div>
//                   <Slider
//                     value={[targetRisk * 100]}
//                     onValueChange={([value]) => setTargetRisk(value / 100)}
//                     min={5}
//                     max={100}
//                     step={1}
//                     disabled={loading}
//                   />
//                 </div>
//               )}

//               <div className="space-y-2">
//                 <Label>Weight Bounds</Label>
//                 <div className="flex items-center gap-2">
//                   <div className="relative w-24">
//                     <Input
//                       type="number"
//                       value={weightBounds[0] * 100}
//                       onChange={(e) =>
//                         setWeightBounds([Number(e.target.value) / 100, weightBounds[1]])
//                       }
//                       min={0}
//                       max={weightBounds[1] * 100 - 1}
//                       step={1}
//                       className="pr-8"
//                       disabled={loading || marketNeutral}
//                     />
//                     <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
//                   </div>
//                   <span className="text-muted-foreground">to</span>
//                   <div className="relative w-24">
//                     <Input
//                       type="number"
//                       value={weightBounds[1] * 100}
//                       onChange={(e) =>
//                         setWeightBounds([weightBounds[0], Number(e.target.value) / 100])
//                       }
//                       min={weightBounds[0] * 100 + 1}
//                       max={100}
//                       step={1}
//                       className="pr-8"
//                       disabled={loading || marketNeutral}
//                     />
//                     <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
//                   </div>
//                   <div className="flex items-center space-x-2 ml-4">
//                     <input
//                       type="checkbox"
//                       id="marketNeutral"
//                       checked={marketNeutral}
//                       onChange={(e) => {
//                         setMarketNeutral(e.target.checked);
//                         if (e.target.checked) {
//                           setWeightBounds([-1, 1]);
//                         } else {
//                           setWeightBounds([0, 1]);
//                         }
//                       }}
//                       className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
//                       disabled={loading}
//                     />
//                     <Label htmlFor="marketNeutral" className="text-sm">
//                       Market Neutral
//                     </Label>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </TabsContent>

//           <TabsContent value="results" className="pt-4">
//             {result ? (
//               <div className="space-y-6">
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                   <Card>
//                     <CardHeader className="pb-2">
//                       <CardTitle className="text-sm font-medium text-muted-foreground">
//                         Expected Return
//                       </CardTitle>
//                     </CardHeader>
//                     <CardContent>
//                       <div className="text-2xl font-bold">
//                         {formatPercent(result.optimization.expected_return)}
//                       </div>
//                     </CardContent>
//                   </Card>
//                   <Card>
//                     <CardHeader className="pb-2">
//                       <CardTitle className="text-sm font-medium text-muted-foreground">
//                         Expected Volatility
//                       </CardTitle>
//                     </CardHeader>
//                     <CardContent>
//                       <div className="text-2xl font-bold">
//                         {formatPercent(result.optimization.volatility)}
//                       </div>
//                     </CardContent>
//                   </Card>
//                   <Card>
//                     <CardHeader className="pb-2">
//                       <CardTitle className="text-sm font-medium text-muted-foreground">
//                         Sharpe Ratio
//                       </CardTitle>
//                     </CardHeader>
//                     <CardContent>
//                       <div className="text-2xl font-bold">
//                         {result.optimization.sharpe_ratio.toFixed(2)}
//                       </div>
//                     </CardContent>
//                   </Card>
//                 </div>

//                 <Card>
//                   <CardHeader>
//                     <CardTitle>Optimal Allocation</CardTitle>
//                     <CardDescription>
//                       Recommended portfolio allocation based on {objective.replace('_', ' ')} objective
//                     </CardDescription>
//                   </CardHeader>
//                   <CardContent>
//                     <div className="space-y-4">
//                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                         {Object.entries(result.optimization.weights).map(([ticker, weight]) => (
//                           <div key={ticker} className="flex items-center justify-between p-3 border rounded-md">
//                             <div className="font-medium">{ticker}</div>
//                             <div className="flex items-center gap-4">
//                               <Badge variant="outline" className="px-2 py-1">
//                                 {formatPercent(weight)}
//                               </Badge>
//                               <div className="text-sm text-muted-foreground">
//                                 {result.allocation.allocation[ticker]?.toFixed(2) || 0} shares
//                               </div>
//                               <div className="text-sm font-medium">
//                                 {formatCurrency((result.allocation.latest_prices[ticker] || 0) * (result.allocation.allocation[ticker] || 0))}
//                               </div>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
                      
//                       <div className="pt-4 border-t">
//                         <div className="flex justify-between items-center">
//                           <span className="text-sm text-muted-foreground">Total Allocated</span>
//                           <span className="font-medium">
//                             {formatCurrency(result.allocation.total_value)}
//                           </span>
//                         </div>
//                         <div className="flex justify-between items-center text-sm">
//                           <span className="text-muted-foreground">Leftover Cash</span>
//                           <span className="text-muted-foreground">
//                             {formatCurrency(result.allocation.leftover)}
//                           </span>
//                         </div>
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>
//               </div>
//             ) : (
//               <div className="flex flex-col items-center justify-center py-12 text-center">
//                 <BarChart2 className="h-12 w-12 text-muted-foreground mb-4" />
//                 <h3 className="text-lg font-medium">No optimization results</h3>
//                 <p className="text-sm text-muted-foreground mt-1">
//                   Run the optimizer to see recommended allocations
//                 </p>
//               </div>
//             )}
//           </TabsContent>
//         </Tabs>
//       </CardContent>
//     </Card>
//   );
// }


import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../components/ui/button'; // Assuming paths are correct relative to component file
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Slider } from '../../components/ui/slider';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch'; // Use Switch for boolean
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip'; // For explanations
import { Loader2, BarChart2, PieChart as PieChartIcon, TrendingUp, TrendingDown, ArrowUpDown, Info } from 'lucide-react';
import { useToast } from '../../hooks/use-toast'; // Assuming path is correct
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts'; // For results viz

// --- Constants ---
// !! IMPORTANT: Replace with your actual API endpoint !!
// Use environment variables for production: process.env.REACT_APP_OPTIMIZER_API_URL || 'http://localhost:5000/api/portfolio/optimize'
const OPTIMIZER_API_URL = 'http://localhost:5000/api/portfolio/optimize';

// Placeholder Type - Ensure this matches the actual type used in your Portfolio page
interface PortfolioItem {
  id: string;
  ticker: string;
  shares: number;
  // Add other fields as needed based on your actual data structure
}

interface PortfolioOptimizerProps {
  portfolio: PortfolioItem[];
  // Callback function to potentially update parent state with optimized weights
  onOptimizeSuccess?: (optimizedWeights: Record<string, number>) => void;
  className?: string;
}

// Type for the API response structure
interface OptimizationResult {
  status: 'success' | 'error';
  message?: string; // Only present on error
  tickers_optimized?: string[];
  parameters?: {
    objective: string;
    // ... other params if needed
  };
  optimization?: {
    expected_annual_return: number;
    annual_volatility: number;
    sharpe_ratio: number;
    weights: Record<string, number>; // Ticker -> weight (0 to 1)
  };
  allocation?: {
    shares_per_ticker: Record<string, number>; // Ticker -> number of shares
    details_per_ticker: Record<string, { shares: number; latest_price: number; value: number }>;
    total_allocated_value: number;
    leftover_cash: number;
    latest_prices_used: Record<string, number>;
  };
}

// --- Helper Functions ---
const formatPercent = (value: number | undefined | null, digits = 1): string => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return `${(value * 100).toFixed(digits)}%`;
}

const formatCurrency = (value: number | undefined | null, digits = 2): string => {
     if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

const formatNumber = (value: number | undefined | null, digits = 2): string => {
     if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// --- Component ---
export function PortfolioOptimizer({ portfolio, onOptimizeSuccess, className = '' }: PortfolioOptimizerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [activeTab, setActiveTab] = useState("settings");

  // --- Settings State ---
  const [objective, setObjective] = useState('max_sharpe');
  const [targetReturn, setTargetReturn] = useState(0.20); // 20%
  const [targetRisk, setTargetRisk] = useState(0.15);   // 15%
  const [portfolioValue, setPortfolioValue] = useState(10000);
  const [marketNeutral, setMarketNeutral] = useState(false);
  // Separate state for min/max bounds inputs for easier handling
  const [minWeightInput, setMinWeightInput] = useState('0');
  const [maxWeightInput, setMaxWeightInput] = useState('100');
  const weightBounds: [number, number] = useMemo(() => {
      const minW = parseFloat(minWeightInput) / 100;
      const maxW = parseFloat(maxWeightInput) / 100;
      // Basic validation, ensure min < max
      if (isNaN(minW) || isNaN(maxW) || minW >= maxW) {
          return marketNeutral ? [-1, 1] : [0, 1]; // Default based on market neutral
      }
       return marketNeutral ? [-1,1] : [Math.max(0, minW), Math.min(1, maxW)]; // Ensure bounds are valid for long-only
  }, [minWeightInput, maxWeightInput, marketNeutral]);


  const tickers = useMemo(() => portfolio.map(item => item.ticker), [portfolio]);

  // Reset results when settings change? Optional, but can prevent confusion.
  // useEffect(() => {
  //   setResult(null);
  //   setActiveTab("settings");
  // }, [objective, targetReturn, targetRisk, portfolioValue, marketNeutral, weightBounds]);


  const handleOptimize = async () => {
    if (tickers.length < 2) {
      toast({
        title: 'Need More Assets',
        description: 'Portfolio optimization requires at least two different assets.',
        variant: 'warning',
      });
      return;
    }

    setLoading(true);
    setResult(null); // Clear previous results
    setActiveTab("settings"); // Switch back to settings view while loading

    try {
      const payload = {
        tickers,
        objective,
        market_neutral: marketNeutral,
        weight_bounds: weightBounds,
        portfolio_value: portfolioValue,
        // Conditionally add target return/risk
        ...(objective === 'efficient_return' && { target_return: targetReturn }),
        ...(objective === 'efficient_risk' && { target_risk: targetRisk }),
        // Add other parameters like risk_free_rate if configurable in UI
      };

      console.log("Sending optimization request:", payload); // Log payload for debugging

      const response = await fetch(OPTIMIZER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data: OptimizationResult = await response.json();

      console.log("Received optimization response:", data); // Log response

      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || `HTTP error ${response.status}`);
      }

      setResult(data);
      setActiveTab("results"); // Switch to results tab on success
      if (data.optimization?.weights) {
         onOptimizeSuccess?.(data.optimization.weights); // Trigger callback if provided
      }

      toast({
        title: 'Optimization Successful',
        description: `Portfolio optimized for ${objective.replace(/_/g, ' ')}.`,
        variant: 'success'
      });
    } catch (error) {
      console.error('Optimization API error:', error);
      toast({
        title: 'Optimization Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred while contacting the optimizer.',
        variant: 'destructive',
      });
       setResult({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }); // Set error state
    } finally {
      setLoading(false);
    }
  };

  // --- Data for Results Visualization ---
   const weightsChartData = useMemo(() => {
    if (!result?.optimization?.weights) return [];
    return Object.entries(result.optimization.weights)
      .filter(([, weight]) => Math.abs(weight) > 0.0001) // Filter out negligible weights
      .map(([ticker, weight], index) => ({
        name: ticker,
        weight: weight * 100, // Convert to percentage for display
        fill: `hsl(${(index * 60) % 360}, 70%, 50%)`, // Simple color rotation
      }))
      .sort((a, b) => b.weight - a.weight); // Sort descending by weight
  }, [result]);

  return (
    <TooltipProvider>
      <Card className={`shadow-lg border border-border/40 ${className}`}>
        <CardHeader className="border-b border-border/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                <BarChart2 className="h-5 w-5 text-primary" />
                Portfolio Optimizer (AI-Powered)
              </CardTitle>
              <CardDescription className="mt-1">
                Calculate optimal allocations using Modern Portfolio Theory, optionally powered by AI return predictions.
              </CardDescription>
            </div>
            <Button
              onClick={handleOptimize}
              disabled={loading || tickers.length < 2}
              className="gap-2 w-full sm:w-auto shrink-0"
              size="sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <ArrowUpDown className="h-4 w-4" />
                  Run Optimization
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="results" disabled={!result || result.status === 'error'}>
                Results
              </TabsTrigger>
            </TabsList>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                 {/* Objective Setting */}
                 <div className="space-y-2">
                    <Label htmlFor="objective">Optimization Goal</Label>
                     <Select value={objective} onValueChange={setObjective} disabled={loading}>
                        <SelectTrigger id="objective">
                            <SelectValue placeholder="Select Goal" />
                        </SelectTrigger>
                        <SelectContent>
                             {/* Simplified OBJECTIVES array for cleaner SelectItems */}
                            <SelectItem value="max_sharpe">Maximize Sharpe Ratio (Best Risk-Adjusted Return)</SelectItem>
                            <SelectItem value="min_volatility">Minimize Volatility (Lowest Risk)</SelectItem>
                            <SelectItem value="hrp">Hierarchical Risk Parity (Risk Diversification)</SelectItem>
                            <SelectItem value="efficient_risk">Target Volatility (Max Return for Risk)</SelectItem>
                            <SelectItem value="efficient_return">Target Return (Min Risk for Return)</SelectItem>
                        </SelectContent>
                     </Select>
                 </div>

                 {/* Portfolio Value */}
                 <div className="space-y-2">
                    <Label htmlFor="portfolioValue">Total Portfolio Value</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                            id="portfolioValue"
                            type="number"
                            value={portfolioValue}
                            onChange={(e) => setPortfolioValue(Math.max(0, Number(e.target.value)))} // Prevent negative
                            disabled={loading}
                            min={0}
                            step={100}
                            className="pl-7"
                        />
                    </div>
                 </div>
              </div>

               {/* Conditional Inputs for Efficient Risk/Return */}
                {(objective === 'efficient_return' || objective === 'efficient_risk') && (
                    <Card className="bg-muted/30 border-border/30">
                        <CardContent className="pt-4 space-y-4">
                             {objective === 'efficient_return' && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="targetReturn">Target Annual Return</Label>
                                        <Badge variant="outline">{formatPercent(targetReturn)}</Badge>
                                    </div>
                                    <Slider
                                        id="targetReturn"
                                        value={[targetReturn * 100]}
                                        onValueChange={([value]) => setTargetReturn(value / 100)}
                                        min={-20} max={50} step={1}
                                        disabled={loading}
                                    />
                                </div>
                            )}
                            {objective === 'efficient_risk' && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="targetRisk">Target Annual Volatility</Label>
                                        <Badge variant="outline">{formatPercent(targetRisk)}</Badge>
                                    </div>
                                    <Slider
                                        id="targetRisk"
                                        value={[targetRisk * 100]}
                                        onValueChange={([value]) => setTargetRisk(value / 100)}
                                        min={1} max={50} step={1}
                                        disabled={loading}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

              {/* Advanced Settings Section */}
               <details className="border rounded-md p-4">
                    <summary className="cursor-pointer font-medium text-sm flex justify-between items-center">
                        Advanced Options
                        <span className="text-xs text-muted-foreground"> (Weight Bounds, Market Neutral)</span>
                    </summary>
                    <div className="mt-4 space-y-4">
                        {/* Weight Bounds (only if NOT market neutral) */}
                        {!marketNeutral && (
                            <div className="space-y-2">
                                <Label>Weight Bounds per Asset</Label>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                         <Input
                                            type="number"
                                            value={minWeightInput}
                                            onChange={(e) => setMinWeightInput(e.target.value)}
                                            min={0} max={parseFloat(maxWeightInput) - 0.1} step={0.1} // Allow finer steps
                                            className="pr-7" disabled={loading}
                                        />
                                         <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                                    </div>
                                    <span className="text-muted-foreground text-sm">to</span>
                                    <div className="relative flex-1">
                                         <Input
                                            type="number"
                                            value={maxWeightInput}
                                            onChange={(e) => setMaxWeightInput(e.target.value)}
                                            min={parseFloat(minWeightInput) + 0.1} max={100} step={0.1}
                                            className="pr-7" disabled={loading}
                                        />
                                         <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                                    </div>
                                </div>
                                 <p className="text-xs text-muted-foreground">Min/Max percentage allowed for a single asset (0% to 100%).</p>
                            </div>
                        )}

                        {/* Market Neutral Switch */}
                        <div className="flex items-center justify-between space-x-2 pt-2 border-t mt-4">
                            <Label htmlFor="marketNeutral" className="flex items-center gap-2">
                                Market Neutral (Allow Shorting)
                                <Tooltip delayDuration={100}>
                                    <TooltipTrigger>
                                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                        Allows short positions. Portfolio weights will sum to zero. Individual weight bounds are ignored and set to -100% to +100%.
                                    </TooltipContent>
                                </Tooltip>
                            </Label>
                            <Switch
                                id="marketNeutral"
                                checked={marketNeutral}
                                onCheckedChange={(checked) => {
                                    setMarketNeutral(checked);
                                    // Reset bounds when toggling
                                    if (checked) {
                                        setMinWeightInput('-100'); // Indicate shorting allowed
                                        setMaxWeightInput('100');
                                    } else {
                                         setMinWeightInput('0');
                                         setMaxWeightInput('100');
                                    }
                                }}
                                disabled={loading}
                            />
                        </div>
                         <p className="text-xs text-muted-foreground">If enabled, allows short selling (negative weights) aiming for zero net market exposure.</p>

                    </div>
               </details>

                {tickers.length < 2 && (
                    <p className="text-sm text-destructive text-center mt-4">
                        Add at least two assets to your portfolio to enable optimization.
                    </p>
                )}
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results" className="pt-4 space-y-6">
              {loading && (
                  <div className="flex justify-center items-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="ml-3 text-muted-foreground">Calculating...</span>
                  </div>
              )}
              {result?.status === 'error' && !loading && (
                 <Card className="border-destructive bg-destructive/10">
                    <CardHeader>
                        <CardTitle className="text-destructive text-lg">Optimization Failed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-destructive">{result.message || 'An unexpected error occurred.'}</p>
                        <p className="text-xs text-muted-foreground mt-2">Check the API logs for more details or adjust your settings and try again.</p>
                    </CardContent>
                 </Card>
              )}
              {result?.status === 'success' && !loading && result.optimization && result.allocation && (
                <>
                  {/* Performance Metrics */}
                  <Card className="bg-muted/30">
                      <CardHeader className="pb-3">
                          <CardTitle className="text-base font-medium">Optimized Portfolio Performance</CardTitle>
                           <CardDescription>Based on objective: <span className="font-semibold">{result.parameters?.objective?.replace(/_/g, ' ')}</span></CardDescription>
                      </CardHeader>
                      <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                               <div>
                                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Exp. Annual Return</div>
                                  <div className="text-xl font-bold mt-1 text-green-600">{formatPercent(result.optimization.expected_annual_return, 1)}</div>
                               </div>
                               <div>
                                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Annual Volatility</div>
                                  <div className="text-xl font-bold mt-1 text-orange-600">{formatPercent(result.optimization.annual_volatility, 1)}</div>
                               </div>
                               <div>
                                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Sharpe Ratio</div>
                                  <div className="text-xl font-bold mt-1 text-blue-600">{formatNumber(result.optimization.sharpe_ratio, 2)}</div>
                               </div>
                          </div>
                      </CardContent>
                  </Card>

                   {/* Allocation Weights Chart and Table */}
                   <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                                <PieChartIcon className="h-4 w-4" />
                                Optimal Allocation Weights
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {weightsChartData.length > 0 ? (
                                <div className="h-64 w-full mb-6">
                                    <ResponsiveContainer>
                                        <BarChart data={weightsChartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3}/>
                                            <XAxis type="number" tickFormatter={(tick) => `${tick}%`} fontSize={10} axisLine={false} tickLine={false} domain={[0, 'dataMax + 5']}/>
                                            <YAxis dataKey="name" type="category" width={60} fontSize={10} axisLine={false} tickLine={false}/>
                                            <RechartsTooltip
                                                cursor={{ fill: 'rgba(206, 212, 218, 0.2)' }}
                                                formatter={(value) => [`${value.toFixed(2)}%`, 'Weight']}
                                            />
                                            <Bar dataKey="weight" barSize={20}>
                                                {weightsChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center">No weights to display.</p>
                            )}

                             {/* Discrete Allocation Table */}
                             <h4 className="text-sm font-medium mb-2 mt-6">Discrete Allocation for {formatCurrency(portfolioValue)}</h4>
                             <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Ticker</th>
                                            <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Shares</th>
                                            <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Weight</th>
                                            <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Value</th>
                                            <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Last Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(result.allocation.details_per_ticker)
                                            .sort(([,a], [,b]) => b.value - a.value) // Sort by allocated value desc
                                            .map(([ticker, details]) => (
                                            <tr key={ticker} className="border-b last:border-b-0 hover:bg-muted/50">
                                                <td className="py-2 px-3 font-medium">{ticker}</td>
                                                <td className="py-2 px-3 text-right">{details.shares?.toFixed(2) ?? '0.00'}</td>
                                                <td className="py-2 px-3 text-right">{formatPercent(result.optimization?.weights[ticker] ?? 0, 1)}</td>
                                                <td className="py-2 px-3 text-right">{formatCurrency(details.value)}</td>
                                                <td className="py-2 px-3 text-right text-muted-foreground">{formatCurrency(details.latest_price, 2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t font-semibold">
                                             <td colSpan={3} className="py-2 px-3 text-right">Total Allocated:</td>
                                             <td className="py-2 px-3 text-right">{formatCurrency(result.allocation.total_allocated_value)}</td>
                                             <td></td>
                                        </tr>
                                        <tr>
                                            <td colSpan={3} className="pt-1 pb-2 px-3 text-right text-muted-foreground">Leftover Cash:</td>
                                            <td className="pt-1 pb-2 px-3 text-right text-muted-foreground">{formatCurrency(result.allocation.leftover_cash)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                             </div>
                        </CardContent>
                   </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
