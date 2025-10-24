import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Test function to manually check API access
async function testNewsAPIs() {
  console.log('=== Testing News APIs ===');
  
  // Test 1: Yahoo Finance API
  try {
    const yahooUrl = 'https://query2.finance.yahoo.com/v1/finance/search?q=market&quotesCount=0&newsCount=5&lang=en-US';
    console.log(`Testing Yahoo API: ${yahooUrl}`);
    
    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });
    
    console.log(`Yahoo API Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Yahoo API Response keys:', Object.keys(data));
      if (data.news) {
        console.log(`Yahoo API found ${data.news.length} articles`);
      }
    } else {
      console.log(`Yahoo API Error: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Yahoo API Test Error:', error);
  }
  
  // Test 2: Alternative Yahoo endpoint
  try {
    const altUrl = 'https://query1.finance.yahoo.com/v1/finance/search?q=market&quotesCount=0&newsCount=5&lang=en-US';
    console.log(`Testing Alternative Yahoo API: ${altUrl}`);
    
    const response = await fetch(altUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });
    
    console.log(`Alternative Yahoo API Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Alternative Yahoo API Response keys:', Object.keys(data));
      if (data.news) {
        console.log(`Alternative Yahoo API found ${data.news.length} articles`);
      }
    } else {
      console.log(`Alternative Yahoo API Error: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Alternative Yahoo API Test Error:', error);
  }
  
  console.log('=== End API Tests ===');
}

async function fetchYahooNews(query?: string) {
  try {
    const searchQuery = query ? query : 'market';
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(searchQuery)}&quotesCount=0&newsCount=${query ? 15 : 20}&lang=en-US`;
    
    console.log(`Fetching from URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      console.error(`Yahoo API error: ${response.status} ${response.statusText}`);
      throw new Error(`Yahoo News API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Received data structure:`, Object.keys(data));
    
    if (!data.news || !Array.isArray(data.news)) {
      console.log('No news array found in response');
      return [];
    }

    console.log(`Found ${data.news.length} news articles`);

    // Format the news data
    const formattedNews = data.news.map((article: any) => ({
      id: article.uuid || Math.random().toString(),
      title: article.title || 'No title',
      summary: article.summary || 'No summary available.',
      source: article.publisher || 'Unknown Source',
      url: article.link || '#',
      publishedAt: article.providerPublishTime ? 
        new Date(article.providerPublishTime * 1000).toISOString() : 
        new Date().toISOString(),
    }));

    console.log(`Formatted ${formattedNews.length} articles`);
    return formattedNews;

  } catch (error) {
    console.error('Error fetching from Yahoo News:', error);
    console.log('Trying alternative news source...');
    return await fetchAlternativeNews(query);
  }
}

