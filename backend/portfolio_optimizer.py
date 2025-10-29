# import numpy as np
# import pandas as pd
# import yfinance as yf
# from pypfopt import EfficientFrontier
# from pypfopt import risk_models
# from pypfopt import expected_returns
# from pypfopt import objective_functions
# from pypfopt.discrete_allocation import DiscreteAllocation, get_latest_prices
# from datetime import datetime, timedelta
# from typing import Dict, List, Tuple, Optional
# import logging

# # Set up logging
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# class PortfolioOptimizer:
#     def __init__(self, tickers: List[str], prices: Optional[pd.DataFrame] = None):
#         """
#         Initialize the portfolio optimizer with a list of tickers.
        
#         Args:
#             tickers: List of stock tickers
#             prices: Optional pre-fetched price data
#         """
#         self.tickers = tickers
#         self.prices = prices
#         self.mu = None
#         self.S = None
#         self.ef = None
        
#     def fetch_historical_data(self, years: int = 5) -> pd.DataFrame:
#         """Fetch historical price data for the tickers."""
#         end_date = datetime.now()
#         start_date = end_date - timedelta(days=365 * years)
        
#         if self.prices is None:
#             try:
#                 logger.info(f"Fetching historical data for {len(self.tickers)} tickers...")
#                 data = yf.download(
#                     self.tickers,
#                     start=start_date.strftime('%Y-%m-%d'),
#                     end=end_date.strftime('%Y-%m-%d'),
#                     progress=False
#                 )['Adj Close']
                
#                 # Handle single ticker case
#                 if len(self.tickers) == 1:
#                     data = pd.DataFrame(data)
#                     data.columns = self.tickers
                
#                 self.prices = data.dropna(axis=1)  # Drop columns with missing data
                
#                 # Update tickers in case some were dropped
#                 self.tickers = self.prices.columns.tolist()
                
#                 logger.info(f"Successfully fetched data for {len(self.tickers)} tickers")
#                 return self.prices
                
#             except Exception as e:
#                 logger.error(f"Error fetching historical data: {str(e)}")
#                 raise
        
#         return self.prices
    
#     def calculate_expected_returns(self, method: str = 'capm') -> pd.Series:
#         """Calculate expected returns using the specified method."""
#         if self.prices is None:
#             self.fetch_historical_data()
            
#         if method == 'capm':
#             self.mu = expected_returns.capm_return(
#                 self.prices,
#                 returns_data=False,
#                 risk_free_rate=0.02,  # 2% risk-free rate
#                 frequency=252  # Trading days
#             )
#         else:  # Default to mean historical return
#             self.mu = expected_returns.mean_historical_return(
#                 self.prices,
#                 returns_data=False,
#                 frequency=252
#             )
            
#         return self.mu
    
#     def calculate_covariance_matrix(self, method: str = 'ledoit_wolf') -> pd.DataFrame:
#         """Calculate the covariance matrix using the specified method."""
#         if self.prices is None:
#             self.fetch_historical_data()
            
#         if method == 'ledoit_wolf':
#             self.S = risk_models.CovarianceShrinkage(self.prices).ledoit_wolf()
#         elif method == 'oracle_approximating':
#             self.S = risk_models.CovarianceShrinkage(self.prices).oracle_approximating()
#         else:  # Default to sample covariance
#             self.S = risk_models.sample_cov(self.prices)
            
#         return self.S
    
#     def optimize_portfolio(
#         self,
#         objective: str = 'max_sharpe',
#         target_return: Optional[float] = None,
#         target_risk: Optional[float] = None,
#         market_neutral: bool = False,
#         weight_bounds: Tuple[float, float] = (0, 1)
#     ) -> Dict:
#         """
#         Optimize the portfolio based on the specified objective.
        
#         Args:
#             objective: 'max_sharpe', 'min_volatility', or 'efficient_risk' or 'efficient_return'
#             target_return: Required if objective is 'efficient_return'
#             target_risk: Required if objective is 'efficient_risk'
#             market_neutral: Whether to allow short positions
#             weight_bounds: Bounds for the weights
            
#         Returns:
#             Dictionary containing optimization results
#         """
#         if self.mu is None:
#             self.calculate_expected_returns()
#         if self.S is None:
#             self.calculate_covariance_matrix()
            
#         # Initialize the efficient frontier
#         self.ef = EfficientFrontier(
#             expected_returns=self.mu,
#             cov_matrix=self.S,
#             weight_bounds=weight_bounds
#         )
        
#         # Add objective to minimize L2 regularization (prevent extreme weights)
#         self.ef.add_objective(
#             objective_functions.L2_reg,
#             gamma=0.1  # Regularization parameter
#         )
        
#         # Optimize based on the objective
#         if objective == 'max_sharpe':
#             weights = self.ef.max_sharpe(risk_free_rate=0.02)
#         elif objective == 'min_volatility':
#             weights = self.ef.min_volatility()
#         elif objective == 'efficient_risk':
#             if target_risk is None:
#                 raise ValueError("target_risk must be specified for efficient_risk optimization")
#             weights = self.ef.efficient_risk(target_risk=target_risk)
#         elif objective == 'efficient_return':
#             if target_return is None:
#                 raise ValueError("target_return must be specified for efficient_return optimization")
#             weights = self.ef.efficient_return(target_return=target_return)
#         else:
#             raise ValueError(f"Unknown optimization objective: {objective}")
        
#         # Clean the weights
#         cleaned_weights = self.ef.clean_weights()
        
#         # Get performance metrics
#         performance = self.ef.portfolio_performance(verbose=True, risk_free_rate=0.02)
        
#         return {
#             'weights': cleaned_weights,
#             'expected_return': performance[0],
#             'volatility': performance[1],
#             'sharpe_ratio': performance[2]
#         }
    
#     def get_discrete_allocation(
#         self,
#         portfolio_value: float = 10000,
#         latest_prices: Optional[pd.Series] = None
#     ) -> Dict:
#         """
#         Convert continuous weights to discrete allocation of shares.
        
#         Args:
#             portfolio_value: Total portfolio value in dollars
#             latest_prices: Latest prices of the assets
            
#         Returns:
#             Dictionary containing allocation details
#         """
#         if self.ef is None:
#             raise ValueError("Must run optimization before discrete allocation")
            
#         if latest_prices is None:
#             latest_prices = get_latest_prices(self.prices)
            
#         da = DiscreteAllocation(
#             self.ef.weights,
#             latest_prices,
#             total_portfolio_value=portfolio_value
#         )
        
#         alloc, leftover = da.lp_portfolio()
        
#         return {
#             'allocation': alloc,
#             'leftover': leftover,
#             'total_value': portfolio_value - leftover,
#             'latest_prices': latest_prices.to_dict()
#         }


# def optimize_portfolio(
#     tickers: List[str],
#     objective: str = 'max_sharpe',
#     target_return: Optional[float] = None,
#     target_risk: Optional[float] = None,
#     market_neutral: bool = False,
#     weight_bounds: Tuple[float, float] = (0, 1),
#     portfolio_value: float = 10000
# ) -> Dict:
#     """
#     High-level function to optimize a portfolio.
    
#     Args:
#         tickers: List of stock tickers
#         objective: Optimization objective
#         target_return: Required for 'efficient_return' objective
#         target_risk: Required for 'efficient_risk' objective
#         market_neutral: Whether to allow short positions
#         weight_bounds: Bounds for the weights
#         portfolio_value: Total portfolio value for discrete allocation
        
#     Returns:
#         Dictionary with optimization results
#     """
#     try:
#         # Initialize the optimizer
#         optimizer = PortfolioOptimizer(tickers)
        
#         # Fetch data
#         prices = optimizer.fetch_historical_data()
        
#         # Run optimization
#         result = optimizer.optimize_portfolio(
#             objective=objective,
#             target_return=target_return,
#             target_risk=target_risk,
#             market_neutral=market_neutral,
#             weight_bounds=weight_bounds
#         )
        
#         # Get discrete allocation
#         allocation = optimizer.get_discrete_allocation(portfolio_value=portfolio_value)
        
#         # Prepare response
#         response = {
#             'status': 'success',
#             'tickers': tickers,
#             'optimization': {
#                 'objective': objective,
#                 'expected_return': result['expected_return'],
#                 'volatility': result['volatility'],
#                 'sharpe_ratio': result['sharpe_ratio'],
#                 'weights': {k: v for k, v in result['weights'].items() if v > 0.001}  # Only include significant weights
#             },
#             'allocation': allocation
#         }
        
#         return response
        
#     except Exception as e:
#         logger.error(f"Portfolio optimization failed: {str(e)}")
#         return {
#             'status': 'error',
#             'message': str(e)
#         }


# import numpy as np
# import pandas as pd
# import yfinance as yf
# import requests
# from pypfopt import EfficientFrontier, HRPOpt
# from pypfopt import risk_models
# from pypfopt import expected_returns
# from pypfopt import objective_functions
# from pypfopt.discrete_allocation import DiscreteAllocation, get_latest_prices
# from datetime import datetime, timedelta
# from typing import Dict, List, Tuple, Optional, Union
# import logging
# import time
# import os
# from dotenv import load_dotenv

# # Load environment variables
# load_dotenv()

# # Set up logging
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
# logger = logging.getLogger(__name__)

# # Configuration
# YAHOO_MAX_RETRIES = 2
# YAHOO_RETRY_DELAY = 2  # seconds
# ALPHA_VANTAGE_API_KEY = os.getenv('ALPHA_VANTAGE_API_KEY', 'demo')  # Get your free API key from https://www.alphavantage.co/

# DEFAULT_RISK_FREE_RATE = 0.02
# MIN_DATA_POINTS_FOR_COVARIANCE = 60 # Require at least ~3 months of data for stable covariance

# class PortfolioOptimizer:
#     def __init__(self,
#                  tickers: List[str],
#                  prices_df: Optional[pd.DataFrame] = None,
#                  predicted_returns: Optional[Dict[str, float]] = None):
#         """
#         Initialize the portfolio optimizer.

#         Args:
#             tickers: List of stock tickers.
#             prices_df: Optional pre-fetched historical price DataFrame (Adj Close).
#             predicted_returns: Optional dictionary of ticker -> predicted annual return (e.g., from an AI model).
#         """
#         if not tickers:
#             raise ValueError("Ticker list cannot be empty.")
#         self.tickers = list(set(tickers)) # Ensure unique tickers
#         self.prices = prices_df
#         self.predicted_returns = pd.Series(predicted_returns) if predicted_returns else None
#         self.mu = None
#         self.S = None
#         self.ef = None
#         self.hrp = None # For Hierarchical Risk Parity

#         if self.predicted_returns is not None:
#             # Ensure predicted returns only contain tickers we are considering
#             self.predicted_returns = self.predicted_returns.reindex(self.tickers).dropna()
#             if self.predicted_returns.empty:
#                 logger.warning("Provided predicted_returns do not match any provided tickers. Will calculate historical returns.")
#                 self.predicted_returns = None
#             else:
#                 missing_preds = set(self.tickers) - set(self.predicted_returns.index)
#                 if missing_preds:
#                     logger.warning(f"Missing predicted returns for: {', '.join(missing_preds)}. They will be excluded from optimization if using predicted returns.")
#                 # Update tickers to only those with predictions if using predicted returns
#                 self.tickers = self.predicted_returns.index.tolist()
#                 logger.info(f"Using provided predicted returns for {len(self.tickers)} tickers.")


#     def fetch_historical_data(self, years: int = 5) -> pd.DataFrame:
#         """Fetch historical adjusted closing price data for the tickers."""
#         if self.prices is not None:
#             logger.info("Using pre-fetched price data.")
#             # Ensure columns match tickers, drop missing columns
#             self.prices = self.prices.reindex(columns=self.tickers).dropna(axis=1, how='all') # Drop cols only if ALL are NaN
#             if self.prices.empty or self.prices.shape[0] < MIN_DATA_POINTS_FOR_COVARIANCE:
#                  raise ValueError(f"Pre-fetched price data is empty or has insufficient rows ({self.prices.shape[0]}) after cleaning for tickers: {', '.join(self.tickers)}")
#             self.tickers = self.prices.columns.tolist() # Update tickers based on available data
#             if not self.tickers:
#                  raise ValueError("No valid tickers remain in pre-fetched price data after cleaning.")
#             logger.info(f"Using pre-fetched data for {len(self.tickers)} tickers.")
#             return self.prices

#     def calculate_expected_returns(self, method: str = 'mean', **kwargs) -> pd.Series:
#         """Calculate expected returns."""
#         # **Added Check:** Ensure prices are available and valid before calculation
#         if self.prices is None or self.prices.empty or self.prices.shape[0] < 2:
#             logger.info("Price data not available or insufficient for expected returns. Attempting to fetch...")
#             self.fetch_historical_data() # This will raise error if it fails
#             if self.prices is None or self.prices.empty or self.prices.shape[0] < 2:
#                  raise ValueError("Price data is still empty or insufficient (less than 2 rows) after fetch attempt, cannot calculate returns.")

#         # Use predicted returns if available and valid
#         if self.predicted_returns is not None and not self.predicted_returns.empty:
#              # Ensure index matches current valid tickers
#             self.mu = self.predicted_returns.reindex(self.tickers).dropna()
#             missing_preds = set(self.tickers) - set(self.mu.index)
#             if missing_preds:
#                  logger.warning(f"Re-checked: Missing predicted returns for {', '.join(missing_preds)}. Excluding them.")
#                  self.tickers = self.mu.index.tolist()
#                  if not self.tickers: raise ValueError("No tickers remaining after aligning predicted returns.")
#                  self.prices = self.prices[self.tickers] # Update prices df as well
#             if self.mu.empty:
#                  logger.warning("Predicted returns became empty after reindexing. Falling back to historical.")
#                  self.predicted_returns = None # Invalidate prediction usage
#             else:
#                 logger.info("Using provided predicted expected returns.")
#                 return self.mu

#         # Fallback to historical calculation
#         logger.info(f"Calculating historical expected returns using method: {method}")
#         returns_data = kwargs.get('returns_data', False) # Check if prices are actually returns
#         freq = kwargs.get('frequency', 252) # Trading days

