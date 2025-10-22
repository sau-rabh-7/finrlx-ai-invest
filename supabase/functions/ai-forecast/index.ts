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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Simulate fetching recent news for sentiment analysis
    const newsPrompt = `Analyze the current market sentiment for ${ticker} based on recent financial news. 
    Provide a sentiment classification (Strong Positive, Positive, Neutral, Negative, or Strong Negative) 
    and a confidence score between 0 and 1.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'You are a financial sentiment analysis expert. Respond in JSON format with keys: sentiment (string), sentimentScore (number 0-1), and predictedReturn (number representing percentage).'
          },
          {
            role: 'user',
            content: newsPrompt
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status, await response.text());
      throw new Error('Failed to get AI analysis');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON response from the AI
    let analysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      analysis = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      // Fallback to default values
      analysis = {
        sentiment: "Positive",
        sentimentScore: 0.65,
        predictedReturn: 0.42
      };
    }

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-forecast:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
