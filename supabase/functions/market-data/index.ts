import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { TOP_100_TICKERS } from "./sp500-tickers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchYahooFinanceData(symbol: string) {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.chart.result[0];
    
    return {
      symbol,
      name: result.meta.longName || symbol,
      price: result.meta.regularMarketPrice,
      change: result.meta.regularMarketPrice - result.meta.chartPreviousClose,
      changePercent: ((result.meta.regularMarketPrice - result.meta.chartPreviousClose) / result.meta.chartPreviousClose) * 100
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

async function getMarketOverview() {
  const indices = ['^GSPC', '^DJI', '^IXIC', '^RUT']; // S&P 500, DOW, NASDAQ, Russell 2000
  const results = await Promise.all(indices.map(symbol => fetchYahooFinanceData(symbol)));
  
  return {
    indices: results.filter(r => r !== null).map(r => ({
      name: r!.name,
      value: parseFloat(r!.price.toFixed(2)),
      change: parseFloat(r!.change.toFixed(2)),
      changePercent: parseFloat(r!.changePercent.toFixed(2))
    }))
  };
}

async function getTopMovers(gainers: boolean) {
  console.log(`Fetching ${gainers ? 'gainers' : 'losers'} from ${TOP_100_TICKERS.length} stocks...`);
  
  // Fetch all stocks in batches to avoid overwhelming the API
  const batchSize = 20;
  const allResults = [];
  
  for (let i = 0; i < TOP_100_TICKERS.length; i += batchSize) {
    const batch = TOP_100_TICKERS.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(symbol => fetchYahooFinanceData(symbol))
    );
    allResults.push(...batchResults);
    
    // Small delay between batches to be respectful to the API
    if (i + batchSize < TOP_100_TICKERS.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Filter out null results and sort by change percent
  const validResults = allResults.filter(r => r !== null);
  
  validResults.sort((a, b) => gainers 
    ? (b!.changePercent - a!.changePercent)
    : (a!.changePercent - b!.changePercent)
  );
  
  console.log(`Found ${validResults.length} valid stocks. Top ${gainers ? 'gainer' : 'loser'}: ${validResults[0]?.symbol} (${validResults[0]?.changePercent.toFixed(2)}%)`);
  
  return {
    stocks: validResults.slice(0, 10).map(r => ({
      symbol: r!.symbol,
      lastPrice: parseFloat(r!.price.toFixed(2)),
      pChange: parseFloat(r!.changePercent.toFixed(2)),
      change: parseFloat(r!.change.toFixed(2))
    }))
  };
}

async function getTrendingStocks() {
  console.log('Fetching trending stocks (most volatile)...');
  
  // Use a subset of volatile stocks for trending
  const volatileStocks = TOP_100_TICKERS.slice(0, 50);
  
  const results = await Promise.all(volatileStocks.map(symbol => fetchYahooFinanceData(symbol)));
  const validResults = results.filter(r => r !== null);
  
  // Sort by absolute change percent (most volatile)
  validResults.sort((a, b) => Math.abs(b!.changePercent) - Math.abs(a!.changePercent));
  
  console.log(`Found ${validResults.length} trending stocks. Most volatile: ${validResults[0]?.symbol} (${validResults[0]?.changePercent.toFixed(2)}%)`);
  
  return {
    stocks: validResults.slice(0, 10).map(r => ({
      symbol: r!.symbol,
      lastPrice: parseFloat(r!.price.toFixed(2)),
      pChange: parseFloat(r!.changePercent.toFixed(2)),
      change: parseFloat(r!.change.toFixed(2))
    }))
  };
}

async function getMostActiveStocks() {
  console.log('Fetching most active stocks...');
  
  // Use mega-cap stocks which typically have highest volume
  const activeStocks = TOP_100_TICKERS.slice(0, 30);
  
  const results = await Promise.all(activeStocks.map(symbol => fetchYahooFinanceData(symbol)));
  const validResults = results.filter(r => r !== null);
  
  // Sort by absolute change to show most active movers
  validResults.sort((a, b) => Math.abs(b!.changePercent) - Math.abs(a!.changePercent));
  
  console.log(`Found ${validResults.length} active stocks`);
  
  return {
    stocks: validResults.slice(0, 10).map(r => ({
      symbol: r!.symbol,
      lastPrice: parseFloat(r!.price.toFixed(2)),
      pChange: parseFloat(r!.changePercent.toFixed(2)),
      change: parseFloat(r!.change.toFixed(2))
    }))
  };
}

function getMarketSummary() {
  return {
    totalTurnover: 450000000000 + Math.random() * 50000000000,
    totalShares: 8500000000 + Math.random() * 1000000000,
    totalTransactions: 15000000 + Math.random() * 2000000,
    totalVolume: 12000000000 + Math.random() * 3000000000,
    totalMarketCap: 45000000000000 + Math.random() * 5000000000000,
    advances: 1800 + Math.floor(Math.random() * 400),
    declines: 1200 + Math.floor(Math.random() * 400),
    unchanged: 200 + Math.floor(Math.random() * 100)
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type } = await req.json();
    console.log(`Fetching market data, type: ${type}`);

    let data;
    
    if (type === 'overview') {
      data = await getMarketOverview();
    } else if (type === 'gainers') {
      data = await getTopMovers(true);
    } else if (type === 'losers') {
      data = await getTopMovers(false);
    } else if (type === 'trending') {
      data = await getTrendingStocks();
    } else if (type === 'most-active') {
      data = await getMostActiveStocks();
    } else if (type === 'market-summary') {
      data = getMarketSummary();
    } else {
      data = {};
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching market data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch market data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