#         try:
#             # Ensure price data has enough points for the method
#             if self.prices.shape[0] < 2:
#                  raise ValueError(f"Need at least 2 data points for historical returns, found {self.prices.shape[0]}")

#             if method == 'capm':
#                 risk_free_rate = kwargs.get('risk_free_rate', DEFAULT_RISK_FREE_RATE)
#                 self.mu = expected_returns.capm_return(
#                     self.prices, returns_data=returns_data, risk_free_rate=risk_free_rate, frequency=freq
#                 )
#             elif method == 'ema':
#                  # EMA might require a certain number of periods based on span, handle potential errors
#                  try:
#                     self.mu = expected_returns.ema_historical_return(
#                         self.prices, returns_data=returns_data, frequency=freq, span=kwargs.get('span', 20) # Default span added
#                     )
#                  except ValueError as ema_err:
#                      logger.warning(f"EMA calculation failed ('{ema_err}'), falling back to mean historical return.")
#                      self.mu = expected_returns.mean_historical_return(
#                         self.prices, returns_data=returns_data, frequency=freq
#                      )

#             else: # Default to mean historical return
#                 self.mu = expected_returns.mean_historical_return(
#                     self.prices, returns_data=returns_data, frequency=freq
#                 )
#             return self.mu
#         except Exception as e:
#             logger.error(f"Error calculating expected returns with method '{method}': {e}", exc_info=True)
#             raise


#     def calculate_covariance_matrix(self, method: str = 'ledoit_wolf', **kwargs) -> pd.DataFrame:
#         """Calculate the covariance matrix."""
#         # **Added Check:** Ensure prices are available and valid before calculation
#         if self.prices is None or self.prices.empty or self.prices.shape[0] < MIN_DATA_POINTS_FOR_COVARIANCE:
#             logger.info(f"Price data not available or insufficient (needs {MIN_DATA_POINTS_FOR_COVARIANCE} rows) for covariance. Attempting to fetch...")
#             self.fetch_historical_data() # This will raise error if it fails
#             if self.prices is None or self.prices.empty or self.prices.shape[0] < MIN_DATA_POINTS_FOR_COVARIANCE:
#                  raise ValueError(f"Price data is still empty or insufficient (has {self.prices.shape[0]}, needs {MIN_DATA_POINTS_FOR_COVARIANCE} rows) after fetch attempt, cannot calculate covariance.")


#         logger.info(f"Calculating covariance matrix using method: {method}")
#         freq = kwargs.get('frequency', 252)

#         try:
#             # Check for sufficient data points again, specific to covariance needs
#             if self.prices.shape[0] < 2: # Absolute minimum
#                  raise ValueError(f"Need at least 2 data points for covariance, found {self.prices.shape[0]}")
#             if self.prices.shape[0] < self.prices.shape[1] and method == 'sample_cov': # Warn if using sample cov with few data points
#                  logger.warning("Sample covariance matrix may be unstable with more assets than data points.")

#             if method == 'ledoit_wolf':
#                  # Check for minimum required by LedoitWolf specifically if possible (PyPortfolioOpt handles it internally but good to be aware)
#                  if self.prices.shape[0] < 2: # LedoitWolf likely needs at least 2 points
#                       raise ValueError(f"Ledoit-Wolf requires at least 2 data points, found {self.prices.shape[0]}")
#                  shrinkage_target = kwargs.get('shrinkage_target', 'constant_variance')
#                  self.S = risk_models.CovarianceShrinkage(self.prices, frequency=freq).ledoit_wolf(shrinkage_target=shrinkage_target)
#             elif method == 'oracle_approximating':
#                  self.S = risk_models.CovarianceShrinkage(self.prices, frequency=freq).oracle_approximating()
#             elif method == 'exp_cov':
#                 span = kwargs.get('span', 180)
#                 # Ensure span is not larger than data points
#                 effective_span = min(span, self.prices.shape[0] - 1) if self.prices.shape[0] > 1 else 1
#                 if effective_span != span:
#                      logger.warning(f"Span for exp_cov reduced from {span} to {effective_span} due to limited data points.")
#                 if effective_span < 1:
#                      raise ValueError("Not enough data points for exp_cov calculation.")
#                 self.S = risk_models.exp_cov(self.prices, frequency=freq, span=effective_span)
#             else: # Default to sample covariance
#                 self.S = risk_models.sample_cov(self.prices, frequency=freq)

#             # Final check on calculated matrix
#             if self.S.empty or self.S.isnull().values.any():
#                  raise ValueError(f"Calculated covariance matrix is empty or contains NaNs using method '{method}'.")

#             return self.S
#         except ValueError as ve: # Catch specific ValueErrors from risk_models
#              logger.error(f"Value error calculating covariance matrix with method '{method}': {ve}", exc_info=False)
#              # Re-raise with potentially more context if needed, or just re-raise
#              raise ValueError(f"Covariance calculation failed: {ve}")
#         except Exception as e:
#             logger.error(f"Unexpected error calculating covariance matrix with method '{method}': {e}", exc_info=True)
#             raise


#     def _get_returns(self):
#         """Helper to calculate returns if needed."""
#         if self.prices is None or self.prices.empty or self.prices.shape[0] < 2:
#             self.fetch_historical_data()
#         if self.prices is None or self.prices.empty or self.prices.shape[0] < 2:
#              raise ValueError("Insufficient price data to calculate returns.")
#         return expected_returns.returns_from_prices(self.prices)


#     def optimize_portfolio(
#         self,
#         objective: str = 'max_sharpe',
#         target_return: Optional[float] = None,
#         target_risk: Optional[float] = None,
#         market_neutral: bool = False,
#         weight_bounds: Tuple[float, float] = (0, 1),
#         risk_free_rate: float = DEFAULT_RISK_FREE_RATE,
#         gamma: float = 0.1 # L2 regularization factor
#     ) -> Dict:
#         """Optimize the portfolio using Mean-Variance Optimization."""
#         # --- (Existing HRP check remains the same) ---
#         if objective == 'hrp':
#              logger.warning("Objective 'hrp' selected. Switching to Hierarchical Risk Parity optimization.")
#              return self.optimize_hrp()


#         # --- Ensure mu and S are calculated (Calls methods with internal checks) ---
#         try:
#             if self.mu is None:
#                 self.calculate_expected_returns(method='mean' if self.predicted_returns is None else 'predicted')
#             if self.S is None:
#                 self.calculate_covariance_matrix() # Uses default ledoit_wolf
#         except ValueError as e:
#              logger.error(f"Failed to calculate necessary inputs (mu or S): {e}")
#              raise ValueError(f"Prerequisite calculation failed: {e}") # Propagate error

#         # --- (Remaining checks for mu/S emptiness and alignment remain the same) ---
#         if self.mu is None or self.S is None or self.mu.empty or self.S.empty:
#              raise ValueError("Expected returns (mu) or Covariance matrix (S) are missing or empty after calculation attempts.")

#         # Ensure alignment - Critical: Reindex mu based on S's final columns/index
#         valid_tickers_for_S = self.S.index.tolist()
#         self.mu = self.mu.reindex(valid_tickers_for_S)
#         if self.mu.isnull().any():
#              nan_tickers = self.mu[self.mu.isnull()].index.tolist()
#              logger.warning(f"NaNs found in expected returns after aligning to covariance matrix for tickers: {', '.join(nan_tickers)}. Attempting to fill with mean or drop.")
#              # Option 1: Fill with mean of existing mu (might distort optimization)
#              # self.mu = self.mu.fillna(self.mu.mean())
#              # Option 2: Drop these tickers from mu and S (safer)
#              self.mu = self.mu.dropna()
#              valid_tickers_final = self.mu.index.tolist()
#              self.S = self.S.loc[valid_tickers_final, valid_tickers_final]
#              if self.mu.empty or self.S.empty:
#                    raise ValueError("Mismatch between expected returns and covariance matrix indices resulted in empty inputs after attempting to resolve NaNs.")
#              logger.info(f"Proceeding with {len(valid_tickers_final)} tickers after resolving alignment NaNs.")
#              # Update self.tickers if necessary? Or assume optimizer methods handle it.
#              self.tickers = valid_tickers_final


#         # --- (Rest of the optimization logic remains the same) ---
#         logger.info(f"Starting Mean-Variance Optimization for objective: {objective}")

#         # Determine weight bounds based on market_neutral
#         actual_weight_bounds = (-1, 1) if market_neutral else weight_bounds
#         if market_neutral and weight_bounds != (0,1): # Check if user set bounds with market_neutral
#              logger.warning("Market neutral selected, ignoring custom weight_bounds and using (-1, 1).")

#         # Initialize the efficient frontier
#         try:
#             # Use the potentially updated mu and S after alignment check
#             self.ef = EfficientFrontier(
#                 expected_returns=self.mu,
#                 cov_matrix=self.S,
#                 weight_bounds=actual_weight_bounds
#             )
#         except Exception as e:
#              logger.error(f"Error initializing EfficientFrontier: {e}", exc_info=True)
#              raise

#         # Add constraints/objectives
#         if market_neutral:
#             self.ef.add_constraint(lambda w: np.sum(w) == 0) # Sum of weights must be 0
#             logger.info("Market neutral constraint added (sum of weights = 0).")
#         else:
#              # Default is fully invested (sum weights = 1), already handled by EF default
#              pass

#         if gamma > 0:
#             self.ef.add_objective(objective_functions.L2_reg, gamma=gamma)
#             logger.info(f"L2 regularization added with gamma={gamma}.")

#         # Optimize based on the objective
#         try:
#             if objective == 'max_sharpe':
#                 logger.info(f"Optimizing for max Sharpe Ratio (risk-free rate: {risk_free_rate})...")
#                 self.ef.max_sharpe(risk_free_rate=risk_free_rate)
#             elif objective == 'min_volatility':
#                 logger.info("Optimizing for minimum volatility...")
#                 self.ef.min_volatility()
#             elif objective == 'efficient_risk':
#                 if target_risk is None:
#                     raise ValueError("target_risk must be specified for efficient_risk optimization")
#                 logger.info(f"Optimizing for efficient risk (target volatility: {target_risk:.1%})...")
#                 # Add check: Target risk must be feasible (>= min volatility) - PyPortfolioOpt might handle this
#                 min_vola_weights = self.ef.min_volatility() # Need to call this to calculate min vola
#                 min_possible_vola = self.ef.portfolio_performance(verbose=False)[1]
#                 if target_risk < min_possible_vola:
#                      logger.warning(f"Target risk {target_risk:.2%} is lower than minimum possible volatility {min_possible_vola:.2%}. Adjusting target to minimum.")
#                      target_risk = min_possible_vola
#                 self.ef.efficient_risk(target_volatility=target_risk) # Re-init EF might be safer here?
#             elif objective == 'efficient_return':
#                 if target_return is None:
#                     raise ValueError("target_return must be specified for efficient_return optimization")
#                 logger.info(f"Optimizing for efficient return (target return: {target_return:.1%})...")
#                  # Add check: Target return must be feasible (<= max return) - PyPortfolioOpt might handle this
#                 self.ef.max_sharpe() # Need weights to calculate max possible return
#                 max_possible_return = self.ef.portfolio_performance(verbose=False)[0]
#                 # Also check min return from min_volatility portfolio
#                 min_vola_weights = EfficientFrontier(self.mu, self.S, weight_bounds=actual_weight_bounds).min_volatility()
#                 min_possible_return = EfficientFrontier(self.mu, self.S, weight_bounds=actual_weight_bounds).portfolio_performance(weights=min_vola_weights, verbose=False)[0]

#                 if target_return > max_possible_return:
#                     logger.warning(f"Target return {target_return:.2%} is higher than maximum achievable return {max_possible_return:.2%} (from max Sharpe). Capping at max achievable.")
#                     target_return = max_possible_return
#                 elif target_return < min_possible_return:
#                     logger.warning(f"Target return {target_return:.2%} is lower than minimum achievable return {min_possible_return:.2%} (from min volatility). Adjusting target to minimum.")
#                     target_return = min_possible_return

#                 # Re-initialize EF before calling efficient_return as other objectives modify internal state
#                 self.ef = EfficientFrontier(self.mu, self.S, weight_bounds=actual_weight_bounds)
#                 if gamma > 0: self.ef.add_objective(objective_functions.L2_reg, gamma=gamma)
#                 self.ef.efficient_return(target_return=target_return)
#             else:
#                 raise ValueError(f"Unknown Mean-Variance objective: {objective}. Supported: max_sharpe, min_volatility, efficient_risk, efficient_return.")

#             weights = self.ef.weights # Get raw weights first for performance calc
#             cleaned_weights = self.ef.clean_weights() # Then clean them for output

#             # Get performance metrics using the final weights
#             expected_return, volatility, sharpe = self.ef.portfolio_performance(verbose=False, risk_free_rate=risk_free_rate)

#             logger.info(f"Optimization successful. Expected Return: {expected_return:.2%}, Volatility: {volatility:.2%}, Sharpe Ratio: {sharpe:.2f}")

#             return {
#                 'weights': cleaned_weights,
#                 'expected_return': expected_return,
#                 'volatility': volatility,
#                 'sharpe_ratio': sharpe
#             }
#         except ValueError as ve: # Catch specific errors from PyPortfolioOpt optimization methods
#              logger.error(f"Optimization failed for objective '{objective}': {ve}", exc_info=False)
#              raise ValueError(f"Optimization failed: {ve}") # Re-raise
#         except Exception as e:
#             logger.error(f"Unexpected error during portfolio optimization step: {str(e)}", exc_info=True)
#             raise


#     def optimize_hrp(self) -> Dict:
#         """Optimize the portfolio using Hierarchical Risk Parity."""
#         logger.info("Starting Hierarchical Risk Parity (HRP) Optimization...")
#         try:
#              returns = self._get_returns() # Method now ensures sufficient data
#              if returns.empty:
#                   raise ValueError("Returns data is empty, cannot perform HRP.")

#              logger.info(f"Performing HRP on returns data with shape: {returns.shape}")
#              self.hrp = HRPOpt(returns)
#              # Default linkage method is 'single', consider 'ward' or others if needed
#              hrp_weights = self.hrp.optimize(linkage_method='ward') # Using ward linkage
#              # cleaned_weights = self.hrp.clean_weights() # HRPOpt.optimize directly returns clean weights dict

