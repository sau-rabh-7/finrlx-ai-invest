// S&P 500 stock tickers - comprehensive list of major companies
export const SP500_TICKERS = [
  // Technology
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'GOOG', 'META', 'TSLA', 'AVGO', 'ORCL', 'ADBE',
  'CRM', 'AMD', 'CSCO', 'ACN', 'INTC', 'IBM', 'QCOM', 'TXN', 'INTU', 'NOW',
  'AMAT', 'MU', 'ADI', 'LRCX', 'KLAC', 'SNPS', 'CDNS', 'MCHP', 'FTNT', 'PANW',
  
  // Financial Services
  'BRK.B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'MS', 'GS', 'SPGI', 'BLK',
  'C', 'AXP', 'SCHW', 'CB', 'MMC', 'PGR', 'AON', 'ICE', 'CME', 'USB',
  'PNC', 'TFC', 'COF', 'AIG', 'MET', 'PRU', 'ALL', 'TRV', 'AFL', 'HIG',
  
  // Healthcare
  'UNH', 'LLY', 'JNJ', 'ABBV', 'MRK', 'TMO', 'ABT', 'AMGN', 'DHR', 'PFE',
  'BMY', 'ISRG', 'GILD', 'VRTX', 'CVS', 'CI', 'REGN', 'MCK', 'ELV', 'ZTS',
  'SYK', 'BSX', 'MDT', 'HCA', 'BDX', 'EW', 'IDXX', 'RMD', 'DXCM', 'IQV',
  
  // Consumer Discretionary
  'AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'LOW', 'SBUX', 'TJX', 'BKNG', 'CMG',
  'MAR', 'ABNB', 'GM', 'F', 'ORLY', 'AZO', 'YUM', 'ROST', 'DHI', 'LEN',
  
  // Communication Services
  'GOOGL', 'META', 'NFLX', 'DIS', 'CMCSA', 'T', 'VZ', 'TMUS', 'CHTR', 'EA',
  'TTWO', 'OMC', 'IPG', 'NWSA', 'FOX', 'PARA', 'WBD', 'MTCH', 'LYV',
  
  // Consumer Staples
  'WMT', 'PG', 'COST', 'KO', 'PEP', 'PM', 'MO', 'MDLZ', 'CL', 'GIS',
  'KMB', 'STZ', 'SYY', 'HSY', 'K', 'CHD', 'CLX', 'TSN', 'HRL', 'CAG',
  
  // Energy
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'OXY', 'WMB',
  'KMI', 'HES', 'HAL', 'BKR', 'FANG', 'DVN', 'EQT', 'TRGP', 'OKE', 'LNG',
  
  // Industrials
  'CAT', 'RTX', 'UNP', 'HON', 'BA', 'UPS', 'LMT', 'DE', 'GE', 'ADP',
  'MMM', 'GD', 'NOC', 'ETN', 'ITW', 'CSX', 'EMR', 'NSC', 'FDX', 'CARR',
  'PCAR', 'JCI', 'WM', 'TT', 'PH', 'CTAS', 'CMI', 'FAST', 'PAYX', 'ODFL',
  
  // Materials
  'LIN', 'APD', 'SHW', 'FCX', 'NEM', 'ECL', 'CTVA', 'DD', 'DOW', 'NUE',
  'VMC', 'MLM', 'PPG', 'IFF', 'BALL', 'AVY', 'AMCR', 'PKG', 'IP', 'CE',
  
  // Real Estate
  'AMT', 'PLD', 'EQIX', 'CCI', 'PSA', 'WELL', 'DLR', 'O', 'SPG', 'VICI',
  'AVB', 'EQR', 'SBAC', 'WY', 'INVH', 'ARE', 'MAA', 'ESS', 'VTR', 'EXR',
  
  // Utilities
  'NEE', 'SO', 'DUK', 'CEG', 'SRE', 'AEP', 'D', 'PEG', 'VST', 'EXC',
  'XEL', 'ED', 'EIX', 'WEC', 'AWK', 'DTE', 'ES', 'FE', 'AEE', 'PPL',
  
  // Additional Popular Stocks
  'SHOP', 'SQ', 'PYPL', 'COIN', 'HOOD', 'SOFI', 'PLTR', 'SNOW', 'CRWD', 'ZS',
  'NET', 'DDOG', 'MDB', 'WDAY', 'TEAM', 'ZM', 'DOCU', 'TWLO', 'OKTA', 'SPLK',
  'UBER', 'LYFT', 'DASH', 'ABNB', 'RIVN', 'LCID', 'NIO', 'XPEV', 'LI', 'PLUG',
  'ENPH', 'SEDG', 'FSLR', 'RUN', 'SPWR', 'BE', 'BLNK', 'CHPT', 'QS', 'NKLA'
];

// Subset for faster queries (top 100 most liquid stocks)
export const TOP_100_TICKERS = [
  // Mega Cap Tech
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AVGO', 'ORCL', 'ADBE',
  
  // Large Cap Tech
  'CRM', 'AMD', 'CSCO', 'ACN', 'INTC', 'IBM', 'QCOM', 'TXN', 'INTU', 'NOW',
  
  // Financial Services
  'BRK.B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'MS', 'GS', 'SPGI', 'BLK',
  'C', 'AXP', 'SCHW', 'CB', 'MMC', 'PGR', 'USB', 'PNC', 'COF', 'AIG',
  
  // Healthcare
  'UNH', 'LLY', 'JNJ', 'ABBV', 'MRK', 'TMO', 'ABT', 'AMGN', 'DHR', 'PFE',
  'BMY', 'ISRG', 'GILD', 'VRTX', 'CVS', 'CI', 'REGN', 'MCK', 'ELV', 'ZTS',
  
  // Consumer
  'WMT', 'HD', 'MCD', 'NKE', 'LOW', 'COST', 'SBUX', 'TJX', 'PG', 'KO',
  'PEP', 'PM', 'BKNG', 'CMG', 'MAR', 'ABNB', 'GM', 'F', 'ORLY', 'AZO',
  
  // Communication
  'NFLX', 'DIS', 'CMCSA', 'T', 'VZ', 'TMUS', 'CHTR', 'EA', 'TTWO',
  
  // Energy
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'OXY', 'WMB',
  
  // Industrials
  'CAT', 'RTX', 'UNP', 'HON', 'BA', 'UPS', 'LMT', 'DE', 'GE', 'ADP'
];
