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
    console.log('Fetching Indian market news');

    // Placeholder news data - replace with actual news API
    const news = [
      {
        id: 1,
        title: 'Nifty 50 hits new all-time high on strong FII inflows',
        summary: 'The benchmark Nifty 50 index reached a new record high today, driven by strong foreign institutional investor inflows across banking and IT sectors.',
        source: 'Economic Times',
        url: '#',
        publishedAt: new Date().toISOString(),
        // PLACEHOLDER for FinBERT sentiment analysis
        sentiment: {
          sentiment: 'PLACEHOLDER_POSITIVE_NEGATIVE_NEUTRAL',
          score: 0,
          recommendation: 'PLACEHOLDER_BUY_SELL_HOLD',
          confidence: 0,
          analysis: 'PLACEHOLDER: FinBERT sentiment analysis will appear here'
        }
      },
      {
        id: 2,
        title: 'IT sector faces headwinds amid global slowdown concerns',
        summary: 'Major IT companies are facing challenges as global economic slowdown concerns impact client spending and new deal signings.',
        source: 'Business Standard',
        url: '#',
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        sentiment: {
          sentiment: 'PLACEHOLDER_POSITIVE_NEGATIVE_NEUTRAL',
          score: 0,
          recommendation: 'PLACEHOLDER_BUY_SELL_HOLD',
          confidence: 0,
          analysis: 'PLACEHOLDER: FinBERT sentiment analysis will appear here'
        }
      },
      {
        id: 3,
        title: 'Banking stocks rally on strong Q4 earnings',
        summary: 'Major private sector banks reported robust Q4 earnings, leading to a rally in banking stocks with HDFC Bank and ICICI Bank leading the gains.',
        source: 'Mint',
        url: '#',
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        sentiment: {
          sentiment: 'PLACEHOLDER_POSITIVE_NEGATIVE_NEUTRAL',
          score: 0,
          recommendation: 'PLACEHOLDER_BUY_SELL_HOLD',
          confidence: 0,
          analysis: 'PLACEHOLDER: FinBERT sentiment analysis will appear here'
        }
      }
    ];

    return new Response(
      JSON.stringify({ articles: news }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching news:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch news' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