#              # HRP doesn't directly give expected return/volatility like MVO,
#              # but we can calculate them based on the HRP weights and historical/predicted data.
#              # Use the same mu/S calculation methods as MVO for consistency if mu/S exist
#              if self.mu is None: self.calculate_expected_returns()
#              if self.S is None: self.calculate_covariance_matrix()

#              # Ensure hrp_weights align with mu and S
#              aligned_weights = pd.Series(hrp_weights).reindex(self.mu.index).fillna(0).to_dict()

#              expected_return, volatility, sharpe = self._calculate_performance(aligned_weights)

#              logger.info(f"HRP Optimization successful. Est. Return: {expected_return:.2%}, Est. Volatility: {volatility:.2%}, Est. Sharpe Ratio: {sharpe:.2f}")

#              return {
#                  'weights': hrp_weights, # Return the cleaned weights directly from HRP
#                  'expected_return': expected_return,
#                  'volatility': volatility,
#                  'sharpe_ratio': sharpe
#              }
#         except Exception as e:
#              logger.error(f"Error during HRP optimization: {str(e)}", exc_info=True)
#              raise


#     def _calculate_performance(self, weights: Dict, risk_free_rate: float = DEFAULT_RISK_FREE_RATE) -> Tuple[float, float, float]:
#         """Calculate performance metrics for given weights using instance mu and S."""
#         # Ensure mu and S are calculated and valid
#         if self.mu is None:
#              logger.info("Mu not calculated, calculating historical mean for performance estimate.")
#              self.calculate_expected_returns(method='mean')
#         if self.S is None:
#             logger.info("S not calculated, calculating Ledoit-Wolf for performance estimate.")
#             self.calculate_covariance_matrix()
#         if self.mu is None or self.S is None or self.mu.empty or self.S.empty:
#             logger.error("Cannot calculate performance, mu or S is missing/empty.")
#             return np.nan, np.nan, np.nan # Return NaNs if calculation failed

#         # Ensure weights are a pd.Series aligned with mu and S
#         # Use S.index as the definitive index as it reflects available historical data
#         weights_series = pd.Series(weights).reindex(self.S.index).fillna(0)
#         # Realign mu just in case it wasn't aligned before
#         aligned_mu = self.mu.reindex(self.S.index).fillna(0) # Fill potentially missing mu with 0

#         # Use pypfopt helper for safety if available, otherwise manual calc
#         try:
#              # PyPortfolioOpt has portfolio_performance that can take weights
#              # Need an EF instance, create temporary one if needed
#              temp_ef_for_perf = EfficientFrontier(aligned_mu, self.S)
#              # portfolio_performance needs raw weights (numpy array)
#              perf_weights = weights_series.values
#              # Need to handle potential errors if weights don't sum to 1 etc.
#              # This might not be the intended use if weights come from HRP.
#              # Manual calculation is safer here.
#              pass # Skip using ef.portfolio_performance for arbitrary weights

#         except ImportError: # Fallback if EfficientFrontier is not available? Unlikely here.
#              pass

#         # Manual Calculation (Safer for arbitrary weights like HRP)
#         expected_return = np.sum(aligned_mu * weights_series)

#         weights_array = weights_series.values
#         cov_matrix_array = self.S.values
#         # Portfolio variance: w^T * S * w
#         portfolio_variance = weights_array @ cov_matrix_array @ weights_array
#         volatility = np.sqrt(portfolio_variance)

#         # Sharpe Ratio
#         sharpe = (expected_return - risk_free_rate) / volatility if volatility > 1e-9 else 0 # Avoid division by zero

#         return expected_return, volatility, sharpe


#     def get_discrete_allocation(
#         self,
#         weights: Dict, # Use weights from optimization result
#         portfolio_value: float = 10000,
#         short_ratio: Optional[float] = None
#     ) -> Dict:
#         """Convert continuous weights to discrete allocation of shares."""
#         if not weights:
#             logger.warning("Weights dictionary is empty. Returning empty allocation.")
#             return {
#                 'allocation_shares': {}, 'allocation_details': {}, 'leftover_cash': portfolio_value,
#                  'total_allocated_value': 0, 'initial_portfolio_value': portfolio_value, 'latest_prices_used': {}
#             }
#         if portfolio_value <= 0:
#             raise ValueError("Portfolio value must be positive for discrete allocation.")

#         # Fetch latest prices, ensuring they cover the tickers in weights
#         try:
#             logger.info("Fetching latest prices for discrete allocation...")
#             relevant_tickers = list(weights.keys())
#             if not relevant_tickers:
#                  raise ValueError("No tickers found in the weights dictionary.")

#             # Use pypfopt's helper function - it handles fetching robustly
#             latest_prices = get_latest_prices(self.prices if self.prices is not None else relevant_tickers) # Pass prices df if available, else tickers

#              # Drop any tickers for which we couldn't get a latest price
#             latest_prices = latest_prices.dropna()
#             missing_latest_prices = set(relevant_tickers) - set(latest_prices.index)
#             if missing_latest_prices:
#                  logger.warning(f"Could not get latest price for: {', '.join(missing_latest_prices)}. Excluding from discrete allocation.")
#                  weights = {t: w for t, w in weights.items() if t in latest_prices.index}
#                  if not weights:
#                       # If all tickers miss latest prices, return empty allocation
#                       logger.warning("No tickers left with valid latest prices. Returning empty allocation.")
#                       return {
#                            'allocation_shares': {}, 'allocation_details': {}, 'leftover_cash': portfolio_value,
#                            'total_allocated_value': 0, 'initial_portfolio_value': portfolio_value, 'latest_prices_used': {}
#                       }
#                  # Re-normalize weights? DA might handle non-summing weights, but safer to do it.
#                  total_weight = sum(weights.values())
#                  if abs(total_weight - 1.0) > 1e-6 and short_ratio is None: # Only renormalize long-only
#                       logger.info(f"Re-normalizing weights after removing tickers with missing prices (original sum: {total_weight:.4f}).")
#                       weights = {t: w / total_weight for t, w in weights.items()}


#             if latest_prices.empty:
#                  raise ValueError("Could not retrieve latest prices for any included tickers.")

#         except Exception as e:
#             logger.error(f"Error fetching latest prices using get_latest_prices: {str(e)}", exc_info=True)
#             raise ConnectionError(f"Failed to fetch latest prices: {str(e)}")


#         logger.info(f"Calculating discrete allocation for portfolio value: ${portfolio_value:,.2f} using {len(weights)} tickers.")

#         try:
#             # Filter weights again based on available latest_prices *before* passing to DA
#             final_weights = {t: w for t, w in weights.items() if t in latest_prices.index}
#             if not final_weights:
#                  raise ValueError("No valid weights remaining after aligning with latest prices.")

#             da = DiscreteAllocation(
#                 final_weights, # Use filtered weights
#                 latest_prices, # Only contains prices for tickers in final_weights
#                 total_portfolio_value=portfolio_value,
#                 short_ratio=short_ratio
#             )

#             alloc, leftover = da.lp_portfolio()

#             # Calculate allocated value per stock and total
#             allocated_details = {}
#             total_allocated_value = 0
#             for ticker, shares in alloc.items():
#                 price = latest_prices.get(ticker, 0)
#                 value = shares * price
#                 allocated_details[ticker] = {'shares': round(shares, 4), 'latest_price': round(price, 2), 'value': round(value, 2)} # Add rounding
#                 total_allocated_value += value

#             logger.info(f"Discrete allocation successful. Leftover cash: ${leftover:.2f}")

#             # Sort allocation_details by value descending for better presentation
#             sorted_details = dict(sorted(allocated_details.items(), key=lambda item: item[1]['value'], reverse=True))


#             return {
#                 'allocation_shares': alloc, # Shares per ticker {ticker: num_shares}
#                 'allocation_details': sorted_details, # More details per ticker, sorted
#                 'leftover_cash': round(leftover, 2),
#                 'total_allocated_value': round(total_allocated_value, 2),
#                 'initial_portfolio_value': portfolio_value,
#                 'latest_prices_used': {t: round(p, 2) for t, p in latest_prices.to_dict().items()} # Prices used
#             }
#         except Exception as e:
#              logger.error(f"Error during discrete allocation: {str(e)}", exc_info=True)
#              # Provide more specific feedback if possible
#              if "must be positive" in str(e):
#                  raise ValueError(f"Discrete allocation failed: Total portfolio value (${portfolio_value}) might be too small for the given stock prices and weights.")
#              raise ValueError(f"Discrete allocation failed: {str(e)}")


# # --- High-level Function ---

# def run_portfolio_optimization(
#     tickers: List[str],
#     predicted_returns: Optional[Dict[str, float]] = None, # Added for AI integration
#     objective: str = 'max_sharpe',
#     target_return: Optional[float] = None,
#     target_risk: Optional[float] = None,
#     market_neutral: bool = False,
#     weight_bounds: Tuple[float, float] = (0, 1),
#     portfolio_value: float = 10000,
#     risk_free_rate: float = DEFAULT_RISK_FREE_RATE,
#     expected_returns_method: str = 'mean', # Default if no predicted returns
#     covariance_method: str = 'ledoit_wolf'
# ) -> Dict:
#     """
#     High-level function to initialize, optimize, and allocate a portfolio.
#     (Args description remains the same)
#     """
#     optimizer = None # Initialize optimizer variable
#     try:
#         logger.info("--- Starting Portfolio Optimization ---")
#         optimizer = PortfolioOptimizer(tickers, predicted_returns=predicted_returns)

#         # Optimization Step
#         # The optimizer handles fetching/using price data internally now
#         optimization_result = optimizer.optimize_portfolio(
#             objective=objective,
#             target_return=target_return,
#             target_risk=target_risk,
#             market_neutral=market_neutral,
#             weight_bounds=weight_bounds,
#             risk_free_rate=risk_free_rate
#         )

#         # Allocation Step
#         short_ratio = 0.5 if market_neutral else None
#         allocation_result = optimizer.get_discrete_allocation(
#             weights=optimization_result['weights'],
#             portfolio_value=portfolio_value,
#             short_ratio=short_ratio
#         )

#         # Prepare final response
#         response = {
#             'status': 'success',
#             # Use optimizer.tickers which reflects the actual tickers used after data cleaning/alignment
#             'tickers_optimized': optimizer.tickers if optimizer else [],
#             'parameters': {
#                 'initial_tickers': tickers, # Keep track of originally requested tickers
#                 'objective': objective,
#                 'target_return': target_return,
#                 'target_risk': target_risk,
#                 'market_neutral': market_neutral,
#                 'weight_bounds': weight_bounds,
#                 'portfolio_value': portfolio_value,
#                 'risk_free_rate': risk_free_rate,
#                 # Use optimizer state to determine if predictions were actually used
#                 'predicted_returns_used': optimizer.predicted_returns is not None if optimizer else False,
#                 'historical_returns_method': expected_returns_method if not (optimizer and optimizer.predicted_returns is not None) else None,
#                 'covariance_method': covariance_method,
#             },
#             'optimization': {
#                 'expected_annual_return': optimization_result['expected_return'],
#                 'annual_volatility': optimization_result['volatility'],
#                 'sharpe_ratio': optimization_result['sharpe_ratio'],
#                 'weights': {k: v for k, v in optimization_result['weights'].items() if abs(v) > 0.0001} # Clean negligible weights
#             },
#             'allocation': {
#                 'shares_per_ticker': allocation_result['allocation_shares'],
#                 'details_per_ticker': allocation_result['allocation_details'],
#                 'total_allocated_value': allocation_result['total_allocated_value'],
#                 'leftover_cash': allocation_result['leftover_cash'],
#                 'latest_prices_used': allocation_result['latest_prices_used']
#             }
#         }
#         logger.info("--- Portfolio Optimization Finished Successfully ---")
#         return response

#     except (ValueError, ConnectionError) as ve:
#          # Log the specific error type and message
#          error_type = type(ve).__name__
#          logger.error(f"Portfolio optimization failed due to {error_type}: {str(ve)}", exc_info=False) # No need for traceback for expected errors
#          # Store the original exception type/message for the API response
#          return {'status': 'error', 'message': str(ve), 'error_type': error_type}
#     except Exception as e:
#         # Log unexpected errors with full traceback
#         logger.exception("An unexpected error occurred during portfolio optimization.")
#         return {'status': 'error', 'message': f'An unexpected internal error occurred.', 'error_type': type(e).__name__}


# # --- Example Usage (for testing - remains the same) ---
# if __name__ == '__main__':
#     # ... (Keep example usage as is) ...
#     # Example 1: Basic Max Sharpe with historical data
#     test_tickers = ["MSFT", "AAPL", "GOOG", "AMZN", "NVDA", "TSLA", "META", "JPM", "V", "JNJ"]
#     print("\n--- Testing Max Sharpe (Historical) ---")
#     result1 = run_portfolio_optimization(tickers=test_tickers, objective='max_sharpe', portfolio_value=25000)
#     if result1.get('status') == 'success': # Use .get for safer access
#         print(f"Expected Return: {result1['optimization']['expected_annual_return']:.2%}")
#         print(f"Volatility: {result1['optimization']['annual_volatility']:.2%}")
#         print(f"Sharpe Ratio: {result1['optimization']['sharpe_ratio']:.2f}")
#         print("Weights:")
#         for t, w in result1['optimization']['weights'].items(): print(f"  {t}: {w:.2%}")
#         print("Allocation (Shares):")
#         # Use details_per_ticker which includes shares
#         for t, details in result1['allocation']['details_per_ticker'].items(): print(f"  {t}: {details['shares']:.2f}")
#         print(f"Leftover Cash: ${result1['allocation']['leftover_cash']:.2f}")
#     else:
#         print(f"Error: {result1.get('message', 'Unknown error')}")

#     # Example 2: Min Volatility
#     print("\n--- Testing Min Volatility ---")
#     result2 = run_portfolio_optimization(tickers=test_tickers, objective='min_volatility', portfolio_value=50000)
#     if result2.get('status') == 'success':
#         print(f"Expected Return: {result2['optimization']['expected_annual_return']:.2%}")
#         print(f"Volatility: {result2['optimization']['annual_volatility']:.2%}")
#         # ... print other details ...
#     else:
#         print(f"Error: {result2.get('message', 'Unknown error')}")


