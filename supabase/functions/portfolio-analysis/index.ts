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
    const { ticker, shares, purchasePrice, currentPrice } = await req.json();
    
    console.log(`Analyzing portfolio position for ${ticker}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const totalValue = currentPrice * shares;
    const totalCost = purchasePrice * shares;
    const profitLoss = totalValue - totalCost;
    const profitLossPercent = ((currentPrice - purchasePrice) / purchasePrice) * 100;

    // Get AI recommendation
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
            content: 'You are an expert financial advisor providing portfolio analysis. Analyze stock positions and provide hold/sell recommendations with time horizons.'
          },
          {
            role: 'user',
            content: `Analyze this portfolio position:
Stock: ${ticker}
Shares: ${shares}
Purchase Price: $${purchasePrice}
Current Price: $${currentPrice}
Total P/L: ${profitLossPercent.toFixed(2)}%

Provide analysis in JSON format:
{
  "recommendation": "HOLD" | "SELL" | "BUY_MORE",
  "timeHorizon": "short-term" | "medium-term" | "long-term",
  "confidence": <number 0-1>,
  "reasoning": "<brief explanation>",
  "targetPrice": <number>,
  "stopLoss": <number>
}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let analysis;
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[0]);
    } else {
      analysis = {
        recommendation: 'HOLD',
        timeHorizon: 'medium-term',
        confidence: 0.5,
        reasoning: 'Unable to generate detailed analysis',
        targetPrice: currentPrice * 1.1,
        stopLoss: currentPrice * 0.9
      };
    }

    return new Response(
      JSON.stringify({
        ...analysis,
        currentMetrics: {
          totalValue,
          totalCost,
          profitLoss,
          profitLossPercent
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in portfolio-analysis function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to analyze portfolio' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
