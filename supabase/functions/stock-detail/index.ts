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
    const { symbol } = await req.json();
    
    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching stock detail for ${symbol}`);

    // Fetch from Yahoo Finance
    const yahooResponse = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y`,
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
    const meta = result.meta;
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    
    // Format historical data
    const historicalData = timestamps.map((time: number, i: number) => ({
      date: new Date(time * 1000).toISOString(),
      open: quotes.open[i],
      high: quotes.high[i],
      low: quotes.low[i],
      close: quotes.close[i],
      volume: quotes.volume[i]
    })).filter((d: any) => d.close !== null);

    // Extract closing prices for LSTM predictions
    const closingPrices = historicalData.map((d: any) => d.close);

    // PLACEHOLDER: This is where you would integrate your FinBERT model
    // The model should analyze the stock data and news sentiment to return:
    // - recommendation: 'buy' | 'sell' | 'hold'
    // - confidence: number (0-100)
    // - summary: string
    // - reasoning: string
    // 
    // Example integration:
    // const aiAnalysis = await analyzeWithFinBERT(symbol, historicalData, newsData);
    const aiAnalysis = {
      recommendation: 'hold', // PLACEHOLDER - Replace with your FinBERT model output
      confidence: 0, // PLACEHOLDER - Replace with your model's confidence score (0-100)
      summary: 'AI analysis pending - integrate your FinBERT model here', // PLACEHOLDER
      reasoning: 'This is a placeholder. Integrate your FinBERT sentiment analysis model to provide buy/sell/hold recommendations based on historical price data and news sentiment.' // PLACEHOLDER
    };

    const stockDetail = {
      symbol,
      companyName: meta.longName || symbol,
      industry: meta.industry || 'N/A',
      currentPrice: meta.regularMarketPrice,
      change: meta.regularMarketPrice - meta.chartPreviousClose,
      changePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
      dayHigh: meta.regularMarketDayHigh,
      dayLow: meta.regularMarketDayLow,
      open: meta.regularMarketOpen || meta.regularMarketPrice,
      previousClose: meta.chartPreviousClose,
      week52High: meta.fiftyTwoWeekHigh,
      week52Low: meta.fiftyTwoWeekLow,
      volume: meta.regularMarketVolume,
      marketCap: meta.marketCap || 0,
      pe: 0,
      historicalData,
      closingPrices, // For LSTM predictions
      aiAnalysis // PLACEHOLDER for your FinBERT model
    };

    console.log(`✅ Fetched ${closingPrices.length} days of data for ${symbol}`);

    return new Response(
      JSON.stringify(stockDetail),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching stock detail:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch stock detail' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