#     # Example 3: Using Mock Predicted Returns
#     print("\n--- Testing Max Sharpe (Predicted Returns) ---")
#     mock_predictions = {t: np.random.uniform(0.05, 0.25) for t in test_tickers} # Random predictions
#     test_tickers_with_extra = test_tickers + ["NONEXISTENTTICKER"] # Add a bad ticker
#     mock_predictions["XOM"] = 0.10 # Add prediction for XOM initially (not in test_tickers)
#     del mock_predictions["MSFT"] # Remove one prediction

#     result3 = run_portfolio_optimization(
#          tickers=test_tickers_with_extra, # Pass list including bad ticker
#          predicted_returns=mock_predictions, # Pass predictions (missing MSFT, extra XOM)
#          objective='max_sharpe',
#          portfolio_value=10000
#     )
#     if result3.get('status') == 'success':
#         print(f"Using Predicted Returns: {result3['parameters']['predicted_returns_used']}")
#         print("Initial Tickers:", result3['parameters']['initial_tickers'])
#         print("Tickers Actually Optimized:", result3['tickers_optimized'])
#         print(f"Expected Return: {result3['optimization']['expected_annual_return']:.2%}")
#         print(f"Volatility: {result3['optimization']['annual_volatility']:.2%}")
#         print(f"Sharpe Ratio: {result3['optimization']['sharpe_ratio']:.2f}")
#         print("Weights:")
#         for t, w in result3['optimization']['weights'].items(): print(f"  {t}: {w:.2%}")
#     else:
#         print(f"Error: {result3.get('message', 'Unknown error')}")


#     # Example 4: Hierarchical Risk Parity
#     print("\n--- Testing Hierarchical Risk Parity (HRP) ---")
#     result4 = run_portfolio_optimization(tickers=test_tickers, objective='hrp', portfolio_value=10000)
#     if result4.get('status') == 'success':
#          print(f"HRP Estimated Return: {result4['optimization']['expected_annual_return']:.2%}")
#          print(f"HRP Estimated Volatility: {result4['optimization']['annual_volatility']:.2%}")
#          print(f"HRP Estimated Sharpe Ratio: {result4['optimization']['sharpe_ratio']:.2f}")
#          print("HRP Weights:")
#          for t, w in result4['optimization']['weights'].items(): print(f"  {t}: {w:.2%}")
#          # ... print allocation ...
#     else:
#         print(f"Error: {result4.get('message', 'Unknown error')}")

#     # Example 5: Error Case - Insufficient Data
#     print("\n--- Testing Error Case (Insufficient Data) ---")
#     # Use a ticker with very recent IPO or invalid ticker
#     error_tickers = ["INVALIDTICKER", "IPO"] # Assume IPO is a very recent IPO
#     result5 = run_portfolio_optimization(tickers=error_tickers, objective='max_sharpe', portfolio_value=1000)
#     print(result5) # Should show status: error and a relevant message

#     # Example 6: Error Case - Target Risk Too Low
#     print("\n--- Testing Error Case (Target Risk Too Low) ---")
#     result6 = run_portfolio_optimization(tickers=test_tickers, objective='efficient_risk', target_risk=0.01, portfolio_value=1000) # 1% target risk is likely too low
#     print(result6) # Should show status: error or warning and adjust target


# import numpy as np
# import pandas as pd
# import yfinance as yf
# from pypfopt import EfficientFrontier, HRPOpt
# from pypfopt import risk_models
# from pypfopt import expected_returns
# from pypfopt import objective_functions
# from pypfopt.discrete_allocation import DiscreteAllocation, get_latest_prices
# from datetime import datetime, timedelta
# from typing import Dict, List, Tuple, Optional
# import logging

# # Set up logging
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
# logger = logging.getLogger(__name__)

# DEFAULT_RISK_FREE_RATE = 0.02
# MIN_DATA_POINTS_FOR_COVARIANCE = 60 # Require at least ~3 months of data for stable covariance

# class PortfolioOptimizer:
#     def __init__(self,
#                  tickers: List[str],
#                  prices_df: Optional[pd.DataFrame] = None,
#                  predicted_returns: Optional[Dict[str, float]] = None):
#         """
#         Initialize the portfolio optimizer.

#         Args:
#             tickers: List of stock tickers.
#             prices_df: Optional pre-fetched historical price DataFrame (Adj Close).
#             predicted_returns: Optional dictionary of ticker -> predicted annual return (e.g., from an AI model).
#         """
#         if not tickers:
#             raise ValueError("Ticker list cannot be empty.")
#         self.tickers = list(set(tickers)) # Ensure unique tickers
#         self.prices = prices_df
#         self.predicted_returns = pd.Series(predicted_returns) if predicted_returns else None
#         self.mu = None
#         self.S = None
#         self.ef = None
#         self.hrp = None # For Hierarchical Risk Parity

#         if self.predicted_returns is not None:
#             # Ensure predicted returns only contain tickers we are considering
#             self.predicted_returns = self.predicted_returns.reindex(self.tickers).dropna()
#             if self.predicted_returns.empty:
#                 logger.warning("Provided predicted_returns do not match any provided tickers. Will calculate historical returns.")
#                 self.predicted_returns = None
#             else:
#                 missing_preds = set(self.tickers) - set(self.predicted_returns.index)
#                 if missing_preds:
#                     logger.warning(f"Missing predicted returns for: {', '.join(missing_preds)}. They will be excluded from optimization if using predicted returns.")
#                 # Update tickers to only those with predictions if using predicted returns
#                 self.tickers = self.predicted_returns.index.tolist()
#                 logger.info(f"Using provided predicted returns for {len(self.tickers)} tickers.")


#     def fetch_historical_data(self, years: int = 5) -> pd.DataFrame:
#         """Fetch historical adjusted closing price data for the tickers if not already provided."""
#         # --- Corrected Logic ---
#         if self.prices is not None:
#             # Section for handling pre-fetched data
#             logger.info("Using pre-fetched price data.")
#             original_tickers = set(self.tickers)
#             # Ensure columns match tickers, drop missing columns
#             self.prices = self.prices.reindex(columns=self.tickers) # Reindex first
#             self.prices = self.prices.ffill().bfill() # Fill NaNs
#             self.prices = self.prices.dropna(axis=1, how='all') # Drop cols only if ALL are NaN

#             if self.prices.empty or self.prices.shape[0] < MIN_DATA_POINTS_FOR_COVARIANCE:
#                  raise ValueError(f"Pre-fetched price data is empty or has insufficient rows ({self.prices.shape[0]}) after cleaning for tickers: {', '.join(self.tickers)}")

#             self.tickers = self.prices.columns.tolist() # Update tickers based on available data
#             fetched_tickers = set(self.tickers)
#             dropped_tickers = original_tickers - fetched_tickers

#             if dropped_tickers:
#                  logger.warning(f"Pre-fetched data missing or cleaned for: {', '.join(dropped_tickers)}. They will be excluded.")

#             if not self.tickers:
#                  raise ValueError("No valid tickers remain in pre-fetched price data after cleaning.")
#             logger.info(f"Using pre-fetched data for {len(self.tickers)} tickers. Shape: {self.prices.shape}")
#             return self.prices
#         else:
#             # Section for fetching data using yfinance
#             end_date = datetime.now()
#             start_date = end_date - timedelta(days=365.25 * years)

#             if not self.tickers:
#                  raise ValueError("Ticker list is empty, cannot fetch data.")

#             logger.info(f"Fetching {years} years of historical data for {len(self.tickers)} tickers: {', '.join(self.tickers)}...")
#             try:
#                 data = yf.download(
#                     self.tickers,
#                     start=start_date.strftime('%Y-%m-%d'),
#                     end=end_date.strftime('%Y-%m-%d'),
#                     progress=False,
#                     actions=False,
#                     ignore_tz=True,
#                     timeout=30
#                 )

#                 if data.empty:
#                      raise ConnectionError(f"Yahoo Finance returned no data for tickers: {', '.join(self.tickers)}. Check symbols and date range.")

#                 adj_close_data = data.get('Adj Close')

#                 if adj_close_data is None:
#                      if 'Adj Close' in data.columns and len(self.tickers)==1:
#                           adj_close_data = data[['Adj Close']]
#                           adj_close_data.columns = self.tickers
#                      else:
#                         logger.error(f"yf.download response structure unexpected. Columns: {data.columns}. Expected 'Adj Close'.")
#                         raise ConnectionError("Could not find 'Adj Close' data in Yahoo Finance response.")

#                 if isinstance(adj_close_data, pd.Series):
#                      adj_close_data = pd.DataFrame(adj_close_data)
#                      adj_close_data.columns = [adj_close_data.name] if hasattr(adj_close_data, 'name') and adj_close_data.name else self.tickers

#                 if adj_close_data.empty:
#                     raise ValueError("Adj Close data is empty after initial fetch.")

#                 # Data Cleaning (same as in the pre-fetched section)
#                 adj_close_data = adj_close_data.reindex(columns=self.tickers)
#                 cleaned_data = adj_close_data.ffill().bfill()
#                 cleaned_data = cleaned_data.dropna(axis=1, how='all')
#                 cleaned_data = cleaned_data.dropna(axis=0, how='all')

#                 if cleaned_data.empty or cleaned_data.shape[0] < MIN_DATA_POINTS_FOR_COVARIANCE:
#                     raise ValueError(f"Insufficient valid data rows ({cleaned_data.shape[0]}, min required {MIN_DATA_POINTS_FOR_COVARIANCE}) after fetching and cleaning. Check ticker validity and date range.")

#                 original_tickers = set(self.tickers)
#                 fetched_tickers = set(cleaned_data.columns)
#                 dropped_tickers = original_tickers - fetched_tickers

#                 if dropped_tickers:
#                      logger.warning(f"Could not fetch/clean data for: {', '.join(dropped_tickers)}. They will be excluded.")

#                 self.prices = cleaned_data
#                 self.tickers = cleaned_data.columns.tolist()

#                 if not self.tickers:
#                      raise ValueError("No tickers remained after data fetching and cleaning.")

#                 logger.info(f"Successfully fetched and cleaned data for {len(self.tickers)} tickers. Data shape: {self.prices.shape}")
#                 return self.prices

#             except ConnectionError as ce:
#                  logger.error(f"Connection error during yfinance download: {ce}", exc_info=False)
#                  raise ce
#             except ValueError as ve:
#                 logger.error(f"Value error during data processing: {ve}", exc_info=False)
#                 raise ve
#             except Exception as e:
#                 logger.error(f"Unexpected error fetching historical data: {str(e)}", exc_info=True)
#                 raise ConnectionError(f"Failed to download or process data from Yahoo Finance: {str(e)}")
#         # --- End Corrected Logic ---


#     def calculate_expected_returns(self, method: str = 'mean', **kwargs) -> pd.Series:
#         """Calculate expected returns."""
#         # **Added Check:** Ensure prices are available and valid before calculation
#         if self.prices is None or self.prices.empty or self.prices.shape[0] < 2:
#             logger.info("Price data not available or insufficient for expected returns. Attempting to fetch...")
#             self.fetch_historical_data() # This will raise error if it fails
#             if self.prices is None or self.prices.empty or self.prices.shape[0] < 2:
#                  raise ValueError("Price data is still empty or insufficient (less than 2 rows) after fetch attempt, cannot calculate returns.")

#         # Use predicted returns if available and valid
#         if self.predicted_returns is not None and not self.predicted_returns.empty:
#              # Ensure index matches current valid tickers
#             self.mu = self.predicted_returns.reindex(self.tickers).dropna()
#             missing_preds = set(self.tickers) - set(self.mu.index)
#             if missing_preds:
#                  logger.warning(f"Re-checked: Missing predicted returns for {', '.join(missing_preds)}. Excluding them.")
#                  self.tickers = self.mu.index.tolist()
#                  if not self.tickers: raise ValueError("No tickers remaining after aligning predicted returns.")
#                  self.prices = self.prices[self.tickers] # Update prices df as well
#             if self.mu.empty:
#                  logger.warning("Predicted returns became empty after reindexing. Falling back to historical.")
#                  self.predicted_returns = None # Invalidate prediction usage
#             else:
#                 logger.info("Using provided predicted expected returns.")
#                 return self.mu

#         # Fallback to historical calculation
#         logger.info(f"Calculating historical expected returns using method: {method}")
#         returns_data = kwargs.get('returns_data', False) # Check if prices are actually returns
#         freq = kwargs.get('frequency', 252) # Trading days

#         try:
#             # Ensure price data has enough points for the method
#             if self.prices.shape[0] < 2:
#                  raise ValueError(f"Need at least 2 data points for historical returns, found {self.prices.shape[0]}")

#             if method == 'capm':
#                 risk_free_rate = kwargs.get('risk_free_rate', DEFAULT_RISK_FREE_RATE)
#                 self.mu = expected_returns.capm_return(
#                     self.prices, returns_data=returns_data, risk_free_rate=risk_free_rate, frequency=freq
#                 )
#             elif method == 'ema':
#                  # EMA might require a certain number of periods based on span, handle potential errors
#                  try:
#                     self.mu = expected_returns.ema_historical_return(
#                         self.prices, returns_data=returns_data, frequency=freq, span=kwargs.get('span', 20) # Default span added
#                     )
#                  except ValueError as ema_err:
#                      logger.warning(f"EMA calculation failed ('{ema_err}'), falling back to mean historical return.")
#                      self.mu = expected_returns.mean_historical_return(
#                         self.prices, returns_data=returns_data, frequency=freq
#                      )

#             else: # Default to mean historical return
#                 self.mu = expected_returns.mean_historical_return(
#                     self.prices, returns_data=returns_data, frequency=freq
#                 )
#             return self.mu
#         except Exception as e:
#             logger.error(f"Error calculating expected returns with method '{method}': {e}", exc_info=True)
#             raise


