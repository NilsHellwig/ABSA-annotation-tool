# 🎯 ABSA Annotation Tool

> *A modern, intuitive web interface for Aspect-Based Sentiment Analysis annotation*

[![Made with React](https://img.shields.io/badge/Frontend-React-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![Made with FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python 3.8+](https://img.shields.io/badge/Python-3.8+-blue?style=flat-square&logo=python)](https://python.org)

## ✨ Features

- **Intuitive UI** - Clean, modern interface for efficient annotation
- **Phrase Selection** - Click-to-select text spans with visual feedback  
- **Progress Tracking** - Real-time annotation progress and navigation
- **Flexible Configuration** - Customizable sentiment elements and categories
- **CLI Tool** - Command-line configuration for different domains

---

## 🚀 Quick Start

### Option 1: One-Command Launch (Recommended)

```bash
# Install Python dependencies
pip install fastapi uvicorn pandas

# Install frontend dependencies  
cd frontend && npm install && cd ..

# Start with CSV file (UTF-8 encoded)
./absa-annotator annotations.csv --start

# Start with JSON file
./absa-annotator annotations.json --start
```

### Option 2: Manual Setup

#### Backend Setup

```bash
# Install dependencies
pip install fastapi uvicorn pandas

# Start the server
uvicorn main:app --reload --port 8000
```

#### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The app will open at `http://localhost:3000`

---

## 🛠️ CLI Configuration

The `absa-annotator` CLI tool configures and runs your annotation environment:

```bash
# Basic usage - works with CSV or JSON files
./absa-annotator /path/to/data.csv --show-config
./absa-annotator /path/to/data.json --show-config

# Load configuration from file and start
./absa-annotator annotations.json --load-config my_project.json --start

# Start the complete application (auto-detects file format)
./absa-annotator annotations.csv --start  # CSV with UTF-8
./absa-annotator annotations.json --start # JSON format

# Start only backend server
./absa-annotator annotations.csv --backend --port 8001

# Configure elements, save config, and start
./absa-annotator data.csv --elements aspect_term sentiment_polarity --save-config quick_setup.json --start

# Load base config, override some settings, and start
./absa-annotator data.csv --load-config base_config.json --polarities positive negative excited --start
```

### Configuration Files

You can save and reuse configurations with JSON files:

```bash
# Save current configuration
./absa-annotator data.csv --elements aspect_term sentiment_polarity --save-config restaurant_config.json

# Load and use saved configuration  
./absa-annotator data.csv --load-config restaurant_config.json --start

# Load config and override specific settings
./absa-annotator data.csv --load-config restaurant_config.json --polarities positive negative neutral
```

**Example configuration file** (`example_config.json`):
```json
{
  "csv_path": "annotations.csv",
  "sentiment_elements": ["aspect_term", "aspect_category", "sentiment_polarity"],
  "sentiment_polarity_options": ["positive", "negative", "neutral"],
  "aspect_categories": ["food general", "service general", "price general"],
  "implicit_aspect_term_allowed": true,
  "implicit_opinion_term_allowed": false
}
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `data_path` | **Path to CSV or JSON file** (required) | - |
| `--load-config` | **Load configuration from JSON file** | - |
| `--start` | **Start both backend and frontend** | - |
| `--backend` | Start only backend server | - |
| `--port` | Backend server port | `8000` |
| `--elements` | Sentiment elements to annotate | `aspect_term, aspect_category, sentiment_polarity, opinion_term` |
| `--polarities` | Available sentiment polarities | `positive, negative, neutral` |
| `--categories` | Available aspect categories | Restaurant domain (18 categories) |
| `--implicit-aspect` | Allow implicit aspect terms | `True` |
| `--no-implicit-aspect` | Disable implicit aspect terms | - |
| `--implicit-opinion` | Allow implicit opinion terms | `False` |
| `--no-implicit-opinion` | Disable implicit opinion terms | `True` (default) |
| `--save-config` | Save config to JSON file | - |
| `--show-config` | Display current configuration | - |

### Full Configuration Example

```bash
./absa-annotator /home/user/reviews.csv \
  --elements aspect_term aspect_category sentiment_polarity opinion_term \
  --polarities positive negative neutral \
  --categories "food quality" "service speed" "price level" "ambience decor" \
  --implicit-aspect \
  --no-implicit-opinion \
  --save-config restaurant_config.json \
  --start
```

---

## 📊 Data Format

The tool supports both **CSV** and **JSON** formats with UTF-8 encoding:

### CSV Format
Your CSV file should contain at least these columns:

| Column | Type | Description |
|--------|------|-------------|
| `text` | string | Text to be annotated |
| `label` | string | JSON array of annotations (auto-generated) |
| `translation` | string | **Optional:** Translation of the text |

**Example CSV** (with UTF-8 encoding):
```csv
text,translation,label
"The food was amazing but service was slow.","Das Essen war fantastisch, aber der Service war langsam.",""
"Schönes Ambiente und günstiger Preis!","Nice atmosphere and affordable price!",""
"El servicio fue excelente 👍","The service was excellent 👍",""
```

### JSON Format
Alternative JSON structure for more flexibility:

**Example JSON** (`annotations.json`):
```json
[
  {
    "text": "The food was amazing but service was slow.",
    "translation": "Das Essen war fantastisch, aber der Service war langsam.",
    "label": [
      {
        "aspect_term": "food",
        "aspect_category": "food quality", 
        "sentiment_polarity": "positive",
        "opinion_term": "amazing"
      },
      {
        "aspect_term": "service",
        "aspect_category": "service general",
        "sentiment_polarity": "negative", 
        "opinion_term": "slow"
      }
    ]
  },
  {
    "text": "Great atmosphere and reasonable prices!",
    "translation": "Tolles Ambiente und vernünftige Preise!",
    "label": []
  },
  {
    "text": "This sentence has not been annotated yet."
  }
]
```

**Key States:**
- **Not annotated**: No `label` key present
- **No aspects found**: `label` is an empty array `[]`  
- **Aspects found**: `label` contains annotation objects

**Important**: Both CSV and JSON files must be saved with UTF-8 encoding to support international characters and emojis.

### Translation Support

The tool supports **optional translations** to help annotators understand text in foreign languages:

- **CSV**: Add a `translation` column
- **JSON**: Add a `translation` key to each object

When available, translations are displayed below the original text in a blue-tinted box. This feature is especially useful for multilingual datasets or when annotating text in languages the annotator may not fully understand.

---

## 🎨 Annotation Elements

### Available Elements
- **`aspect_term`** - Specific aspect mentioned in text
- **`aspect_category`** - General aspect category  
- **`sentiment_polarity`** - Sentiment towards aspect
- **`opinion_term`** - Opinion expression about aspect

### Default Categories (Restaurant Domain)
Food, Service, Price, Ambience, Location, Restaurant

---

## 📝 Example Usage

1. **One-command start (easiest):**
   ```bash
   ./absa-annotator /path/to/reviews.csv --start      # CSV format
   ./absa-annotator /path/to/reviews.json --start     # JSON format
   ```

2. **Use saved configuration:**
   ```bash
   ./absa-annotator /path/to/reviews.json --load-config restaurant_project.json --start
   ```

3. **Create and save configuration:**
   ```bash
   ./absa-annotator /path/to/reviews.csv --elements aspect_term sentiment_polarity --save-config --start
   ```

4. **Advanced: Load config and override settings:**
   ```bash
   ./absa-annotator reviews.json --load-config base.json --polarities positive negative excited --start
   ```

5. **Open browser** at `http://localhost:3000` and start annotating!

---

## 🤝 Contributing

Feel free to open issues or submit pull requests to improve the tool!

---

<div align="center">
  <sub>Built with ❤️ for the NLP community</sub>
</div>
