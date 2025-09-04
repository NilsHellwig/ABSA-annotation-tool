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

### Backend Setup

```bash
# Install dependencies
pip install fastapi uvicorn pandas

# Start the server
uvicorn main:app --reload --port 8000
```

### Frontend Setup

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

Configure your annotation project with the `absa-annotator` CLI:

```bash
# Basic setup - specify your CSV file path
python cli.py /path/to/your/annotations.csv

# Configure all sentiment elements (default)
python cli.py data.csv --elements aspect_term aspect_category sentiment_polarity opinion_term

# Custom sentiment polarities
python cli.py data.csv --polarities positive negative neutral excited disappointed

# Custom aspect categories for different domains
python cli.py data.csv --categories "tech performance" "tech design" "tech price" "tech support"

# Configure implicit terms
python cli.py data.csv --no-implicit-aspect --implicit-opinion

# Show current config and save to file
python cli.py data.csv --show-config --save-config my_project.json
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `csv_path` | **Path to CSV file** (required) | - |
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
python cli.py /home/user/reviews.csv \
  --elements aspect_term aspect_category sentiment_polarity opinion_term \
  --polarities positive negative neutral \
  --categories "food quality" "service speed" "price level" "ambience decor" \
  --implicit-aspect \
  --no-implicit-opinion \
  --save-config restaurant_config.json \
  --show-config
```

---

## 📊 Data Format

Your CSV file should contain at least these columns:

| Column | Type | Description |
|--------|------|-------------|
| `text` | string | Text to be annotated |
| `label` | string | JSON array of annotations (auto-generated) |

**Example:**
```csv
text,label
"The food was amazing but service was slow.",""
"Great atmosphere and reasonable prices!",""
```

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

1. **Configure your project with CSV path:**
   ```bash
   python cli.py /path/to/reviews.csv --elements aspect_term sentiment_polarity --save-config
   ```

2. **Start the servers:**
   ```bash
   # Backend (Terminal 1)
   uvicorn main:app --reload --port 8000
   
   # Frontend (Terminal 2)  
   cd frontend && npm start
   ```

3. **Start annotating** at `http://localhost:3000`

---

## 🤝 Contributing

Feel free to open issues or submit pull requests to improve the tool!

---

<div align="center">
  <sub>Built with ❤️ for the NLP community</sub>
</div>
