import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NSE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type } = await req.json();
    console.log(`Fetching NSE market data, type: ${type}`);

    let data;

    if (type === 'overview') {
      // Fetch NIFTY 50 index data
      const niftyResponse = await fetch(
        'https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050',
        { headers: NSE_HEADERS }
      );
      const niftyData = await niftyResponse.json();

      // Fetch BANK NIFTY
      const bankNiftyResponse = await fetch(
        'https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20BANK',
        { headers: NSE_HEADERS }
      );
      const bankNiftyData = await bankNiftyResponse.json();

      data = {
        indices: [
          {
            name: 'NIFTY 50',
            value: niftyData.data?.[0]?.last || 0,
            change: niftyData.data?.[0]?.change || 0,
            changePercent: niftyData.data?.[0]?.pChange || 0
          },
          {
            name: 'NIFTY BANK',
            value: bankNiftyData.data?.[0]?.last || 0,
            change: bankNiftyData.data?.[0]?.change || 0,
            changePercent: bankNiftyData.data?.[0]?.pChange || 0
          }
        ]
      };
    } else if (type === 'gainers') {
      const response = await fetch(
        'https://www.nseindia.com/api/live-analysis-variations?index=gainers',
        { headers: NSE_HEADERS }
      );
      const result = await response.json();
      data = { stocks: result.data?.slice(0, 10) || [] };
    } else if (type === 'losers') {
      const response = await fetch(
        'https://www.nseindia.com/api/live-analysis-variations?index=losers',
        { headers: NSE_HEADERS }
      );
      const result = await response.json();
      data = { stocks: result.data?.slice(0, 10) || [] };
    } else if (type === 'market-summary') {
      // Fetch market summary stats
      const response = await fetch(
        'https://www.nseindia.com/api/market-data-pre-open?key=ALL',
        { headers: NSE_HEADERS }
      );
      const result = await response.json();
      
      data = {
        totalTurnover: result.totalTurnover || 0,
        totalShares: result.totalShares || 0,
        totalTransactions: result.totalTransactions || 0,
        advances: result.advances || 0,
        declines: result.declines || 0,
        unchanged: result.unchanged || 0
      };
    }

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
