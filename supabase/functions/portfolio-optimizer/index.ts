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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const optimizationPrompt = `As a portfolio optimization AI using reinforcement learning (PPO), 
    suggest an optimal portfolio allocation across these 5 stocks: AAPL, GOOGL, MSFT, AMZN, TSLA.
    The allocation should maximize the Sharpe Ratio (risk-adjusted returns).
    Return the allocation as percentages that sum to 100.`;

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
            content: 'You are a portfolio optimization expert. Respond in JSON format with keys: labels (array of stock symbols) and values (array of percentage allocations that sum to 100).'
          },
          {
            role: 'user',
            content: optimizationPrompt
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status, await response.text());
      throw new Error('Failed to get portfolio optimization');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    let portfolio;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      portfolio = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      // Fallback to balanced portfolio
      portfolio = {
        labels: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'],
        values: [25, 20, 22, 18, 15]
      };
    }

    return new Response(
      JSON.stringify(portfolio),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in portfolio-optimizer:', error);
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
