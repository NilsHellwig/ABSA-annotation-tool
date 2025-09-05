# 🎯 ABSA Annotation Tool

> *A modern, intuitive web interface for Aspect-Based Sentiment Analysis annotation*

[![Made with React](https://img.shields.io/badge/Frontend-React-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![Made with FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python 3.8+](https://img.shields.io/badge/Python-3.8+-blue?style=flat-square&logo=python)](https://python.org)

## 📖 What is this?

This tool helps you **annotate text data for Aspect-Based Sentiment Analysis (ABSA)** through a modern web interface. You can select text phrases by clicking, assign sentiment labels (positive, negative, neutral) to specific aspects, and categorize them into predefined or custom categories. The tool supports configuring any number of sentiment elements - choose from the standard aspect_term, aspect_category, sentiment_polarity, and opinion_term, or define your own elements. It handles both **CSV files** (UTF-8 encoded with `text,label,translation` structure) and **JSON files** (flexible object structure), supports multilingual data with optional translation display, and provides progress tracking through navigation, session IDs, and real-time annotation status.

![ABSA Annotation Tool Interface](docs/user-interface.png)

## ✨ Features

- **Intuitive UI** - Clean, modern interface for efficient annotation
- **Smart Phrase Selection** - Click-to-select text spans with visual feedback
- **Automatic Phrase Cleaning** - Removes punctuation from start/end of selected phrases (configurable)
- **Combined Annotation Popup** - When both aspect and opinion terms are configured, annotate both in a single, unified dialog
- **Separate Text Selection** - Independent phrase selection for aspect terms and opinion terms
- **Progress Tracking** - Real-time annotation progress and navigation
- **Flexible Configuration** - Customizable sentiment elements and categories
- **Translation Support** - Optional translations displayed below original text
- **Session Management** - Optional session IDs for tracking annotation sessions
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
./absa-annotator annotations.json --load-config example_config.json --start

# Start the complete application (auto-detects file format)
./absa-annotator annotations.csv --start  # CSV with UTF-8
./absa-annotator annotations.json --start # JSON format

# Start only backend server
./absa-annotator annotations.csv --backend --backend-port 8001

# Start with custom ports for both servers
./absa-annotator annotations.json --start --backend-port 8080 --frontend-port 3001

# Start with custom IPs and ports (useful for network environments)
./absa-annotator annotations.csv --start --backend-ip 192.168.1.100 --backend-port 8080 --frontend-ip 0.0.0.0 --frontend-port 3001

# Configure elements, save config, and start
./absa-annotator data.csv --elements aspect_term sentiment_polarity --save-config example_config.json --start

# Load base config, override some settings, and start
./absa-annotator data.csv --load-config example_config.json --polarities positive negative --start

# Advanced configuration with phrase cleaning and position saving
./absa-annotator reviews.json --session-id "study_2024" --no-clean-phrases --save-config study_config.json --start

# Multi-language annotation with disabled position saving for faster processing
./absa-annotator multilingual_reviews.csv --no-save-positions --start

# Research setup with all position and cleaning features enabled
./absa-annotator research_data.json --session-id "research_phase1" --implicit-aspect --start
```

### Configuration Files

You can save and reuse configurations with JSON files:

```bash
# Save current configuration
./absa-annotator data.csv --elements aspect_term sentiment_polarity --save-config example_config.json

# Load and use saved configuration  
./absa-annotator data.csv --load-config example_config.json --start

# Load config and override specific settings
./absa-annotator data.csv --load-config example_config.json --polarities positive negative neutral
```

**Example configuration file** (`example_config.json`):
```json
{
  "csv_path": "annotations.csv",
  "sentiment_elements": ["aspect_term", "aspect_category", "sentiment_polarity"],
  "sentiment_polarity_options": ["positive", "negative", "neutral"],
  "aspect_categories": ["food general", "service general", "price general"],
  "implicit_aspect_term_allowed": true,
  "implicit_opinion_term_allowed": false,
  "auto_clean_phrases": true
}
```

## 🔧 Configuration

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--start` | **Auto-launch both servers** (backend + frontend) | - |
| `--backend` | **Start only backend server** | - |
| `--frontend` | **Start only frontend** (requires backend running) | - |
| `--backend-port` | Backend server port | `8000` |
| `--frontend-port` | Frontend server port | `3000` |  
| `--backend-ip` | Backend server IP address | `127.0.0.1` |
| `--frontend-ip` | Frontend server IP address | `127.0.0.1` |
| `--session-id` | **Session identifier** for annotation tracking | `None` |
| `--port` | Backend server port (deprecated, use --backend-port) | `8000` |
| `--elements` | Sentiment elements to annotate | `aspect_term, aspect_category, sentiment_polarity, opinion_term` |
| `--polarities` | Available sentiment polarities | `positive, negative, neutral` |
| `--categories` | Available aspect categories | Restaurant domain (18 categories) |
| `--implicit-aspect` | Allow implicit aspect terms | `True` |
| `--no-implicit-aspect` | Disable implicit aspect terms | - |
| `--implicit-opinion` | Allow implicit opinion terms | `False` |
| `--no-implicit-opinion` | Disable implicit opinion terms | `True` (default) |
| `--no-clean-phrases` | **Disable automatic punctuation cleaning** | - |
| `--no-save-positions` | **Disable saving phrase positions** (at_start, at_end, ot_start, ot_end) | - |
| `--save-config` | Save config to JSON file | - |
| `--show-config` | Display current configuration | - |

### Real-World Example

For a restaurant review annotation project with multilingual support and position tracking:

```bash
./absa-annotator restaurant_reviews.json \
  --session-id "restaurant_study_2024" \
  --elements aspect_term aspect_category sentiment_polarity opinion_term \
  --categories "food quality" "service speed" "price level" "ambience general" "location access" \
  --polarities positive negative neutral mixed \
  --implicit-aspect \
  --backend-ip 0.0.0.0 \
  --backend-port 8080 \
  --frontend-port 3001 \
  --save-config restaurant_config.json \
  --start
```

This configuration:
- Tracks all annotation sessions with ID `restaurant_study_2024`
- Enables position saving for phrase analysis (default)
- Allows implicit aspects (useful for general sentiment)
- Uses custom categories relevant to restaurant reviews
- Saves the configuration for future use
- Enables network access with custom ports

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
        "opinion_term": "amazing",
        "at_start": 4,
        "at_end": 7,
        "ot_start": 13,
        "ot_end": 19
      },
      {
        "aspect_term": "service",
        "aspect_category": "service general",
        "sentiment_polarity": "negative", 
        "opinion_term": "slow",
        "at_start": 25,
        "at_end": 31,
        "ot_start": 37,
        "ot_end": 40
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

### Position Data (Optional)

When phrase position saving is enabled (default), the tool automatically adds character position information:

| Field | Description |
|-------|-------------|
| `at_start` | Start character position of aspect term in text |
| `at_end` | End character position of aspect term in text |  
| `ot_start` | Start character position of opinion term in text |
| `ot_end` | End character position of opinion term in text |

Position indices are 0-based and inclusive. This data is useful for downstream processing and analysis. To disable position saving, use the `--no-save-positions` CLI option.

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

### UI Layout
The annotation interface displays fields in this order for optimal workflow:
1. **Aspect Term** (phrase selection)
2. **Opinion Term** (phrase selection) - displayed next to aspect term
3. **Aspect Category** (dropdown)
4. **Sentiment Polarity** (dropdown)

### Combined Annotation Mode
When both **Aspect Term** and **Opinion Term** are configured:
- Clicking "Select phrase" on either field opens a combined popup
- The popup shows two separate text areas for independent phrase selection
- Both fields must be completed (either by phrase selection or marking as implicit) before proceeding
- Each field has its own "Implicit" checkbox when implicit terms are allowed

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
