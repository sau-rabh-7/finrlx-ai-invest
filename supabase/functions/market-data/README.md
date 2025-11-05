# Market Data Edge Function

This Supabase Edge Function fetches real-time market data from Yahoo Finance API.

## Features

### Real Data Sorting
- **Top Gainers**: Fetches 100 stocks and returns the top 10 with highest positive percentage change
- **Top Losers**: Fetches 100 stocks and returns the top 10 with highest negative percentage change
- **Trending Stocks**: Returns the 10 most volatile stocks (highest absolute percentage change)
- **Most Active**: Returns the 10 most active mega-cap stocks

### Stock Universe
- Uses a curated list of 100+ most liquid stocks from S&P 500
- Includes major companies across all sectors:
  - Technology (AAPL, MSFT, NVDA, GOOGL, etc.)
  - Financial Services (JPM, V, MA, BAC, etc.)
  - Healthcare (UNH, LLY, JNJ, ABBV, etc.)
  - Consumer (AMZN, WMT, HD, MCD, etc.)
  - Energy (XOM, CVX, COP, etc.)
  - And more...

## API Endpoints

### Request Format
```json
{
  "type": "gainers" | "losers" | "trending" | "most-active" | "overview" | "market-summary"
}
```

### Response Format
```json
{
  "stocks": [
    {
      "symbol": "AAPL",
      "lastPrice": 175.50,
      "pChange": 2.45,
      "change": 4.20
    }
  ]
}
```

## How It Works

1. **Batch Fetching**: Fetches stocks in batches of 20 to avoid overwhelming the API
2. **Real-time Data**: Gets current price, change, and percentage change from Yahoo Finance
3. **Proper Sorting**: Sorts all fetched stocks by actual performance
4. **Error Handling**: Filters out failed requests and returns only valid data

## Performance

- Fetches 100 stocks in ~5-10 seconds (with batching and delays)
- Returns top 10 results for each category
- Caches can be implemented for faster subsequent requests

## Deployment

Deploy using Supabase CLI:
```bash
supabase functions deploy market-data
```

## Testing Locally

```bash
supabase functions serve market-data
```

Then test with:
```bash
curl -X POST http://localhost:54321/functions/v1/market-data \
  -H "Content-Type: application/json" \
  -d '{"type": "gainers"}'
```
