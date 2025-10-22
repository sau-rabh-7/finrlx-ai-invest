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
    const { symbol } = await req.json();
    
    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching stock details for ${symbol}`);

    // Fetch quote data
    const quoteResponse = await fetch(
      `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}`,
      { headers: NSE_HEADERS }
    );
    
    const quoteData = await quoteResponse.json();
    const priceInfo = quoteData.priceInfo;
    const info = quoteData.info;

    // Placeholder for AI analysis - will be replaced with FinBERT model
    const aiAnalysis = {
      recommendation: 'PLACEHOLDER_BUY_SELL_HOLD',
      confidence: 0,
      summary: 'PLACEHOLDER: AI analysis using FinBERT model will appear here',
      reasoning: 'PLACEHOLDER: Detailed reasoning from FinBERT model'
    };

    const stockDetail = {
      symbol: symbol,
      companyName: info?.companyName || symbol,
      industry: info?.industry || 'N/A',
      currentPrice: priceInfo?.lastPrice || 0,
      change: priceInfo?.change || 0,
      changePercent: priceInfo?.pChange || 0,
      open: priceInfo?.open || 0,
      high: priceInfo?.intraDayHighLow?.max || 0,
      low: priceInfo?.intraDayHighLow?.min || 0,
      previousClose: priceInfo?.previousClose || 0,
      volume: priceInfo?.totalTradedVolume || 0,
      marketCap: 0, // NSE doesn't provide this directly
      pe: quoteData.metadata?.pdSymbolPe || 0,
      week52High: priceInfo?.weekHighLow?.max || 0,
      week52Low: priceInfo?.weekHighLow?.min || 0,
      aiAnalysis
    };

    return new Response(
      JSON.stringify(stockDetail),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching stock details:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch stock details' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