#     def calculate_covariance_matrix(self, method: str = 'ledoit_wolf', **kwargs) -> pd.DataFrame:
#         """Calculate the covariance matrix."""
#         # **Added Check:** Ensure prices are available and valid before calculation
#         if self.prices is None or self.prices.empty or self.prices.shape[0] < MIN_DATA_POINTS_FOR_COVARIANCE:
#             logger.info(f"Price data not available or insufficient (needs {MIN_DATA_POINTS_FOR_COVARIANCE} rows) for covariance. Attempting to fetch...")
#             self.fetch_historical_data() # This will raise error if it fails
#             if self.prices is None or self.prices.empty or self.prices.shape[0] < MIN_DATA_POINTS_FOR_COVARIANCE:
#                  raise ValueError(f"Price data is still empty or insufficient (has {self.prices.shape[0]}, needs {MIN_DATA_POINTS_FOR_COVARIANCE} rows) after fetch attempt, cannot calculate covariance.")


#         logger.info(f"Calculating covariance matrix using method: {method}")
#         freq = kwargs.get('frequency', 252)

#         try:
#             # Check for sufficient data points again, specific to covariance needs
#             if self.prices.shape[0] < 2: # Absolute minimum
#                  raise ValueError(f"Need at least 2 data points for covariance, found {self.prices.shape[0]}")
#             if self.prices.shape[0] < self.prices.shape[1] and method == 'sample_cov': # Warn if using sample cov with few data points
#                  logger.warning("Sample covariance matrix may be unstable with more assets than data points.")

#             if method == 'ledoit_wolf':
#                  # Check for minimum required by LedoitWolf specifically if possible (PyPortfolioOpt handles it internally but good to be aware)
#                  if self.prices.shape[0] < 2: # LedoitWolf likely needs at least 2 points
#                       raise ValueError(f"Ledoit-Wolf requires at least 2 data points, found {self.prices.shape[0]}")
#                  shrinkage_target = kwargs.get('shrinkage_target', 'constant_variance')
#                  self.S = risk_models.CovarianceShrinkage(self.prices, frequency=freq).ledoit_wolf(shrinkage_target=shrinkage_target)
#             elif method == 'oracle_approximating':
#                  self.S = risk_models.CovarianceShrinkage(self.prices, frequency=freq).oracle_approximating()
#             elif method == 'exp_cov':
#                 span = kwargs.get('span', 180)
#                 # Ensure span is not larger than data points
#                 effective_span = min(span, self.prices.shape[0] - 1) if self.prices.shape[0] > 1 else 1
#                 if effective_span != span:
#                      logger.warning(f"Span for exp_cov reduced from {span} to {effective_span} due to limited data points.")
#                 if effective_span < 1:
#                      raise ValueError("Not enough data points for exp_cov calculation.")
#                 self.S = risk_models.exp_cov(self.prices, frequency=freq, span=effective_span)
#             else: # Default to sample covariance
#                 self.S = risk_models.sample_cov(self.prices, frequency=freq)

#             # Final check on calculated matrix
#             if self.S.empty or self.S.isnull().values.any():
#                  raise ValueError(f"Calculated covariance matrix is empty or contains NaNs using method '{method}'.")

#             return self.S
#         except ValueError as ve: # Catch specific ValueErrors from risk_models
#              logger.error(f"Value error calculating covariance matrix with method '{method}': {ve}", exc_info=False)
#              # Re-raise with potentially more context if needed, or just re-raise
#              raise ValueError(f"Covariance calculation failed: {ve}")
#         except Exception as e:
#             logger.error(f"Unexpected error calculating covariance matrix with method '{method}': {e}", exc_info=True)
#             raise


#     def _get_returns(self):
#         """Helper to calculate returns if needed."""
#         if self.prices is None or self.prices.empty or self.prices.shape[0] < 2:
#             self.fetch_historical_data()
#         if self.prices is None or self.prices.empty or self.prices.shape[0] < 2:
#              raise ValueError("Insufficient price data to calculate returns.")
#         return expected_returns.returns_from_prices(self.prices)


#     def optimize_portfolio(
#         self,
#         objective: str = 'max_sharpe',
#         target_return: Optional[float] = None,
#         target_risk: Optional[float] = None,
#         market_neutral: bool = False,
#         weight_bounds: Tuple[float, float] = (0, 1),
#         risk_free_rate: float = DEFAULT_RISK_FREE_RATE,
#         gamma: float = 0.1 # L2 regularization factor
#     ) -> Dict:
#         """Optimize the portfolio using Mean-Variance Optimization."""
#         # --- (Existing HRP check remains the same) ---
#         if objective == 'hrp':
#              logger.warning("Objective 'hrp' selected. Switching to Hierarchical Risk Parity optimization.")
#              return self.optimize_hrp()


#         # --- Ensure mu and S are calculated (Calls methods with internal checks) ---
#         try:
#             if self.mu is None:
#                 self.calculate_expected_returns(method='mean' if self.predicted_returns is None else 'predicted')
#             if self.S is None:
#                 self.calculate_covariance_matrix() # Uses default ledoit_wolf
#         except ValueError as e:
#              logger.error(f"Failed to calculate necessary inputs (mu or S): {e}")
#              raise ValueError(f"Prerequisite calculation failed: {e}") # Propagate error

#         # --- (Remaining checks for mu/S emptiness and alignment remain the same) ---
#         if self.mu is None or self.S is None or self.mu.empty or self.S.empty:
#              raise ValueError("Expected returns (mu) or Covariance matrix (S) are missing or empty after calculation attempts.")

#         # Ensure alignment - Critical: Reindex mu based on S's final columns/index
#         valid_tickers_for_S = self.S.index.tolist()
#         self.mu = self.mu.reindex(valid_tickers_for_S)
#         if self.mu.isnull().any():
#              nan_tickers = self.mu[self.mu.isnull()].index.tolist()
#              logger.warning(f"NaNs found in expected returns after aligning to covariance matrix for tickers: {', '.join(nan_tickers)}. Attempting to fill with mean or drop.")
#              # Option 2: Drop these tickers from mu and S (safer)
#              self.mu = self.mu.dropna()
#              valid_tickers_final = self.mu.index.tolist()
#              if not valid_tickers_final: # Check if mu became empty
#                  raise ValueError("Expected returns (mu) became empty after resolving alignment NaNs.")
#              self.S = self.S.loc[valid_tickers_final, valid_tickers_final]
#              if self.mu.empty or self.S.empty:
#                    raise ValueError("Mismatch between expected returns and covariance matrix indices resulted in empty inputs after attempting to resolve NaNs.")
#              logger.info(f"Proceeding with {len(valid_tickers_final)} tickers after resolving alignment NaNs.")
#              self.tickers = valid_tickers_final # Update the main ticker list


#         # --- (Rest of the optimization logic remains the same) ---
#         logger.info(f"Starting Mean-Variance Optimization for objective: {objective} with {len(self.tickers)} tickers.")

#         # Determine weight bounds based on market_neutral
#         actual_weight_bounds = (-1, 1) if market_neutral else weight_bounds
#         if market_neutral and weight_bounds != (0,1): # Check if user set bounds with market_neutral
#              logger.warning("Market neutral selected, ignoring custom weight_bounds and using (-1, 1).")

#         # Initialize the efficient frontier
#         try:
#             # Use the potentially updated mu and S after alignment check
#             self.ef = EfficientFrontier(
#                 expected_returns=self.mu,
#                 cov_matrix=self.S,
#                 weight_bounds=actual_weight_bounds
#             )
#         except Exception as e:
#              logger.error(f"Error initializing EfficientFrontier: {e}", exc_info=True)
#              raise

#         # Add constraints/objectives
#         if market_neutral:
#             self.ef.add_constraint(lambda w: np.sum(w) == 0) # Sum of weights must be 0
#             logger.info("Market neutral constraint added (sum of weights = 0).")
#         # Default constraint (sum=1 for long-only) is handled by PyPortfolioOpt

#         if gamma > 0:
#             try:
#                 self.ef.add_objective(objective_functions.L2_reg, gamma=gamma)
#                 logger.info(f"L2 regularization added with gamma={gamma}.")
#             except Exception as e:
#                 logger.error(f"Failed to add L2 regularization: {e}. Proceeding without it.")


#         # Optimize based on the objective
#         try:
#             target_objective_achieved = False
#             if objective == 'max_sharpe':
#                 logger.info(f"Optimizing for max Sharpe Ratio (risk-free rate: {risk_free_rate})...")
#                 self.ef.max_sharpe(risk_free_rate=risk_free_rate)
#                 target_objective_achieved = True
#             elif objective == 'min_volatility':
#                 logger.info("Optimizing for minimum volatility...")
#                 self.ef.min_volatility()
#                 target_objective_achieved = True
#             elif objective == 'efficient_risk':
#                 if target_risk is None:
#                     raise ValueError("target_risk must be specified for efficient_risk optimization")
#                 logger.info(f"Optimizing for efficient risk (target volatility: {target_risk:.1%})...")
#                 # Calculate min possible volatility first
#                 ef_min_vola_check = EfficientFrontier(self.mu, self.S, weight_bounds=actual_weight_bounds)
#                 ef_min_vola_check.min_volatility()
#                 min_possible_vola = ef_min_vola_check.portfolio_performance(verbose=False)[1]

#                 if target_risk < min_possible_vola - 1e-5: # Allow small tolerance
#                      logger.warning(f"Target risk {target_risk:.3%} is lower than minimum possible volatility {min_possible_vola:.3%}. Optimizing for minimum volatility instead.")
#                      self.ef.min_volatility() # Optimize for min vola if target is unreachable
#                 else:
#                     try:
#                         self.ef.efficient_risk(target_volatility=target_risk)
#                         target_objective_achieved = True
#                     except ValueError as vr_risk: # Catch infeasible target risk error from pypfopt
#                         logger.warning(f"PyPortfolioOpt indicated target risk {target_risk:.3%} might be infeasible ({vr_risk}). Optimizing for minimum volatility instead.")
#                         self.ef.min_volatility() # Fallback to min volatility

#             elif objective == 'efficient_return':
#                 if target_return is None:
#                     raise ValueError("target_return must be specified for efficient_return optimization")
#                 logger.info(f"Optimizing for efficient return (target return: {target_return:.1%})...")
#                 # Calculate max possible return (approximated by max Sharpe's return) & min return
#                 ef_bounds_check = EfficientFrontier(self.mu, self.S, weight_bounds=actual_weight_bounds)
#                 ef_bounds_check.max_sharpe()
#                 max_possible_return = ef_bounds_check.portfolio_performance(verbose=False)[0]
#                 ef_bounds_check_min = EfficientFrontier(self.mu, self.S, weight_bounds=actual_weight_bounds)
#                 ef_bounds_check_min.min_volatility()
#                 min_possible_return = ef_bounds_check_min.portfolio_performance(verbose=False)[0]

#                 if target_return > max_possible_return + 1e-5:
#                     logger.warning(f"Target return {target_return:.3%} is higher than max achievable return {max_possible_return:.3%}. Optimizing for max Sharpe instead.")
#                     self.ef.max_sharpe() # Optimize for max Sharpe if target is unreachable high
#                 elif target_return < min_possible_return - 1e-5:
#                     logger.warning(f"Target return {target_return:.3%} is lower than min achievable return {min_possible_return:.3%}. Optimizing for minimum volatility instead.")
#                     self.ef.min_volatility() # Optimize for min vola if target is unreachable low
#                 else:
#                     try:
#                         # Re-initialize EF before calling efficient_return as other objectives modify internal state? No, pypfopt should handle internal state resetting.
#                         self.ef.efficient_return(target_return=target_return)
#                         target_objective_achieved = True
#                     except ValueError as vr_ret: # Catch infeasible target return error
#                         logger.warning(f"PyPortfolioOpt indicated target return {target_return:.3%} might be infeasible ({vr_ret}). Falling back based on target.")
#                         if target_return >= max_possible_return: self.ef.max_sharpe()
#                         else: self.ef.min_volatility()


#             else:
#                 raise ValueError(f"Unknown Mean-Variance objective: {objective}. Supported: max_sharpe, min_volatility, efficient_risk, efficient_return.")

#             weights = self.ef.weights # Get raw weights first for performance calc
#             cleaned_weights = self.ef.clean_weights(cutoff=1e-4) # Increase cutoff slightly

#             # Get performance metrics using the final weights
#             expected_return, volatility, sharpe = self.ef.portfolio_performance(verbose=False, risk_free_rate=risk_free_rate)

#             # Log if the actual objective wasn't met due to fallbacks
#             if not target_objective_achieved and objective in ['efficient_risk', 'efficient_return']:
#                  logger.warning(f"Original objective '{objective}' was infeasible. Results reflect optimization for a fallback objective (likely min volatility or max sharpe).")


#             logger.info(f"Optimization successful. Objective: {objective}. Est Return: {expected_return:.2%}, Est Volatility: {volatility:.2%}, Est Sharpe: {sharpe:.2f}")

#             # Filter final weights for negligible values before returning
#             final_weights = {k: v for k, v in cleaned_weights.items() if abs(v) > 1e-4}

#             return {
#                 'weights': final_weights,
#                 'expected_return': expected_return,
#                 'volatility': volatility,
#                 'sharpe_ratio': sharpe
#             }
#         except ValueError as ve: # Catch specific errors from PyPortfolioOpt optimization methods
#              logger.error(f"Optimization failed for objective '{objective}': {ve}", exc_info=False)
#              raise ValueError(f"Optimization failed: {ve}") # Re-raise
#         except Exception as e:
#             logger.error(f"Unexpected error during portfolio optimization step: {str(e)}", exc_info=True)
#             raise


#     def optimize_hrp(self) -> Dict:
#         """Optimize the portfolio using Hierarchical Risk Parity."""
#         logger.info("Starting Hierarchical Risk Parity (HRP) Optimization...")
#         try:
#              returns = self._get_returns() # Method now ensures sufficient data
#              if returns.empty or returns.shape[0] < 2: # Need at least 2 returns
#                   raise ValueError(f"Returns data is empty or insufficient (rows={returns.shape[0]}) for HRP.")

#              logger.info(f"Performing HRP on returns data with shape: {returns.shape}")
#              self.hrp = HRPOpt(returns)
#              hrp_weights = self.hrp.optimize(linkage_method='ward')

#              # Calculate performance based on HRP weights
#              expected_return, volatility, sharpe = self._calculate_performance(hrp_weights)

#              logger.info(f"HRP Optimization successful. Est. Return: {expected_return:.2%}, Est. Volatility: {volatility:.2%}, Est. Sharpe Ratio: {sharpe:.2f}")

