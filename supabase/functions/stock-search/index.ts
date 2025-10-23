import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const POPULAR_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK-B', 'V', 'JNJ',
  'WMT', 'JPM', 'MA', 'PG', 'UNH', 'HD', 'DIS', 'BAC', 'XOM', 'CVX'
];

async function fetchYahooStockData(symbol: string) {
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
      return null;
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

async function searchYahooStocks(query: string) {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to search stocks');
    }

    const data = await response.json();
    return data.quotes
      .filter((q: any) => q.quoteType === 'EQUITY')
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol
      }));
  } catch (error) {
    console.error('Error searching stocks:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    console.log(`Stock search query: ${query}`);

    if (!query || query.trim() === '') {
      // Fetch popular stocks
      const stockPromises = POPULAR_STOCKS.map(symbol => fetchYahooStockData(symbol));
      const results = await Promise.all(stockPromises);
      const stocks = results
        .filter(r => r !== null)
        .map(r => ({
          symbol: r!.symbol,
          name: r!.name,
          price: r!.price,
          change: r!.change,
          changePercent: r!.changePercent
        }));

      return new Response(
        JSON.stringify({ stocks }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search for stocks
    const searchResults = await searchYahooStocks(query);

    return new Response(
      JSON.stringify({ stocks: searchResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in stock search:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to search stocks' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