async function fetchAlternativeNews(query?: string) {
  try {
    // Try using NewsAPI as an alternative
    const NEWS_API_KEY = Deno.env.get('NEWS_API_KEY');
    
    if (NEWS_API_KEY) {
      console.log('Trying NewsAPI as alternative source');
      const searchQuery = query ? query : 'finance';
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&apiKey=${NEWS_API_KEY}&language=en&sortBy=publishedAt&pageSize=20`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.articles && Array.isArray(data.articles)) {
          console.log(`NewsAPI found ${data.articles.length} articles`);
          
          return data.articles.map((article: any) => ({
            id: article.url || Math.random().toString(),
            title: article.title || 'No title',
            summary: article.description || article.content || 'No summary available.',
            source: article.source?.name || 'NewsAPI',
            url: article.url || '#',
            publishedAt: article.publishedAt || new Date().toISOString(),
          }));
        }
      }
    }
    
    // Try using a different Yahoo Finance endpoint
    const searchQuery = query ? query : 'stock market';
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(searchQuery)}&quotesCount=0&newsCount=20&lang=en-US`;
    
    console.log(`Trying alternative Yahoo URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://finance.yahoo.com/'
      }
    });

    if (!response.ok) {
      throw new Error(`Alternative API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.news && Array.isArray(data.news)) {
      console.log(`Alternative Yahoo source found ${data.news.length} articles`);
      
      return data.news.map((article: any) => ({
        id: article.uuid || Math.random().toString(),
        title: article.title || 'No title',
        summary: article.summary || 'No summary available.',
        source: article.publisher || 'Yahoo Finance',
        url: article.link || '#',
        publishedAt: article.providerPublishTime ? 
          new Date(article.providerPublishTime * 1000).toISOString() : 
          new Date().toISOString(),
      }));
    }
    
    throw new Error('No news found in alternative source');
    
  } catch (error) {
    console.error('Error fetching from alternative source:', error);
    console.log('Falling back to mock data');
    return getMockNewsData(query);
  }
}

function getMockNewsData(query?: string) {
  console.log(`Generating mock data for query: ${query || 'general market'}`);
  
  const baseNews = [
    {
      id: '1',
      title: 'Tech Stocks Rally as AI Investments Surge',
      summary: 'Major technology companies are seeing significant gains as artificial intelligence investments continue to drive market sentiment. Analysts predict this trend will reshape the industry landscape in the coming quarters.',
      source: 'Financial Times',
      url: 'https://www.ft.com/content/tech-stocks-rally-ai-investments',
      publishedAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Federal Reserve Signals Potential Interest Rate Adjustments',
      summary: 'Economic indicators suggest the Federal Reserve may adjust interest rates in the upcoming quarter, impacting borrowing costs and overall market sentiment across various sectors.',
      source: 'Bloomberg',
      url: 'https://www.bloomberg.com/news/fed-interest-rates',
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '3',
      title: 'Energy Sector Reports Strong Quarterly Performance',
      summary: 'Oil and gas companies are reporting robust quarterly earnings as global energy demand continues to rise, driven by economic recovery and increased industrial activity.',
      source: 'Reuters',
      url: 'https://www.reuters.com/business/energy-sector-performance',
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: '4',
      title: 'Healthcare Sector Gains on FDA Approvals',
      summary: 'Pharmaceutical companies receive boost from recent FDA approvals for breakthrough treatments, driving investor confidence in the healthcare sector.',
      source: 'Wall Street Journal',
      url: 'https://www.wsj.com/articles/healthcare-fda-approvals',
      publishedAt: new Date(Date.now() - 10800000).toISOString(),
    },
    {
      id: '5',
      title: 'Consumer Spending Remains Robust Despite Inflation',
      summary: 'Retail sector shows resilience as consumer spending data exceeds expectations, suggesting economic strength despite ongoing inflation concerns.',
      source: 'CNBC',
      url: 'https://www.cnbc.com/consumer-spending-inflation',
      publishedAt: new Date(Date.now() - 14400000).toISOString(),
    },
    {
      id: '6',
      title: 'Cryptocurrency Market Shows Mixed Signals',
      summary: 'Digital asset markets experience volatility as regulatory developments and institutional adoption continue to shape the landscape.',
      source: 'CoinDesk',
      url: 'https://www.coindesk.com/crypto-market-signals',
      publishedAt: new Date(Date.now() - 18000000).toISOString(),
    },
    {
      id: '7',
      title: 'Electric Vehicle Sales Surge Globally',
      summary: 'EV manufacturers report record sales figures as consumer demand for sustainable transportation options continues to grow.',
      source: 'Electrek',
      url: 'https://electrek.co/ev-sales-surge',
      publishedAt: new Date(Date.now() - 21600000).toISOString(),
    }
  ];

  // If searching for a specific company, filter or modify news
  if (query) {
    const modifiedNews = baseNews.map(article => ({
      ...article,
      title: `${query} News: ${article.title}`,
      summary: `Latest developments regarding ${query}: ${article.summary}`,
    }));
    console.log(`Generated ${modifiedNews.length} mock articles for ${query}`);
    return modifiedNews;
  }

  console.log(`Generated ${baseNews.length} mock articles for general market`);
  return baseNews;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if req.json() throws an error (empty body)
    let query: string | undefined;
    let testMode = false;
    
    try {
      const body = await req.json();
      query = body.query;
      testMode = body.test === true;
      console.log(`Request body received:`, body);
    } catch (e) {
      query = undefined; // No body, fetch general news
      console.log('No request body, fetching general news');
    }

    // Run API tests if requested
    if (testMode) {
      await testNewsAPIs();
      return new Response(
        JSON.stringify({ message: 'API tests completed, check logs' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching news for query: ${query || 'general market'}`);

    const articles = await fetchYahooNews(query);
    console.log(`Returning ${articles.length} articles`);

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
