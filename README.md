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

# Start the complete application
./absa-annotator annotations.csv --start
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
# Basic usage - configure and show settings
./absa-annotator /path/to/your/annotations.csv --show-config

# Load configuration from file and start
./absa-annotator annotations.csv --load-config my_project.json --start

# Start the complete application (backend + frontend)
./absa-annotator annotations.csv --start

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
| `csv_path` | **Path to CSV file** (required) | - |
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

1. **One-command start (easiest):**
   ```bash
   ./absa-annotator /path/to/reviews.csv --start
   ```

2. **Use saved configuration:**
   ```bash
   ./absa-annotator /path/to/reviews.csv --load-config restaurant_project.json --start
   ```

3. **Create and save configuration:**
   ```bash
   ./absa-annotator /path/to/reviews.csv --elements aspect_term sentiment_polarity --save-config --start
   ```

4. **Advanced: Load config and override settings:**
   ```bash
   ./absa-annotator reviews.csv --load-config base.json --polarities positive negative excited --start
   ```

5. **Open browser** at `http://localhost:3000` and start annotating!

---

## 🤝 Contributing

Feel free to open issues or submit pull requests to improve the tool!

---

<div align="center">
  <sub>Built with ❤️ for the NLP community</sub>
</div>
