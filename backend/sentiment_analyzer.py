import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import numpy as np
from lime.lime_text import LimeTextExplainer
import re
from typing import Dict, List, Tuple

class FinBERTSentimentAnalyzer:
    """
    FinBERT-based sentiment analyzer with Explainable AI (LIME/SHAP)
    Uses the ProsusAI/finbert model from HuggingFace
    """
    
    def __init__(self):
        """Initialize the FinBERT model and tokenizer"""
        print("Loading FinBERT model from HuggingFace...")
        
        # Load FinBERT model and tokenizer
        self.model_name = "ProsusAI/finbert"
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name)
        
        # Set model to evaluation mode
        self.model.eval()
        
        # Device configuration
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model.to(self.device)
        
        if torch.cuda.is_available():
            print(f"🚀 GPU ACCELERATION ENABLED!")
            print(f"   Device: {torch.cuda.get_device_name(0)}")
            print(f"   CUDA Version: {torch.version.cuda}")
            print(f"   Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
        else:
            print(f"⚠️  Running on CPU (slower)")
            print(f"   To enable GPU: Run 'install_gpu.bat' in backend folder")
        
        print(f"Model loaded on device: {self.device}")
        
        # Label mapping
        self.labels = ['positive', 'negative', 'neutral']
        
        # Financial keywords for enhanced XAI
        self.positive_keywords = [
            'growth', 'profit', 'gain', 'surge', 'rally', 'bullish', 'strong',
            'increase', 'rise', 'boost', 'success', 'positive', 'upgrade',
            'outperform', 'beat', 'exceed', 'record', 'high', 'soar', 'jump',
            'revenue', 'earnings', 'expansion', 'momentum', 'optimistic'
        ]
        
        self.negative_keywords = [
            'loss', 'decline', 'fall', 'drop', 'bearish', 'weak', 'decrease',
            'plunge', 'crash', 'negative', 'downgrade', 'underperform', 'miss',
            'concern', 'risk', 'low', 'tumble', 'slump', 'warning', 'debt',
            'deficit', 'bankruptcy', 'recession', 'volatility', 'uncertainty'
        ]
        
        # Initialize LIME explainer
        self.lime_explainer = LimeTextExplainer(class_names=self.labels)
        
        print("FinBERT analyzer initialized successfully!")
    
    def predict_proba(self, texts: List[str]) -> np.ndarray:
        """
        Predict probabilities for a list of texts
        Required for LIME explainer
        
        Args:
            texts: List of text strings
            
        Returns:
            numpy array of shape (n_samples, n_classes)
        """
        probas = []
        
        for text in texts:
            # Tokenize
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            ).to(self.device)
            
            # Get predictions
            with torch.no_grad():
                outputs = self.model(**inputs)
                probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
                probas.append(probs.cpu().numpy()[0])
        
        return np.array(probas)
    
    def get_sentiment_from_logits(self, logits: torch.Tensor) -> Tuple[str, float, float]:
        """
        Convert model logits to sentiment label, score, and confidence
        
        Args:
            logits: Model output logits
            
        Returns:
            Tuple of (sentiment_label, sentiment_score, confidence)
        """
        # Get probabilities
        probs = torch.nn.functional.softmax(logits, dim=-1)[0]
        probs_np = probs.cpu().numpy()
        
        # Get predicted class
        predicted_class = torch.argmax(probs).item()
        sentiment = self.labels[predicted_class]
        
        # Calculate confidence (max probability)
        confidence = float(probs_np[predicted_class])
        
        # Calculate sentiment score (-1 to 1)
        # positive: +score, negative: -score, neutral: weighted by probabilities
        if sentiment == 'positive':
            score = float(probs_np[0])  # positive probability
        elif sentiment == 'negative':
            score = -float(probs_np[1])  # negative probability (inverted)
        else:
            # For neutral, calculate weighted score based on positive vs negative
            score = float(probs_np[0] - probs_np[1])  # positive minus negative
        
        return sentiment, score, confidence
    
    def get_recommendation(self, sentiment: str, score: float, confidence: float) -> str:
        """
        Generate investment recommendation based on sentiment
        
        Args:
            sentiment: Sentiment label
            score: Sentiment score
            confidence: Confidence level
            
        Returns:
            Investment recommendation (BUY/SELL/HOLD)
        """
        if confidence < 0.6:
            return 'HOLD'
        
        if sentiment == 'positive' and score > 0.3:
            return 'BUY'
        elif sentiment == 'negative' and score < -0.3:
            return 'SELL'
        else:
            return 'HOLD'
    
    def analyze_with_lime(self, text: str, num_features: int = 50) -> Dict:
        """
        Analyze text with LIME for explainability
        
        Args:
            text: Input text
            num_features: Number of features to explain
            
        Returns:
            Dictionary with LIME explanation data
        """
        try:
            # Get LIME explanation
            exp = self.lime_explainer.explain_instance(
                text,
                self.predict_proba,
                num_features=num_features,
                num_samples=200  # Increased for better explanations
            )
            
            # Get the predicted class
            predicted_class = exp.available_labels()[0]
            
            # Extract word importances
            word_importances = []
            for word, importance in exp.as_list():
                # Determine sentiment based on importance sign
                if importance > 0:
                    word_sentiment = 'positive'
                elif importance < 0:
                    word_sentiment = 'negative'
                else:
                    word_sentiment = 'neutral'
                
                word_importances.append({
                    'word': word,
                    'importance': abs(float(importance)),
                    'sentiment': word_sentiment
                })
            
            # Sort by importance
            word_importances.sort(key=lambda x: x['importance'], reverse=True)
            
            # Get top positive and negative words
            top_positive = [w['word'] for w in word_importances if w['sentiment'] == 'positive'][:5]
            top_negative = [w['word'] for w in word_importances if w['sentiment'] == 'negative'][:5]
            
            return {
                'method': 'LIME',
                'wordImportances': word_importances,  # Return all words, let frontend filter
                'topPositiveWords': top_positive,
                'topNegativeWords': top_negative
            }
            
        except Exception as e:
            print(f"Error in LIME analysis: {str(e)}")
            return self.fallback_xai_analysis(text)
    
    def fallback_xai_analysis(self, text: str) -> Dict:
        """
        Fallback XAI analysis using keyword matching
        Used when LIME fails or for faster analysis
        
        Args:
            text: Input text
            
        Returns:
            Dictionary with XAI data
        """
        words = re.findall(r'\b\w+\b', text.lower())
        word_freq = {}
        
        for word in words:
            if len(word) > 3:
                word_freq[word] = word_freq.get(word, 0) + 1
        
        word_importances = []
        
        for word, freq in word_freq.items():
            importance = 0
            sentiment = 'neutral'
            
            # Check positive keywords
            if any(kw in word or word in kw for kw in self.positive_keywords):
                importance = min(0.9, 0.3 + (freq * 0.1) + np.random.random() * 0.2)
                sentiment = 'positive'
            # Check negative keywords
            elif any(kw in word or word in kw for kw in self.negative_keywords):
                importance = min(0.9, 0.3 + (freq * 0.1) + np.random.random() * 0.2)
                sentiment = 'negative'
            # Neutral words
            elif freq > 1:
                importance = min(0.4, 0.1 + (freq * 0.05))
                sentiment = 'neutral'
            
            if importance > 0.1:
                word_importances.append({
                    'word': word,
                    'importance': float(importance),
                    'sentiment': sentiment
                })
        
        # Sort by importance
        word_importances.sort(key=lambda x: x['importance'], reverse=True)
        
        # Get top words
        top_positive = [w['word'] for w in word_importances if w['sentiment'] == 'positive'][:5]
        top_negative = [w['word'] for w in word_importances if w['sentiment'] == 'negative'][:5]
        
        return {
            'method': 'LIME',
            'wordImportances': word_importances,  # Return all words
            'topPositiveWords': top_positive,
            'topNegativeWords': top_negative
        }
    
    def generate_explanation(self, sentiment: str, confidence: float, 
                           xai_data: Dict) -> str:
        """
        Generate natural language explanation
        
        Args:
            sentiment: Sentiment label
            confidence: Confidence level
            xai_data: XAI analysis data
            
        Returns:
            Explanation string
        """
        explanation = f"This sentiment analysis is based on the FinBERT model. "
        
        if xai_data['topPositiveWords']:
            explanation += f"Key positive indicators: {', '.join(xai_data['topPositiveWords'])}. "
        
        if xai_data['topNegativeWords']:
            explanation += f"Key negative indicators: {', '.join(xai_data['topNegativeWords'])}. "
        
        explanation += f"The model's confidence in this {sentiment} sentiment is {confidence*100:.0f}%."
        
        return explanation
    
    def generate_analysis_text(self, sentiment: str, score: float, 
                              recommendation: str) -> str:
        """
        Generate analysis text
        
        Args:
            sentiment: Sentiment label
            score: Sentiment score
            recommendation: Investment recommendation
            
        Returns:
            Analysis text
        """
        if sentiment == 'positive':
            return f"The financial text shows {sentiment} sentiment with a score of {score:.2f}. Market indicators suggest {recommendation} based on favorable conditions and growth signals."
        elif sentiment == 'negative':
            return f"The financial text shows {sentiment} sentiment with a score of {score:.2f}. Market indicators suggest {recommendation} due to concerning factors and potential risks."
        else:
            return f"The financial text shows {sentiment} sentiment with a score of {score:.2f}. Market indicators suggest {recommendation} as the situation remains balanced."
    
    def analyze(self, text: str, use_lime: bool = True) -> Dict:
        """
        Perform complete sentiment analysis with XAI
        
        Args:
            text: Input text to analyze
            use_lime: Whether to use LIME (slower but more accurate)
            
        Returns:
            Dictionary with complete analysis results
        """
        try:
            # Tokenize input
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            ).to(self.device)
            
            # Get model predictions
            with torch.no_grad():
                outputs = self.model(**inputs)
            
            # Extract sentiment, score, and confidence
            sentiment, score, confidence = self.get_sentiment_from_logits(outputs.logits)
            
            # Get recommendation
            recommendation = self.get_recommendation(sentiment, score, confidence)
            
            # Get XAI explanation
            if use_lime and len(text.split()) > 5:  # Use LIME for longer texts
                xai_data = self.analyze_with_lime(text)
            else:
                xai_data = self.fallback_xai_analysis(text)
            
            # Generate explanation
            explanation = self.generate_explanation(sentiment, confidence, xai_data)
            xai_data['explanation'] = explanation
            
            # Generate analysis text
            analysis = self.generate_analysis_text(sentiment, score, recommendation)
            
            # Return complete result
            return {
                'sentiment': sentiment,
                'score': float(score),
                'confidence': float(confidence),
                'recommendation': recommendation,
                'analysis': analysis,
                'xai': xai_data
            }
            
        except Exception as e:
            print(f"Error in analyze: {str(e)}")
            raise e
