# from flask import Blueprint, request, jsonify
# from portfolio_optimizer import optimize_portfolio
# import logging

# # Set up logging
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# # Create Blueprint
# optimization_bp = Blueprint('optimization', __name__)

# @optimization_bp.route('/optimize', methods=['POST'])
# def optimize():
#     """
#     Optimize a portfolio based on the provided tickers and optimization parameters.
    
#     Request body should be a JSON object with the following fields:
#     - tickers: List of stock tickers (required)
#     - objective: Optimization objective (default: 'max_sharpe')
#     - target_return: Required for 'efficient_return' objective
#     - target_risk: Required for 'efficient_risk' objective
#     - market_neutral: Whether to allow short positions (default: false)
#     - weight_bounds: Tuple of (min, max) weight bounds (default: [0, 1])
#     - portfolio_value: Total portfolio value for discrete allocation (default: 10000)
#     """
#     try:
#         data = request.get_json()
        
#         # Validate required fields
#         if not data or 'tickers' not in data or not data['tickers']:
#             return jsonify({
#                 'status': 'error',
#                 'message': 'At least one ticker is required'
#             }), 400
            
#         # Extract parameters with defaults
#         tickers = data['tickers']
#         objective = data.get('objective', 'max_sharpe')
#         target_return = data.get('target_return')
#         target_risk = data.get('target_risk')
#         market_neutral = data.get('market_neutral', False)
#         weight_bounds = data.get('weight_bounds', (0, 1))
#         portfolio_value = data.get('portfolio_value', 10000)
        
#         # Log the optimization request
#         logger.info(f"Optimization request: {len(tickers)} tickers, objective={objective}")
        
#         # Run the optimization
#         result = optimize_portfolio(
#             tickers=tickers,
#             objective=objective,
#             target_return=target_return,
#             target_risk=target_risk,
#             market_neutral=market_neutral,
#             weight_bounds=weight_bounds,
#             portfolio_value=portfolio_value
#         )
        
#         if result['status'] == 'error':
#             return jsonify(result), 400
            
#         return jsonify(result)
        
#     except Exception as e:
#         logger.error(f"Error in optimization endpoint: {str(e)}")
#         return jsonify({
#             'status': 'error',
#             'message': f'Failed to optimize portfolio: {str(e)}'
#         }), 500


from flask import Blueprint, request, jsonify
# Assuming portfolio_optimizer.py is in the same directory or accessible via Python path
from portfolio_optimizer import run_portfolio_optimization
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create Blueprint
optimization_bp = Blueprint('optimization', __name__, url_prefix='/api/portfolio') # Added URL prefix