#              # Clean negligible weights before returning
#              cleaned_weights = {k: v for k, v in hrp_weights.items() if abs(v) > 1e-4}

#              return {
#                  'weights': cleaned_weights,
#                  'expected_return': expected_return,
#                  'volatility': volatility,
#                  'sharpe_ratio': sharpe
#              }
#         except Exception as e:
#              logger.error(f"Error during HRP optimization: {str(e)}", exc_info=True)
#              raise


#     def _calculate_performance(self, weights: Dict, risk_free_rate: float = DEFAULT_RISK_FREE_RATE) -> Tuple[float, float, float]:
#         """Calculate performance metrics for given weights using instance mu and S."""
#         # Ensure mu and S are calculated and valid
#         try:
#             if self.mu is None:
#                 logger.info("Mu not calculated, calculating historical mean for performance estimate.")
#                 self.calculate_expected_returns(method='mean')
#             if self.S is None:
#                 logger.info("S not calculated, calculating Ledoit-Wolf for performance estimate.")
#                 self.calculate_covariance_matrix()
#         except ValueError as e:
#              logger.error(f"Cannot calculate performance, prerequisite mu/S calculation failed: {e}")
#              return np.nan, np.nan, np.nan

#         if self.mu is None or self.S is None or self.mu.empty or self.S.empty:
#             logger.error("Cannot calculate performance, mu or S is missing/empty.")
#             return np.nan, np.nan, np.nan # Return NaNs if calculation failed


#         # Ensure weights align with S (which should be definitive based on historical data)
#         weights_series = pd.Series(weights).reindex(self.S.index).fillna(0)
#         aligned_mu = self.mu.reindex(self.S.index).fillna(0) # Align mu and fill potential NaNs

#         # Manual Calculation (Safer for arbitrary weights like HRP)
#         expected_return = np.sum(aligned_mu * weights_series)

#         weights_array = weights_series.values
#         cov_matrix_array = self.S.values
#         portfolio_variance = weights_array @ cov_matrix_array @ weights_array

#         # Check for near-zero variance
#         if portfolio_variance < 1e-12: # If variance is extremely close to zero
#             volatility = 0.0
#         else:
#             volatility = np.sqrt(portfolio_variance)

#         # Sharpe Ratio
#         sharpe = (expected_return - risk_free_rate) / volatility if volatility > 1e-9 else 0 # Avoid division by zero

#         return expected_return, volatility, sharpe


#     def get_discrete_allocation(
#         self,
#         weights: Dict, # Use weights from optimization result
#         portfolio_value: float = 10000,
#         short_ratio: Optional[float] = None
#     ) -> Dict:
#         """Convert continuous weights to discrete allocation of shares."""
#         # --- (Checks for empty weights and portfolio value remain the same) ---
#         if not weights:
#             logger.warning("Weights dictionary is empty. Returning empty allocation.")
#             return {
#                 'allocation_shares': {}, 'allocation_details': {}, 'leftover_cash': portfolio_value,
#                  'total_allocated_value': 0, 'initial_portfolio_value': portfolio_value, 'latest_prices_used': {}
#             }
#         if portfolio_value <= 0:
#             raise ValueError("Portfolio value must be positive for discrete allocation.")


#         # --- (Fetching latest prices logic remains largely the same, using get_latest_prices) ---
#         try:
#             logger.info("Fetching latest prices for discrete allocation...")
#             relevant_tickers = list(weights.keys())
#             if not relevant_tickers:
#                  raise ValueError("No tickers found in the weights dictionary.")

#             # Use pypfopt's helper function
#             # Pass prices df if available and has recent data, otherwise fetch fresh
#             prices_to_use = None
#             if self.prices is not None and not self.prices.empty:
#                  # Check if the last date in prices is recent enough (e.g., within last 5 days)
#                  last_date = self.prices.index.max()
#                  if (datetime.now() - last_date).days <= 5:
#                       prices_to_use = self.prices
#                       logger.info("Using existing price data frame for latest prices.")

#             # If not using existing df, get_latest_prices will fetch
#             latest_prices = get_latest_prices(prices_to_use if prices_to_use is not None else relevant_tickers)

#              # Drop any tickers for which we couldn't get a latest price
#             latest_prices = latest_prices.dropna()
#             missing_latest_prices = set(relevant_tickers) - set(latest_prices.index)
#             if missing_latest_prices:
#                  logger.warning(f"Could not get latest price for: {', '.join(missing_latest_prices)}. Excluding from discrete allocation.")
#                  weights = {t: w for t, w in weights.items() if t in latest_prices.index}
#                  if not weights:
#                       logger.warning("No tickers left with valid latest prices. Returning empty allocation.")
#                       return {
#                            'allocation_shares': {}, 'allocation_details': {}, 'leftover_cash': portfolio_value,
#                            'total_allocated_value': 0, 'initial_portfolio_value': portfolio_value, 'latest_prices_used': {}
#                       }
#                  # Re-normalize weights if needed (long-only)
#                  total_weight = sum(weights.values())
#                  if abs(total_weight - 1.0) > 1e-6 and short_ratio is None and total_weight != 0 :
#                       logger.info(f"Re-normalizing weights after removing tickers with missing prices (original sum: {total_weight:.4f}).")
#                       weights = {t: w / total_weight for t, w in weights.items()}


#             if latest_prices.empty:
#                  raise ValueError("Could not retrieve latest prices for any included tickers.")

#         except Exception as e:
#             logger.error(f"Error fetching latest prices using get_latest_prices: {str(e)}", exc_info=True)
#             raise ConnectionError(f"Failed to fetch latest prices: {str(e)}")


#         # --- (Discrete Allocation calculation remains the same) ---
#         logger.info(f"Calculating discrete allocation for portfolio value: ${portfolio_value:,.2f} using {len(weights)} tickers.")

#         try:
#             # Filter weights again based on available latest_prices *before* passing to DA
#             final_weights = {t: w for t, w in weights.items() if t in latest_prices.index}
#             if not final_weights:
#                  raise ValueError("No valid weights remaining after aligning with latest prices.")

#             da = DiscreteAllocation(
#                 final_weights, # Use filtered weights
#                 latest_prices.reindex(final_weights.keys()), # Ensure prices align exactly with weights passed
#                 total_portfolio_value=portfolio_value,
#                 short_ratio=short_ratio
#             )

#             alloc, leftover = da.lp_portfolio()

#             # --- (Calculation of allocated_details and sorting remains the same) ---
#             allocated_details = {}
#             total_allocated_value = 0
#             for ticker, shares in alloc.items():
#                 price = latest_prices.get(ticker, 0)
#                 value = shares * price
#                 allocated_details[ticker] = {'shares': round(shares, 4), 'latest_price': round(price, 2), 'value': round(value, 2)} # Add rounding
#                 total_allocated_value += value
#             sorted_details = dict(sorted(allocated_details.items(), key=lambda item: item[1]['value'], reverse=True))


#             logger.info(f"Discrete allocation successful. Leftover cash: ${leftover:.2f}")

#             return {
#                 'allocation_shares': alloc, # Shares per ticker {ticker: num_shares}
#                 'allocation_details': sorted_details, # More details per ticker, sorted
#                 'leftover_cash': round(leftover, 2),
#                 'total_allocated_value': round(total_allocated_value, 2),
#                 'initial_portfolio_value': portfolio_value,
#                 'latest_prices_used': {t: round(p, 2) for t, p in latest_prices.reindex(final_weights.keys()).to_dict().items()} # Prices used
#             }
#         except Exception as e:
#              logger.error(f"Error during discrete allocation: {str(e)}", exc_info=True)
#              if "must be positive" in str(e):
#                  raise ValueError(f"Discrete allocation failed: Total portfolio value (${portfolio_value}) might be too small for the given stock prices and weights.")
#              raise ValueError(f"Discrete allocation failed: {str(e)}")


# # --- High-level Function (remains the same structure) ---

# def run_portfolio_optimization(
#     tickers: List[str],
#     predicted_returns: Optional[Dict[str, float]] = None, # Added for AI integration
#     objective: str = 'max_sharpe',
#     target_return: Optional[float] = None,
#     target_risk: Optional[float] = None,
#     market_neutral: bool = False,
#     weight_bounds: Tuple[float, float] = (0, 1),
#     portfolio_value: float = 10000,
#     risk_free_rate: float = DEFAULT_RISK_FREE_RATE,
#     expected_returns_method: str = 'mean', # Default if no predicted returns
#     covariance_method: str = 'ledoit_wolf'
# ) -> Dict:
#     """
#     High-level function to initialize, optimize, and allocate a portfolio.
#     (Args description remains the same)
#     """
#     optimizer = None # Initialize optimizer variable
#     try:
#         logger.info("--- Starting Portfolio Optimization ---")
#         optimizer = PortfolioOptimizer(tickers, predicted_returns=predicted_returns)

#         # Optimization Step
#         # The optimizer handles fetching/using price data internally now
#         optimization_result = optimizer.optimize_portfolio(
#             objective=objective,
#             target_return=target_return,
#             target_risk=target_risk,
#             market_neutral=market_neutral,
#             weight_bounds=weight_bounds,
#             risk_free_rate=risk_free_rate
#         )

#         # Allocation Step
#         short_ratio = 0.5 if market_neutral else None
#         allocation_result = optimizer.get_discrete_allocation(
#             weights=optimization_result['weights'], # Use weights from optimization
#             portfolio_value=portfolio_value,
#             short_ratio=short_ratio
#         )

#         # Prepare final response
#         response = {
#             'status': 'success',
#             # Use optimizer.tickers which reflects the actual tickers used after data cleaning/alignment
#             'tickers_optimized': optimizer.tickers if optimizer else [],
#             'parameters': {
#                 'initial_tickers': tickers, # Keep track of originally requested tickers
#                 'objective': objective,
#                 'target_return': target_return,
#                 'target_risk': target_risk,
#                 'market_neutral': market_neutral,
#                 'weight_bounds': weight_bounds,
#                 'portfolio_value': portfolio_value,
#                 'risk_free_rate': risk_free_rate,
#                 # Use optimizer state to determine if predictions were actually used
#                 'predicted_returns_used': optimizer.predicted_returns is not None if optimizer else False,
#                 'historical_returns_method': expected_returns_method if not (optimizer and optimizer.predicted_returns is not None) else None,
#                 'covariance_method': covariance_method,
#             },
#             'optimization': {
#                 'expected_annual_return': optimization_result['expected_return'],
#                 'annual_volatility': optimization_result['volatility'],
#                 'sharpe_ratio': optimization_result['sharpe_ratio'],
#                 'weights': {k: v for k, v in optimization_result['weights'].items() if abs(v) > 0.0001} # Clean negligible weights
#             },
#             'allocation': {
#                 'shares_per_ticker': allocation_result['allocation_shares'],
#                 'details_per_ticker': allocation_result['allocation_details'],
#                 'total_allocated_value': allocation_result['total_allocated_value'],
#                 'leftover_cash': allocation_result['leftover_cash'],
#                 'latest_prices_used': allocation_result['latest_prices_used']
#             }
#         }
#         logger.info("--- Portfolio Optimization Finished Successfully ---")
#         return response

#     except (ValueError, ConnectionError) as ve:
#          # Log the specific error type and message
#          error_type = type(ve).__name__
#          logger.error(f"Portfolio optimization failed due to {error_type}: {str(ve)}", exc_info=False) # No need for traceback for expected errors
#          # Store the original exception type/message for the API response
#          return {'status': 'error', 'message': str(ve), 'error_type': error_type}
#     except Exception as e:
#         # Log unexpected errors with full traceback
#         logger.exception("An unexpected error occurred during portfolio optimization.")
#         return {'status': 'error', 'message': f'An unexpected internal error occurred.', 'error_type': type(e).__name__}


# # --- Example Usage (for testing - remains the same) ---
# if __name__ == '__main__':
#     # ... (Keep example usage as is) ...
#     # Example 1: Basic Max Sharpe with historical data
#     test_tickers = ["MSFT", "AAPL", "GOOG", "AMZN", "NVDA", "TSLA", "META", "JPM", "V", "JNJ"]
#     print("\n--- Testing Max Sharpe (Historical) ---")
#     result1 = run_portfolio_optimization(tickers=test_tickers, objective='max_sharpe', portfolio_value=25000)
#     if result1.get('status') == 'success': # Use .get for safer access
#         print(f"Expected Return: {result1['optimization']['expected_annual_return']:.2%}")
#         print(f"Volatility: {result1['optimization']['annual_volatility']:.2%}")
#         print(f"Sharpe Ratio: {result1['optimization']['sharpe_ratio']:.2f}")
#         print("Weights:")
#         for t, w in result1['optimization']['weights'].items(): print(f"  {t}: {w:.2%}")
#         print("Allocation (Shares):")
#         # Use details_per_ticker which includes shares
#         for t, details in result1['allocation']['details_per_ticker'].items(): print(f"  {t}: {details['shares']:.2f}")
#         print(f"Leftover Cash: ${result1['allocation']['leftover_cash']:.2f}")
#     else:
#         print(f"Error: {result1.get('message', 'Unknown error')}")

#     # Example 2: Min Volatility
#     print("\n--- Testing Min Volatility ---")
#     result2 = run_portfolio_optimization(tickers=test_tickers, objective='min_volatility', portfolio_value=50000)
#     if result2.get('status') == 'success':
#         print(f"Expected Return: {result2['optimization']['expected_annual_return']:.2%}")
#         print(f"Volatility: {result2['optimization']['annual_volatility']:.2%}")
#         # ... print other details ...
#     else:
#         print(f"Error: {result2.get('message', 'Unknown error')}")


#     # Example 3: Using Mock Predicted Returns
#     print("\n--- Testing Max Sharpe (Predicted Returns) ---")
#     mock_predictions = {t: np.random.uniform(0.05, 0.25) for t in test_tickers} # Random predictions
#     test_tickers_with_extra = test_tickers + ["NONEXISTENTTICKER"] # Add a bad ticker
#     mock_predictions["XOM"] = 0.10 # Add prediction for XOM initially (not in test_tickers)
#     del mock_predictions["MSFT"] # Remove one prediction

