import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock data generator for NSE market data
function getMockMarketData(type: string) {
  const baseNifty = 25850 + Math.random() * 200 - 100;
  const baseBankNifty = 54200 + Math.random() * 500 - 250;
  
  if (type === 'overview') {
    return {
      indices: [
        {
          name: 'NIFTY 50',
          value: parseFloat(baseNifty.toFixed(2)),
          change: parseFloat((Math.random() * 100 - 50).toFixed(2)),
          changePercent: parseFloat((Math.random() * 2 - 1).toFixed(2))
        },
        {
          name: 'NIFTY BANK',
          value: parseFloat(baseBankNifty.toFixed(2)),
          change: parseFloat((Math.random() * 200 - 100).toFixed(2)),
          changePercent: parseFloat((Math.random() * 2 - 1).toFixed(2))
        }
      ]
    };
  }
  
  if (type === 'gainers') {
    const topGainers = [
      { symbol: 'TATAMOTORS', lastPrice: 985.50, pChange: 4.85, change: 45.60 },
      { symbol: 'BAJFINANCE', lastPrice: 7245.30, pChange: 3.92, change: 273.15 },
      { symbol: 'MARUTI', lastPrice: 12450.75, pChange: 3.67, change: 441.20 },
      { symbol: 'M&M', lastPrice: 2156.40, pChange: 3.45, change: 72.05 },
      { symbol: 'HDFCBANK', lastPrice: 1685.90, pChange: 2.98, change: 48.85 },
      { symbol: 'ICICIBANK', lastPrice: 1245.60, pChange: 2.76, change: 33.45 },
      { symbol: 'RELIANCE', lastPrice: 2987.35, pChange: 2.54, change: 73.95 },
      { symbol: 'INFY', lastPrice: 1823.45, pChange: 2.31, change: 41.15 },
      { symbol: 'TCS', lastPrice: 4156.80, pChange: 2.15, change: 87.50 },
      { symbol: 'WIPRO', lastPrice: 456.70, pChange: 1.98, change: 8.85 }
    ];
    return { stocks: topGainers };
  }
  
  if (type === 'losers') {
    const topLosers = [
      { symbol: 'ADANIPORTS', lastPrice: 1156.30, pChange: -4.23, change: -51.15 },
      { symbol: 'ADANIENT', lastPrice: 2845.60, pChange: -3.87, change: -114.40 },
      { symbol: 'COALINDIA', lastPrice: 456.25, pChange: -3.45, change: -16.30 },
      { symbol: 'NTPC', lastPrice: 378.90, pChange: -3.12, change: -12.20 },
      { symbol: 'POWERGRID', lastPrice: 287.45, pChange: -2.98, change: -8.85 },
      { symbol: 'ONGC', lastPrice: 289.60, pChange: -2.76, change: -8.00 },
      { symbol: 'BPCL', lastPrice: 612.35, pChange: -2.54, change: -15.95 },
      { symbol: 'HINDALCO', lastPrice: 678.90, pChange: -2.31, change: -16.05 },
      { symbol: 'JSWSTEEL', lastPrice: 945.60, pChange: -2.15, change: -20.80 },
      { symbol: 'TATASTEEL', lastPrice: 156.75, pChange: -1.98, change: -3.15 }
    ];
    return { stocks: topLosers };
  }
  
  if (type === 'market-summary') {
    return {
      totalTurnover: 856734523000,
      totalShares: 1245678900,
      totalTransactions: 2567890,
      advances: 1234,
      declines: 987,
      unchanged: 156
    };
  }
  
  return {};
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type } = await req.json();
    console.log(`Fetching NSE market data, type: ${type}`);

    // Use mock data (NSE API requires complex browser session handling)
    const data = getMockMarketData(type);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching NSE market data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch market data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
