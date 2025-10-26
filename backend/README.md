# FinBERT Sentiment Analysis Backend (Python Flask)

A Python Flask backend for FinBERT sentiment analysis with Explainable AI (LIME/SHAP).

## Features

- **FinBERT Model**: Uses ProsusAI/finbert from HuggingFace
- **LIME Integration**: Explainable AI with word importance
- **Financial Keywords**: 40+ positive/negative keywords
- **REST API**: Easy integration with frontend
- **Batch Processing**: Analyze multiple texts at once

## Setup

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
```

### 2. Activate Virtual Environment

**Windows:**
```bash
venv\Scripts\activate
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment

```bash
copy .env.example .env
```

Edit `.env` with your configuration.

### 5. Run the Server

```bash
python app.py
```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check
```
GET /health
```

### Analyze Single Text
```
POST /api/sentiment/analyze
Content-Type: application/json

{
  "text": "Your financial text here",
  "title": "Optional title"
}
```

### Batch Analysis
```
POST /api/sentiment/batch
Content-Type: application/json

{
  "items": [
    {"text": "Text 1", "title": "Title 1"},
    {"text": "Text 2", "title": "Title 2"}
  ]
}
```

### Get Keywords
```
GET /api/sentiment/keywords
```

## Response Format

```json
{
  "sentiment": "positive",
  "score": 0.75,
  "confidence": 0.89,
  "recommendation": "BUY",
  "analysis": "The financial text shows positive sentiment...",
  "xai": {
    "method": "LIME",
    "wordImportances": [
      {"word": "growth", "importance": 0.85, "sentiment": "positive"}
    ],
    "topPositiveWords": ["growth", "profit"],
    "topNegativeWords": [],
    "explanation": "This sentiment analysis is based on..."
  }
}
```

## Model Information

- **Model**: ProsusAI/finbert
- **Type**: BERT-based financial sentiment analysis
- **Classes**: positive, negative, neutral
- **Max Length**: 512 tokens

## Performance

- **First Request**: ~2-3 seconds (model loading)
- **Subsequent Requests**: ~100-300ms per text
- **Batch Processing**: ~500ms for 5 texts

## Requirements

- Python 3.8+
- 2GB RAM minimum
- GPU optional (faster inference)

## Production Deployment

### Using Gunicorn

```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Using Docker

```bash
docker build -t finbert-api .
docker run -p 5000:5000 finbert-api
```

## Troubleshooting

### Model Download Issues
If the model fails to download, manually download from HuggingFace:
```bash
python -c "from transformers import AutoModel; AutoModel.from_pretrained('ProsusAI/finbert')"
```

### Memory Issues
Reduce batch size or use CPU instead of GPU.

### CORS Issues
Update `ALLOWED_ORIGINS` in `.env` file.

## License

MIT
