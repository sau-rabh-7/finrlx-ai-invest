import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BENZINGA_API_KEY = Deno.env.get('BENZINGA_API_KEY');

async function fetchBenzingaNews(ticker?: string) {
  try {
    // If BENZINGA_API_KEY is not set, return placeholder data
    if (!BENZINGA_API_KEY) {
      console.log('BENZINGA_API_KEY not set, using placeholder data');
      return getMockNewsData(ticker);
    }

    const params = new URLSearchParams({
      token: BENZINGA_API_KEY,
      pageSize: '10',
      displayOutput: 'full'
    });

    if (ticker) {
      params.append('tickers', ticker);
    }

    const response = await fetch(
      `https://api.benzinga.com/api/v2/news?${params.toString()}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('Benzinga API error:', response.status);
      return getMockNewsData(ticker);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching from Benzinga:', error);
    return getMockNewsData(ticker);
  }
}

function getMockNewsData(ticker?: string) {
  const baseNews = [
    {
      id: '1',
      title: 'Tech Stocks Rally as AI Investments Surge',
      body: 'Major technology companies are seeing significant gains as artificial intelligence investments continue to drive market sentiment. Analysts predict this trend will reshape the industry landscape in the coming quarters.',
      author: 'Financial Times',
      url: 'https://example.com/news1',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      channels: ['Technology'],
      stocks: ticker ? [ticker] : ['AAPL', 'MSFT', 'GOOGL']
    },
    {
      id: '2',
      title: 'Federal Reserve Signals Potential Interest Rate Adjustments',
      body: 'Economic indicators suggest the Federal Reserve may adjust interest rates in the upcoming quarter, impacting borrowing costs and overall market sentiment across various sectors.',
      author: 'Bloomberg',
      url: 'https://example.com/news2',
      created: new Date(Date.now() - 3600000).toISOString(),
      updated: new Date(Date.now() - 3600000).toISOString(),
      channels: ['Economics'],
      stocks: ticker ? [ticker] : ['SPY', 'QQQ']
    },
    {
      id: '3',
      title: 'Energy Sector Reports Strong Quarterly Performance',
      body: 'Oil and gas companies are reporting robust quarterly earnings as global energy demand continues to rise, driven by economic recovery and increased industrial activity.',
      author: 'Reuters',
      url: 'https://example.com/news3',
      created: new Date(Date.now() - 7200000).toISOString(),
      updated: new Date(Date.now() - 7200000).toISOString(),
      channels: ['Energy'],
      stocks: ticker ? [ticker] : ['XOM', 'CVX']
    },
    {
      id: '4',
      title: 'Healthcare Sector Gains on FDA Approvals',
      body: 'Pharmaceutical companies receive boost from recent FDA approvals for breakthrough treatments, driving investor confidence in the healthcare sector.',
      author: 'Wall Street Journal',
      url: 'https://example.com/news4',
      created: new Date(Date.now() - 10800000).toISOString(),
      updated: new Date(Date.now() - 10800000).toISOString(),
      channels: ['Healthcare'],
      stocks: ticker ? [ticker] : ['JNJ', 'PFE']
    },
    {
      id: '5',
      title: 'Consumer Spending Remains Robust Despite Inflation',
      body: 'Retail sector shows resilience as consumer spending data exceeds expectations, suggesting economic strength despite ongoing inflation concerns.',
      author: 'CNBC',
      url: 'https://example.com/news5',
      created: new Date(Date.now() - 14400000).toISOString(),
      updated: new Date(Date.now() - 14400000).toISOString(),
      channels: ['Retail'],
      stocks: ticker ? [ticker] : ['WMT', 'TGT']
    }
  ];

  return baseNews;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticker } = await req.json();
    console.log(`Fetching news for ticker: ${ticker || 'general market'}`);

    const newsData = await fetchBenzingaNews(ticker);
    
    // Transform Benzinga data or mock data into our format with sentiment placeholders
    const articles = (Array.isArray(newsData) ? newsData : []).map((article: any, index: number) => ({
      id: article.id || index,
      title: article.title,
      summary: article.body ? article.body.substring(0, 200) + '...' : article.title,
      source: article.author || 'Benzinga',
      url: article.url,
      publishedAt: article.created || article.updated,
      
      // PLACEHOLDER: These sentiment fields should be populated by your FinBERT model
      // Integration point: Pass article.title and article.body to your FinBERT model
      // Example: const sentiment = await analyzeWithFinBERT(article.title, article.body);
      sentiment: {
        sentiment: 'neutral', // PLACEHOLDER - Your FinBERT model should return: 'positive' | 'negative' | 'neutral'
        score: 0, // PLACEHOLDER - Sentiment confidence score (0-1) from your FinBERT model
        recommendation: 'HOLD', // PLACEHOLDER - Your model's recommendation: 'BUY' | 'SELL' | 'HOLD'
        analysis: 'Sentiment analysis pending - integrate your FinBERT model here to analyze this article', // PLACEHOLDER - Detailed analysis from your model
        confidence: 0 // PLACEHOLDER - Overall confidence (0-1) from your FinBERT model
      }
    }));

    return new Response(
      JSON.stringify({ articles }),
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
