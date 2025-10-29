import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


async function fetchNewsAPI(query?: string) {
  try {
    // IMPORTANT: Replace with your actual NewsAPI key securely (e.g., via environment variables)
    // Using a hardcoded key like this is NOT recommended for production.
    const NEWS_API_KEY = '8d58cd4e44374bdb8c499c363d073668'; // Replace with your key
    let url = '';
    let logQuery = '';

    if (query) {
      // --- Improved Logic: Use qInTitle for specific company/ticker queries ---
      // Basic assumption: query could be name or ticker. Search for it in the title.
      // For more accuracy, you might want a mapping from name to ticker.
      // Using quotes helps find exact matches but might be too restrictive.
      // Let's search for the term directly in the title.
      const titleQuery = query; // Use the provided query directly for title search
      logQuery = `qInTitle=${titleQuery}`;
      url = `https://newsapi.org/v2/everything?qInTitle=${encodeURIComponent(titleQuery)}&apiKey=${NEWS_API_KEY}&language=en&sortBy=publishedAt&pageSize=20&domains=wsj.com,reuters.com,bloomberg.com,cnbc.com,marketwatch.com,finance.yahoo.com`; // Added relevant financial domains

    } else {
      // --- Fallback for general market news ---
      logQuery = 'q=stock market investment finance'; // Broader default query
      url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(logQuery)}&apiKey=${NEWS_API_KEY}&language=en&sortBy=relevancy&pageSize=20&domains=wsj.com,reuters.com,bloomberg.com,cnbc.com,marketwatch.com,finance.yahoo.com`; // Sort by relevancy for general news
    }

    console.log(`Fetching from NewsAPI with: ${logQuery}`);
    console.log(`Request URL: ${url}`); // Log the exact URL

    const response = await fetch(url);

    console.log(`NewsAPI Response status: ${response.status}`);

    if (!response.ok) {
      // Log more detailed error information
      const errorText = await response.text();
      console.error(`NewsAPI error: ${response.status} ${response.statusText}`);
      console.error(`NewsAPI error response body:`, errorText);
      // Attempt to parse JSON error if possible
      try {
        const errorJson = JSON.parse(errorText);
        console.error("NewsAPI JSON error:", errorJson);
        throw new Error(`NewsAPI error: ${errorJson.code} - ${errorJson.message}`);
      } catch {
         throw new Error(`NewsAPI error: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();

    if (data.status !== 'ok') {
        console.error('NewsAPI response status is not ok:', data);
        throw new Error(data.message || 'NewsAPI returned an error status.');
    }

    if (!data.articles || !Array.isArray(data.articles)) {
      console.log('No "articles" array found or is not an array in the response.');
      return []; // Return empty array if no articles
    }

    console.log(`Found ${data.articles.length} news articles from NewsAPI for query "${query || 'general market'}"`);

    // Format the news data - Keep only necessary fields and filter out removed titles
    const formattedNews = data.articles
      .filter((article: any) => article && article.title && article.title !== '[Removed]' && article.url) // Ensure article, title, and url exist
      .map((article: any) => ({
        id: article.url, // Use URL as a more stable ID
        title: article.title,
        // Use description, fallback to content, trim length
        summary: (article.description || article.content || '').substring(0, 200) + ( (article.description || article.content || '').length > 200 ? '...' : ''),
        source: article.source?.name || 'Unknown Source',
        url: article.url,
        publishedAt: article.publishedAt || new Date().toISOString(),
      }));

    console.log(`Formatted ${formattedNews.length} valid articles.`);
    return formattedNews;

  } catch (error) {
    console.error('Error fetching or processing NewsAPI data:', error);
    // Don't fall back to mock data on API errors in production usually,
    // but keep it here as per original logic for now.
    console.log('Falling back to mock data due to error...');
    // Pass the original query to mock data function if needed
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


    console.log(`Fetching news for query: ${query || 'general market'}`);

    const articles = await fetchNewsAPI(query);
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
