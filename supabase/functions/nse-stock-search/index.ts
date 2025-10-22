import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NSE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    console.log(`Searching NSE stocks: ${query}`);

    if (!query) {
      // Return top 20 NIFTY 50 stocks
      const response = await fetch(
        'https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050',
        { headers: NSE_HEADERS }
      );
      const data = await response.json();
      
      return new Response(
        JSON.stringify({ 
          stocks: data.data?.slice(0, 20).map((stock: any) => ({
            symbol: stock.symbol,
            name: stock.symbol,
            price: stock.lastPrice,
            change: stock.change,
            changePercent: stock.pChange
          })) || [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search for stocks
    const response = await fetch(
      `https://www.nseindia.com/api/search/autocomplete?q=${encodeURIComponent(query)}`,
      { headers: NSE_HEADERS }
    );
    const data = await response.json();

    const stocks = data.symbols?.map((item: any) => ({
      symbol: item.symbol,
      name: item.symbol_info || item.symbol,
      price: 0, // Will be fetched on detail page
      change: 0,
      changePercent: 0
    })) || [];

    return new Response(
      JSON.stringify({ stocks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error searching stocks:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to search stocks' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