#     result3 = run_portfolio_optimization(
#          tickers=test_tickers_with_extra, # Pass list including bad ticker
#          predicted_returns=mock_predictions, # Pass predictions (missing MSFT, extra XOM)
#          objective='max_sharpe',
#          portfolio_value=10000
#     )
#     if result3.get('status') == 'success':
#         print(f"Using Predicted Returns: {result3['parameters']['predicted_returns_used']}")
#         print("Initial Tickers:", result3['parameters']['initial_tickers'])
#         print("Tickers Actually Optimized:", result3['tickers_optimized'])
#         print(f"Expected Return: {result3['optimization']['expected_annual_return']:.2%}")
#         print(f"Volatility: {result3['optimization']['annual_volatility']:.2%}")
#         print(f"Sharpe Ratio: {result3['optimization']['sharpe_ratio']:.2f}")
#         print("Weights:")
#         for t, w in result3['optimization']['weights'].items(): print(f"  {t}: {w:.2%}")
#     else:
#         print(f"Error: {result3.get('message', 'Unknown error')}")


#     # Example 4: Hierarchical Risk Parity
#     print("\n--- Testing Hierarchical Risk Parity (HRP) ---")
#     result4 = run_portfolio_optimization(tickers=test_tickers, objective='hrp', portfolio_value=10000)
#     if result4.get('status') == 'success':
#          print(f"HRP Estimated Return: {result4['optimization']['expected_annual_return']:.2%}")
#          print(f"HRP Estimated Volatility: {result4['optimization']['annual_volatility']:.2%}")
#          print(f"HRP Estimated Sharpe Ratio: {result4['optimization']['sharpe_ratio']:.2f}")
#          print("HRP Weights:")
#          for t, w in result4['optimization']['weights'].items(): print(f"  {t}: {w:.2%}")
#          # ... print allocation ...
#     else:
#         print(f"Error: {result4.get('message', 'Unknown error')}")

#     # Example 5: Error Case - Insufficient Data
#     print("\n--- Testing Error Case (Insufficient Data) ---")
#     # Use a ticker with very recent IPO or invalid ticker
#     error_tickers = ["INVALIDTICKER", "GME"] # Use a known volatile stock, GME likely has enough data now, maybe use a truly invalid one.
#     result5 = run_portfolio_optimization(tickers=error_tickers, objective='max_sharpe', portfolio_value=1000)
#     print(result5) # Should show status: error and a relevant message

#     # Example 6: Error Case - Target Risk Too Low
#     print("\n--- Testing Error Case (Target Risk Too Low) ---")
#     result6 = run_portfolio_optimization(tickers=test_tickers, objective='efficient_risk', target_risk=0.01, portfolio_value=1000) # 1% target risk is likely too low
#     print(result6) # Should show status: error or warning and adjust target


import numpy as np
import pandas as pd
import yfinance as yf
from pypfopt import EfficientFrontier, HRPOpt
from pypfopt import risk_models
from pypfopt import expected_returns
from pypfopt import objective_functions
from pypfopt.discrete_allocation import DiscreteAllocation, get_latest_prices
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import logging
import time
import requests

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

DEFAULT_RISK_FREE_RATE = 0.02
MIN_DATA_POINTS_FOR_COVARIANCE = 60
YFINANCE_RETRIES = 3
YFINANCE_RETRY_DELAY = 2

class PortfolioOptimizer:
    def __init__(self,
                 tickers: List[str],
                 prices_df: Optional[pd.DataFrame] = None,
                 predicted_returns: Optional[Dict[str, float]] = None):
        """
        Initialize the portfolio optimizer.

        Args:
            tickers: List of stock tickers.
            prices_df: Optional pre-fetched historical price DataFrame (Adj Close).
            predicted_returns: Optional dictionary of ticker -> predicted annual return.
        """
        if not tickers:
            raise ValueError("Ticker list cannot be empty.")
        
        self.tickers = sorted(list(set([str(t).upper() for t in tickers if isinstance(t, str) and t])))
        if not self.tickers:
            raise ValueError("Ticker list is empty after cleaning.")

        self.prices = prices_df
        self.predicted_returns = pd.Series(predicted_returns) if predicted_returns else None
        self.mu = None
        self.S = None
        self.ef = None
        self.hrp = None

        if self.predicted_returns is not None:
            self.predicted_returns.index = self.predicted_returns.index.str.upper()
            self.predicted_returns = self.predicted_returns.reindex(self.tickers).dropna()
            if self.predicted_returns.empty:
                logger.warning("Predicted returns do not match tickers. Will use historical.")
                self.predicted_returns = None
            else:
                missing = set(self.tickers) - set(self.predicted_returns.index)
                if missing:
                    logger.warning(f"Missing predictions for: {', '.join(missing)}")
                self.tickers = self.predicted_returns.index.tolist()
                logger.info(f"Using predicted returns for {len(self.tickers)} tickers.")

    def _fetch_with_requests(self, ticker: str, start_date: str, end_date: str) -> Optional[pd.DataFrame]:
        """Fallback method using requests library to fetch data from Yahoo Finance"""
        try:
            logger.info(f"Trying direct API call for {ticker}...")
            
            # Convert dates to timestamps
            start_ts = int(datetime.strptime(start_date, '%Y-%m-%d').timestamp())
            end_ts = int(datetime.strptime(end_date, '%Y-%m-%d').timestamp())
            
            # Yahoo Finance API endpoint
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
            params = {
                'period1': start_ts,
                'period2': end_ts,
                'interval': '1d',
                'events': 'history'
            }
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            response = requests.get(url, params=params, headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'chart' in data and 'result' in data['chart'] and data['chart']['result']:
                    result = data['chart']['result'][0]
                    
                    if 'timestamp' in result and 'indicators' in result:
                        timestamps = result['timestamp']
                        quotes = result['indicators']['quote'][0]
                        adjclose = result['indicators'].get('adjclose', [{}])[0].get('adjclose', quotes.get('close', []))
                        
                        # Create DataFrame
                        df = pd.DataFrame({
                            'Date': pd.to_datetime(timestamps, unit='s'),
                            'Adj Close': adjclose
                        })
                        df = df.set_index('Date')
                        df = df.dropna()
                        
                        if len(df) > 0:
                            logger.info(f"Successfully fetched {len(df)} rows for {ticker} via requests")
                            return df
            
            return None
            
        except Exception as e:
            logger.warning(f"Requests fallback failed for {ticker}: {e}")
            return None

    def fetch_historical_data(self, years: int = 5) -> pd.DataFrame:
        """Fetch historical data with multiple retry strategies"""
        if self.prices is not None:
            logger.info("Using pre-fetched price data.")
            original_tickers = set(self.tickers)
            self.prices.columns = self.prices.columns.str.upper()
            self.prices = self.prices.reindex(columns=self.tickers)
            self.prices = self.prices.ffill().bfill()
            self.prices = self.prices.dropna(axis=1, how='all')
            self.prices = self.prices.dropna(axis=0, how='all')

            if self.prices.empty or self.prices.shape[0] < MIN_DATA_POINTS_FOR_COVARIANCE:
                raise ValueError(f"Insufficient pre-fetched data: {self.prices.shape[0]} rows")

            self.tickers = self.prices.columns.tolist()
            dropped = original_tickers - set(self.tickers)
            if dropped:
                logger.warning(f"Dropped tickers: {', '.join(dropped)}")

            logger.info(f"Using data for {len(self.tickers)} tickers. Shape: {self.prices.shape}")
            return self.prices

        # Fetch data using yfinance with fallback
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365.25 * years)
        
        start_str = start_date.strftime('%Y-%m-%d')
        end_str = end_date.strftime('%Y-%m-%d')

        logger.info(f"Fetching {years} years of data for {len(self.tickers)} tickers...")

        all_data = {}
        failed_tickers = []

        for ticker in self.tickers:
            success = False
            ticker_data = None
            
            # Try yfinance first
            for attempt in range(YFINANCE_RETRIES):
                try:
                    logger.info(f"Attempt {attempt + 1}/{YFINANCE_RETRIES} for {ticker}...")
                    
                    stock = yf.Ticker(ticker)
                    hist = stock.history(start=start_str, end=end_str, auto_adjust=False)
                    
                    if hist is not None and not hist.empty and 'Close' in hist.columns:
                        # Use adjusted close if available, otherwise close
                        if 'Adj Close' in hist.columns:
                            ticker_data = hist[['Adj Close']].copy()
                            ticker_data.columns = [ticker]
                        else:
                            ticker_data = hist[['Close']].copy()
                            ticker_data.columns = [ticker]
                        
                        ticker_data = ticker_data.ffill().bfill().dropna()
                        
                        if len(ticker_data) >= MIN_DATA_POINTS_FOR_COVARIANCE:
                            all_data[ticker] = ticker_data
                            logger.info(f"✓ Fetched {len(ticker_data)} rows for {ticker}")
                            success = True
                            break
                    
                except Exception as e:
                    logger.warning(f"yfinance attempt {attempt + 1} failed for {ticker}: {e}")
                
                if attempt < YFINANCE_RETRIES - 1:
                    time.sleep(YFINANCE_RETRY_DELAY)
            
            # Try requests fallback if yfinance failed
            if not success:
                logger.info(f"Trying fallback method for {ticker}...")
                fallback_data = self._fetch_with_requests(ticker, start_str, end_str)
                
                if fallback_data is not None and len(fallback_data) >= MIN_DATA_POINTS_FOR_COVARIANCE:
                    fallback_data.columns = [ticker]
                    all_data[ticker] = fallback_data
                    logger.info(f"✓ Fetched {len(fallback_data)} rows for {ticker} via fallback")
                    success = True
            
            if not success:
                logger.error(f"✗ Failed to fetch data for {ticker}")
                failed_tickers.append(ticker)

        if not all_data:
            error_msg = f"Could not fetch data for any tickers. Failed: {', '.join(failed_tickers)}"
            logger.error(error_msg)
            raise ConnectionError(error_msg)

        # Combine all successful ticker data
        self.prices = pd.concat(all_data.values(), axis=1)
        self.prices = self.prices.ffill().bfill()
        self.prices = self.prices.dropna(axis=1, how='all')
        self.prices = self.prices.dropna(axis=0, how='all')

        if self.prices.empty or self.prices.shape[0] < MIN_DATA_POINTS_FOR_COVARIANCE:
            raise ValueError(f"Insufficient data after fetching: {self.prices.shape[0]} rows")

        self.tickers = self.prices.columns.tolist()
        
        if failed_tickers:
            logger.warning(f"Could not fetch data for: {', '.join(failed_tickers)}")

        logger.info(f"Successfully fetched data for {len(self.tickers)} tickers. Shape: {self.prices.shape}")
        return self.prices

    def calculate_expected_returns(self, method: str = 'mean', **kwargs) -> pd.Series:
        """Calculate expected returns"""
        if self.prices is None or self.prices.empty or self.prices.shape[0] < 2:
            logger.info("Fetching price data for expected returns...")
            self.fetch_historical_data()
            if self.prices is None or self.prices.empty or self.prices.shape[0] < 2:
                raise ValueError("Insufficient price data")

        if self.predicted_returns is not None and not self.predicted_returns.empty:
            self.mu = self.predicted_returns.reindex(self.tickers).dropna()
            missing = set(self.tickers) - set(self.mu.index)
            if missing:
                logger.warning(f"Missing predicted returns for: {', '.join(missing)}")
                self.tickers = self.mu.index.tolist()
                if not self.tickers:
                    raise ValueError("No tickers remaining")
                self.prices = self.prices[self.tickers]
            
            if self.mu.empty:
                logger.warning("Predicted returns empty. Using historical.")
                self.predicted_returns = None
            else:
                logger.info("Using predicted returns")
                return self.mu

        logger.info(f"Calculating historical returns: {method}")
        freq = kwargs.get('frequency', 252)

        try:
            if self.prices.shape[0] < 2:
                raise ValueError(f"Need at least 2 data points, have {self.prices.shape[0]}")

            if method == 'capm':
                risk_free_rate = kwargs.get('risk_free_rate', DEFAULT_RISK_FREE_RATE)
                self.mu = expected_returns.capm_return(
                    self.prices, risk_free_rate=risk_free_rate, frequency=freq
                )
            elif method == 'ema':
                try:
                    self.mu = expected_returns.ema_historical_return(
                        self.prices, frequency=freq, span=kwargs.get('span', 20)
                    )
                except ValueError as e:
                    logger.warning(f"EMA failed ({e}), using mean")
                    self.mu = expected_returns.mean_historical_return(self.prices, frequency=freq)
            else:
                self.mu = expected_returns.mean_historical_return(self.prices, frequency=freq)
            
            return self.mu
        except Exception as e:
            logger.error(f"Error calculating returns: {e}", exc_info=True)
            raise

    def calculate_covariance_matrix(self, method: str = 'ledoit_wolf', **kwargs) -> pd.DataFrame:
        """Calculate covariance matrix"""
        if self.prices is None or self.prices.empty or self.prices.shape[0] < MIN_DATA_POINTS_FOR_COVARIANCE:
            logger.info(f"Fetching price data for covariance (need {MIN_DATA_POINTS_FOR_COVARIANCE} rows)...")
            self.fetch_historical_data()
            if self.prices is None or self.prices.empty or self.prices.shape[0] < MIN_DATA_POINTS_FOR_COVARIANCE:
                raise ValueError(f"Insufficient data: {self.prices.shape[0]} rows")

        logger.info(f"Calculating covariance: {method}")
        freq = kwargs.get('frequency', 252)

        try:
            if self.prices.shape[0] < 2:
                raise ValueError(f"Need at least 2 data points, have {self.prices.shape[0]}")

            if method == 'ledoit_wolf':
                shrinkage_target = kwargs.get('shrinkage_target', 'constant_variance')
                self.S = risk_models.CovarianceShrinkage(
                    self.prices, frequency=freq
                ).ledoit_wolf(shrinkage_target=shrinkage_target)
            elif method == 'oracle_approximating':
                self.S = risk_models.CovarianceShrinkage(
                    self.prices, frequency=freq
                ).oracle_approximating()
            elif method == 'exp_cov':
                span = kwargs.get('span', 180)
                effective_span = min(span, self.prices.shape[0] - 1)
                if effective_span != span:
                    logger.warning(f"Reduced span from {span} to {effective_span}")
                self.S = risk_models.exp_cov(self.prices, frequency=freq, span=effective_span)
            else:
                self.S = risk_models.sample_cov(self.prices, frequency=freq)

            if self.S.empty or self.S.isnull().values.any():
                raise ValueError(f"Covariance matrix is empty or has NaNs")

            return self.S
        except Exception as e:
            logger.error(f"Error calculating covariance: {e}", exc_info=True)
            raise

    def _get_returns(self):
        """Helper to get returns"""
        if self.prices is None or self.prices.empty or self.prices.shape[0] < 2:
            self.fetch_historical_data()
        if self.prices is None or self.prices.empty or self.prices.shape[0] < 2:
            raise ValueError("Insufficient price data for returns")
        return expected_returns.returns_from_prices(self.prices)

    def optimize_portfolio(
        self,
        objective: str = 'max_sharpe',
        target_return: Optional[float] = None,
        target_risk: Optional[float] = None,
        market_neutral: bool = False,
        weight_bounds: Tuple[float, float] = (0, 1),
        risk_free_rate: float = DEFAULT_RISK_FREE_RATE,
        gamma: float = 0.1
    ) -> Dict:
        """Optimize portfolio"""
        if objective == 'hrp':
            logger.warning("Using HRP optimization")
            return self.optimize_hrp()

        try:
            if self.mu is None:
                self.calculate_expected_returns()
            if self.S is None:
                self.calculate_covariance_matrix()
        except ValueError as e:
            logger.error(f"Failed to calculate inputs: {e}")
            raise

        if self.mu is None or self.S is None or self.mu.empty or self.S.empty:
            raise ValueError("Missing expected returns or covariance matrix")

        valid_tickers = self.S.index.tolist()
        self.mu = self.mu.reindex(valid_tickers)
        
        if self.mu.isnull().any():
            nan_tickers = self.mu[self.mu.isnull()].index.tolist()
            logger.warning(f"Dropping NaN tickers: {', '.join(nan_tickers)}")
            self.mu = self.mu.dropna()
            valid_tickers = self.mu.index.tolist()
            if not valid_tickers:
                raise ValueError("No valid tickers after removing NaNs")
            self.S = self.S.loc[valid_tickers, valid_tickers]
            self.tickers = valid_tickers

        logger.info(f"Optimizing for {objective} with {len(self.tickers)} tickers")
        
        actual_bounds = (-1, 1) if market_neutral else weight_bounds

        try:
            self.ef = EfficientFrontier(
                expected_returns=self.mu,
                cov_matrix=self.S,
                weight_bounds=actual_bounds
            )
        except Exception as e:
            logger.error(f"Error initializing optimizer: {e}")
            raise

        if market_neutral:
            self.ef.add_constraint(lambda w: np.sum(w) == 0)
            logger.info("Added market neutral constraint")

        if gamma > 0:
            try:
                self.ef.add_objective(objective_functions.L2_reg, gamma=gamma)
                logger.info(f"Added L2 regularization (gamma={gamma})")
            except Exception as e:
                logger.warning(f"Failed to add L2 regularization: {e}")

        try:
            if objective == 'max_sharpe':
                self.ef.max_sharpe(risk_free_rate=risk_free_rate)
            elif objective == 'min_volatility':
                self.ef.min_volatility()
            elif objective == 'efficient_risk':
                if target_risk is None:
                    raise ValueError("target_risk required")
                self.ef.efficient_risk(target_volatility=target_risk)
            elif objective == 'efficient_return':
                if target_return is None:
                    raise ValueError("target_return required")
                self.ef.efficient_return(target_return=target_return)
            else:
                raise ValueError(f"Unknown objective: {objective}")

            weights = self.ef.weights
            cleaned_weights = self.ef.clean_weights(cutoff=1e-4)
            expected_return, volatility, sharpe = self.ef.portfolio_performance(
                verbose=False, risk_free_rate=risk_free_rate
            )
            
            logger.info(f"Optimization successful. Return: {expected_return:.2%}, Vol: {volatility:.2%}, Sharpe: {sharpe:.2f}")
            
            final_weights = {k: v for k, v in cleaned_weights.items() if abs(v) > 1e-4}
            return {
                'weights': final_weights,
                'expected_return': expected_return,
                'volatility': volatility,
                'sharpe_ratio': sharpe
            }
        except Exception as e:
            logger.error(f"Optimization failed: {e}", exc_info=True)
            raise

    def optimize_hrp(self) -> Dict:
        """HRP optimization"""
        logger.info("Starting HRP optimization...")
        try:
            returns = self._get_returns()
            if returns.empty or returns.shape[0] < 2:
                raise ValueError(f"Insufficient returns data: {returns.shape[0]} rows")

            logger.info(f"HRP on returns shape: {returns.shape}")
            self.hrp = HRPOpt(returns)
            hrp_weights = self.hrp.optimize(linkage_method='ward')

            expected_return, volatility, sharpe = self._calculate_performance(hrp_weights)

            logger.info(f"HRP complete. Return: {expected_return:.2%}, Vol: {volatility:.2%}, Sharpe: {sharpe:.2f}")
            
            cleaned_weights = {k: v for k, v in hrp_weights.items() if abs(v) > 1e-4}
            return {
                'weights': cleaned_weights,
                'expected_return': expected_return,
                'volatility': volatility,
                'sharpe_ratio': sharpe
            }
        except Exception as e:
            logger.error(f"HRP optimization failed: {e}", exc_info=True)
            raise

    def _calculate_performance(self, weights: Dict, risk_free_rate: float = DEFAULT_RISK_FREE_RATE) -> Tuple[float, float, float]:
        """Calculate portfolio performance"""
        try:
            if self.mu is None:
                self.calculate_expected_returns()
            if self.S is None:
                self.calculate_covariance_matrix()
        except ValueError as e:
            logger.error(f"Cannot calculate performance: {e}")
            return np.nan, np.nan, np.nan
        
        if self.mu is None or self.S is None or self.mu.empty or self.S.empty:
            logger.error("Missing mu or S")
            return np.nan, np.nan, np.nan

        weights_series = pd.Series(weights).reindex(self.S.index).fillna(0)
        aligned_mu = self.mu.reindex(self.S.index).fillna(0)
        
        expected_return = np.sum(aligned_mu * weights_series)
        portfolio_variance = weights_series.values @ self.S.values @ weights_series.values
        volatility = np.sqrt(portfolio_variance) if portfolio_variance >= 1e-12 else 0.0
        sharpe = (expected_return - risk_free_rate) / volatility if volatility > 1e-9 else 0
        
        return expected_return, volatility, sharpe

    def get_discrete_allocation(
        self,
        weights: Dict,
        portfolio_value: float = 10000,
        short_ratio: Optional[float] = None
    ) -> Dict:
        """Convert weights to discrete shares"""
        if not weights:
            logger.warning("Empty weights")
            return {
                'allocation_shares': {},
                'allocation_details': {},
                'leftover_cash': portfolio_value,
                'total_allocated_value': 0,
                'initial_portfolio_value': portfolio_value,
                'latest_prices_used': {}
            }
        
        if portfolio_value <= 0:
            raise ValueError("Portfolio value must be positive")

        try:
            logger.info("Fetching latest prices for discrete allocation...")
            relevant_tickers = list(weights.keys())
            
            if not relevant_tickers:
                raise ValueError("No tickers in weights")
            
            # Try to get latest prices
            prices_to_use = None
            if self.prices is not None and not self.prices.empty:
                if (datetime.now() - self.prices.index.max()).days <= 5:
                    prices_to_use = self.prices
                    logger.info("Using existing prices for latest")
            
            latest_prices = get_latest_prices(
                prices_to_use if prices_to_use is not None else relevant_tickers
            )
            latest_prices = latest_prices.dropna()
            
            missing = set(relevant_tickers) - set(latest_prices.index)
            if missing:
                logger.warning(f"Missing latest prices for: {', '.join(missing)}")
                weights = {t: w for t, w in weights.items() if t in latest_prices.index}
                
                if not weights:
                    logger.warning("No tickers left after price filter")
                    return {
                        'allocation_shares': {},
                        'allocation_details': {},
                        'leftover_cash': portfolio_value,
                        'total_allocated_value': 0,
                        'initial_portfolio_value': portfolio_value,
                        'latest_prices_used': {}
                    }
                
                total_weight = sum(weights.values())
                if abs(total_weight - 1.0) > 1e-6 and short_ratio is None and total_weight != 0:
                    logger.info(f"Re-normalizing weights (sum: {total_weight:.4f})")
                    weights = {t: w / total_weight for t, w in weights.items()}
            
            if latest_prices.empty:
                raise ValueError("Could not get latest prices")
                
        except Exception as e:
            logger.error(f"Error fetching latest prices: {e}", exc_info=True)
            raise ConnectionError(f"Failed to fetch latest prices: {e}")

        logger.info(f"Calculating discrete allocation for ${portfolio_value:,.2f}")
        
        try:
            final_weights = {t: w for t, w in weights.items() if t in latest_prices.index}
            if not final_weights:
                raise ValueError("No valid weights after price alignment")
            
            da = DiscreteAllocation(
                final_weights,
                latest_prices.reindex(final_weights.keys()),
                total_portfolio_value=portfolio_value,
                short_ratio=short_ratio
            )
            alloc, leftover = da.lp_portfolio()
            
            allocated_details = {}
            total_allocated = 0
            
            for ticker, shares in alloc.items():
                price = latest_prices.get(ticker, 0)
                value = shares * price
                allocated_details[ticker] = {
                    'shares': round(shares, 4),
                    'latest_price': round(price, 2),
                    'value': round(value, 2)
                }
                total_allocated += value
            
            sorted_details = dict(sorted(
                allocated_details.items(),
                key=lambda item: item[1]['value'],
                reverse=True
            ))
            
            logger.info(f"Discrete allocation complete. Leftover: ${leftover:.2f}")
            
            return {
                'allocation_shares': alloc,
                'allocation_details': sorted_details,
                'leftover_cash': round(leftover, 2),
                'total_allocated_value': round(total_allocated, 2),
                'initial_portfolio_value': portfolio_value,
                'latest_prices_used': {
                    t: round(p, 2)
                    for t, p in latest_prices.reindex(final_weights.keys()).to_dict().items()
                }
            }
        except Exception as e:
            logger.error(f"Error during discrete allocation: {e}", exc_info=True)
            raise ValueError(f"Discrete allocation failed: {e}")


