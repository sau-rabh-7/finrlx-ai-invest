import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticker } = await req.json();
    
    if (!ticker) {
      return new Response(
        JSON.stringify({ error: 'Ticker is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching stock data for ${ticker}`);

    // Fetch from Yahoo Finance API
    const yahooResponse = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    if (!yahooResponse.ok) {
      throw new Error(`Yahoo Finance API error: ${yahooResponse.status}`);
    }

    const yahooData = await yahooResponse.json();
    
    if (!yahooData?.chart?.result?.[0]) {
      throw new Error('Invalid data from Yahoo Finance');
    }

    const result = yahooData.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    
    const formattedData = {
      ticker,
      companyName: result.meta.longName || ticker,
      currentPrice: result.meta.regularMarketPrice,
      change: result.meta.regularMarketPrice - result.meta.chartPreviousClose,
      changePercent: ((result.meta.regularMarketPrice - result.meta.chartPreviousClose) / result.meta.chartPreviousClose) * 100,
      historicalData: timestamps.map((time: number, i: number) => ({
        date: new Date(time * 1000).toISOString(),
        open: quotes.open[i],
        high: quotes.high[i],
        low: quotes.low[i],
        close: quotes.close[i],
        volume: quotes.volume[i]
      })).filter((d: any) => d.close !== null)
    };

    return new Response(
      JSON.stringify(formattedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch stock data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