@optimization_bp.route('/optimize', methods=['POST'])
def optimize():
    """
    Endpoint to optimize a portfolio based on provided parameters.

    Request JSON Body Schema:
    {
        "tickers": ["AAPL", "MSFT", ...],                  // Required: List of strings
        "predicted_returns": {"AAPL": 0.15, ...},          // Optional: Dictionary string -> float
        "objective": "max_sharpe" | "min_volatility" |     // Optional: string, default 'max_sharpe'
                     "efficient_risk" | "efficient_return" | "hrp",
        "target_return": 0.20,                             // Optional: float (required for efficient_return)
        "target_risk": 0.15,                               // Optional: float (required for efficient_risk)
        "market_neutral": false,                           // Optional: boolean, default false
        "weight_bounds": [0, 1],                           // Optional: List/Tuple [min, max], default [0, 1]
        "portfolio_value": 10000,                          // Optional: float, default 10000
        "risk_free_rate": 0.02,                            // Optional: float, default 0.02
        "expected_returns_method": "mean" | "capm" | "ema",// Optional: string, default 'mean' (used if predicted_returns is missing/invalid)
        "covariance_method": "ledoit_wolf" | "sample_cov" | // Optional: string, default 'ledoit_wolf'
                             "exp_cov" | "oracle_approximating"
    }

    Returns:
        JSON response with optimization results or error details.
    """
    try:
        data = request.get_json()

        # --- Basic Validation ---
        if not data:
            return jsonify({'status': 'error', 'message': 'Request body must be JSON.'}), 400

        tickers = data.get('tickers')
        if not tickers or not isinstance(tickers, list) or len(tickers) == 0:
            return jsonify({'status': 'error', 'message': '`tickers` array is required and cannot be empty.'}), 400
        if not all(isinstance(t, str) for t in tickers):
             return jsonify({'status': 'error', 'message': 'All items in `tickers` must be strings.'}), 400

        # --- Extract Parameters with Defaults & Type Checking ---
        predicted_returns = data.get('predicted_returns')
        objective = data.get('objective', 'max_sharpe')
        target_return = data.get('target_return')
        target_risk = data.get('target_risk')
        market_neutral = data.get('market_neutral', False)
        weight_bounds_input = data.get('weight_bounds', [0, 1]) # Accept list or tuple
        portfolio_value = data.get('portfolio_value', 10000)
        risk_free_rate = data.get('risk_free_rate', 0.02)
        expected_returns_method = data.get('expected_returns_method', 'mean')
        covariance_method = data.get('covariance_method', 'ledoit_wolf')

        # --- More Specific Validation ---
        if predicted_returns is not None and not isinstance(predicted_returns, dict):
             return jsonify({'status': 'error', 'message': '`predicted_returns` must be a dictionary (object) if provided.'}), 400
        if not isinstance(objective, str):
             return jsonify({'status': 'error', 'message': '`objective` must be a string.'}), 400
        if objective == 'efficient_return' and (target_return is None or not isinstance(target_return, (int, float))):
            return jsonify({'status': 'error', 'message': '`target_return` (number) is required for efficient_return objective.'}), 400
        if objective == 'efficient_risk' and (target_risk is None or not isinstance(target_risk, (int, float))):
             return jsonify({'status': 'error', 'message': '`target_risk` (number) is required for efficient_risk objective.'}), 400
        if not isinstance(market_neutral, bool):
             return jsonify({'status': 'error', 'message': '`market_neutral` must be a boolean.'}), 400
        if not isinstance(weight_bounds_input, (list, tuple)) or len(weight_bounds_input) != 2 or not all(isinstance(v, (int, float)) for v in weight_bounds_input):
             return jsonify({'status': 'error', 'message': '`weight_bounds` must be an array/tuple of two numbers [min, max].'}), 400
        weight_bounds = tuple(weight_bounds_input) # Convert to tuple for PyPortfolioOpt
        if not isinstance(portfolio_value, (int, float)) or portfolio_value <= 0:
             return jsonify({'status': 'error', 'message': '`portfolio_value` must be a positive number.'}), 400
        if not isinstance(risk_free_rate, (int, float)):
             return jsonify({'status': 'error', 'message': '`risk_free_rate` must be a number.'}), 400
        # Add validation for method strings if needed

        # Log the request details
        logger.info(f"Received optimization request for tickers: {', '.join(tickers)}. Objective: {objective}. Predicted returns provided: {'Yes' if predicted_returns else 'No'}.")

        # --- Run Optimization ---
        result = run_portfolio_optimization(
            tickers=tickers,
            predicted_returns=predicted_returns,
            objective=objective,
            target_return=target_return,
            target_risk=target_risk,
            market_neutral=market_neutral,
            weight_bounds=weight_bounds,
            portfolio_value=portfolio_value,
            risk_free_rate=risk_free_rate,
            expected_returns_method=expected_returns_method,
            covariance_method=covariance_method
        )

        # --- Handle Response ---
        if result.get('status') == 'error':
             # Use 400 for input/validation errors, 500 for unexpected internal errors
             status_code = 400 if isinstance(result.get('original_exception'), (ValueError, ConnectionError)) else 500
             return jsonify(result), status_code
        else:
            return jsonify(result), 200 # OK status

    except Exception as e:
        logger.exception("An unexpected error occurred in the /optimize endpoint.") # Logs traceback
        return jsonify({'status': 'error', 'message': f'An internal server error occurred: {str(e)}'}), 500

# You would register this blueprint in your main Flask app:
# from flask import Flask
# from optimization_api import optimization_bp
#
# app = Flask(__name__)
# app.register_blueprint(optimization_bp)
#
# if __name__ == '__main__':
#     app.run(debug=True) # debug=False for production