def run_portfolio_optimization(
    tickers: List[str],
    predicted_returns: Optional[Dict[str, float]] = None,
    objective: str = 'max_sharpe',
    target_return: Optional[float] = None,
    target_risk: Optional[float] = None,
    market_neutral: bool = False,
    weight_bounds: Tuple[float, float] = (0, 1),
    portfolio_value: float = 10000,
    risk_free_rate: float = DEFAULT_RISK_FREE_RATE,
    expected_returns_method: str = 'mean',
    covariance_method: str = 'ledoit_wolf'
) -> Dict:
    """High-level portfolio optimization function"""
    optimizer = None
    try:
        logger.info("--- Starting Portfolio Optimization ---")
        optimizer = PortfolioOptimizer(tickers, predicted_returns=predicted_returns)
        
        optimization_result = optimizer.optimize_portfolio(
            objective=objective,
            target_return=target_return,
            target_risk=target_risk,
            market_neutral=market_neutral,
            weight_bounds=weight_bounds,
            risk_free_rate=risk_free_rate
        )
        
        short_ratio = 0.5 if market_neutral else None
        allocation_result = optimizer.get_discrete_allocation(
            weights=optimization_result['weights'],
            portfolio_value=portfolio_value,
            short_ratio=short_ratio
        )
        
        response = {
            'status': 'success',
            'tickers_optimized': optimizer.tickers if optimizer else [],
            'parameters': {
                'initial_tickers': tickers,
                'objective': objective,
                'target_return': target_return,
                'target_risk': target_risk,
                'market_neutral': market_neutral,
                'weight_bounds': weight_bounds,
                'portfolio_value': portfolio_value,
                'risk_free_rate': risk_free_rate,
                'predicted_returns_used': optimizer.predicted_returns is not None if optimizer else False,
                'historical_returns_method': expected_returns_method if not (optimizer and optimizer.predicted_returns is not None) else None,
                'covariance_method': covariance_method
            },
            'optimization': {
                'expected_annual_return': optimization_result['expected_return'],
                'annual_volatility': optimization_result['volatility'],
                'sharpe_ratio': optimization_result['sharpe_ratio'],
                'weights': {k: v for k, v in optimization_result['weights'].items() if abs(v) > 0.0001}
            },
            'allocation': {
                'shares_per_ticker': allocation_result['allocation_shares'],
                'details_per_ticker': allocation_result['allocation_details'],
                'total_allocated_value': allocation_result['total_allocated_value'],
                'leftover_cash': allocation_result['leftover_cash'],
                'latest_prices_used': allocation_result['latest_prices_used']
            }
        }
        
        logger.info("--- Portfolio Optimization Finished Successfully ---")
        return response
        
    except (ValueError, ConnectionError) as ve:
        error_type = type(ve).__name__
        logger.error(f"Portfolio optimization failed ({error_type}): {str(ve)}", exc_info=False)
        return {
            'status': 'error',
            'message': str(ve),
            'error_type': error_type
        }
    except Exception as e:
        logger.exception("Unexpected error during portfolio optimization")
        return {
            'status': 'error',
            'message': 'An unexpected internal error occurred.',
            'error_type': type(e).__name__
        }


if __name__ == '__main__':
    test_tickers = ["MSFT", "AAPL", "GOOG", "AMZN", "NVDA"]
    print("\n--- Testing Max Sharpe ---")
    result = run_portfolio_optimization(
        tickers=test_tickers,
        objective='max_sharpe',
        portfolio_value=25000
    )
    
    if result.get('status') == 'success':
        print(f"✓ Sharpe Ratio: {result['optimization']['sharpe_ratio']:.2f}")
        print(f"✓ Expected Return: {result['optimization']['expected_annual_return']:.2%}")
        print(f"✓ Volatility: {result['optimization']['annual_volatility']:.2%}")
        print(f"✓ Weights: {result['optimization']['weights']}")
    else:
        print(f"✗ Error: {result.get('message')}")