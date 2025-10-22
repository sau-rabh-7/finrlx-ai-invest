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
    
    console.log(`Fetching news for ${ticker || 'market'}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Fetch news from Benzinga-style API (using a free alternative for now)
    const newsUrl = ticker 
      ? `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${getDateDaysAgo(7)}&to=${getTodayDate()}&token=demo`
      : `https://finnhub.io/api/v1/news?category=general&token=demo`;
    
    const newsResponse = await fetch(newsUrl);
    
    if (!newsResponse.ok) {
      throw new Error(`News API error: ${newsResponse.status}`);
    }

    const newsData = await newsResponse.json();
    const articles = Array.isArray(newsData) ? newsData.slice(0, 10) : [];

    // Analyze sentiment using Lovable AI (FinBERT-style analysis)
    const analysisPromises = articles.map(async (article: any) => {
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are a financial sentiment analyzer similar to FinBERT. Analyze the sentiment of news articles and provide a sentiment score from -1 (very negative) to 1 (very positive), and a recommendation (BUY, SELL, or HOLD).'
              },
              {
                role: 'user',
                content: `Analyze the sentiment of this financial news headline and summary:
Title: ${article.headline}
Summary: ${article.summary}

Respond in JSON format with:
{
  "sentiment": "positive" | "negative" | "neutral",
  "score": <number between -1 and 1>,
  "recommendation": "BUY" | "SELL" | "HOLD",
  "confidence": <number between 0 and 1>
}`
              }
            ],
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI analysis failed for article: ${aiResponse.status}`);
          return null;
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices[0].message.content;
        
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return null;
      } catch (error) {
        console.error('Error analyzing article sentiment:', error);
        return null;
      }
    });

    const sentiments = await Promise.all(analysisPromises);

    const enrichedArticles = articles.map((article: any, i: number) => ({
      id: article.id || i,
      title: article.headline,
      summary: article.summary,
      source: article.source,
      url: article.url,
      image: article.image,
      publishedAt: new Date(article.datetime * 1000).toISOString(),
      sentiment: sentiments[i] || {
        sentiment: 'neutral',
        score: 0,
        recommendation: 'HOLD',
        confidence: 0
      }
    }));

    return new Response(
      JSON.stringify({ articles: enrichedArticles }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in news-sentiment function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch news' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}
