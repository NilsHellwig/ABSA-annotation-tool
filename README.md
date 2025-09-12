# 🎯 ABSA Annotation Tool

> *A modern, intuitive web interface for Aspect-Based Sentiment Analysis annotation*

[![Made with React](https://img.shields.io/badge/Frontend-React-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![Built with TypeScript](https://img.shields.io/badge/Built_with-TypeScript-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org/)
[![Made with Vite](https://img.shields.io/badge/Built_with-Vite-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Styled with Tailwind CSS](https://img.shields.io/badge/Styled_with-Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Made with FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python 3.8+](https://img.shields.io/badge/Python-3.8+-blue?style=flat-square&logo=python)](https://python.org)

## 📖 What is this?

This tool helps you **annotate text data for Aspect-Based Sentiment Analysis (ABSA)** through a modern web interface built with **React**, **TypeScript**, and **Vite**. You can select text phrases by clicking, assign sentiment labels (positive, negative, neutral) to specific aspects, and categorize them into predefined or custom categories. The tool supports configuring any number of sentiment elements - choose from the standard aspect_term, aspect_category, sentiment_polarity, and opinion_term, or define your own elements. It handles both **CSV files** (UTF-8 encoded with `text,label,translation` structure) and **JSON files** (flexible object structure), supports multilingual data with optional translation display, and provides progress tracking through navigation, session IDs, and real-time annotation status.

![ABSA Annotation Tool Interface](docs/user-interface.png)

## ✨ Features

- **Modern TypeScript Frontend** - Built with React, TypeScript, and Vite for fast development and type safety
- **Dark Mode Support** - Toggle between light and dark themes with persistent localStorage settings
- **Intuitive UI** - Clean, modern interface for efficient annotation with smooth transitions
- **Smart Phrase Selection** - Click-to-select text spans with visual feedback
- **Visual Phrase Highlighting** - Annotated phrases are highlighted directly in the text with unique colors
- **Color-Coded Annotations** - Each annotation gets a unique color with visual indicators in the annotation list
- **Intelligent Color Mixing** - Overlapping phrases show mixed colors to visualize annotation overlaps
- **Automatic Phrase Cleaning** - Removes punctuation from start/end of selected phrases (configurable)
- **Click-on-Token Selection** - Smart token-based text selection that snaps to word boundaries (configurable)
- **Automatic Position Filling** - Automatically adds missing character positions for existing phrases on startup
- **Combined Annotation Popup** - When both aspect and opinion terms are configured, annotate both in a single, unified dialog
- **Separate Text Selection** - Independent phrase selection for aspect terms and opinion terms
- **Progress Tracking** - Real-time annotation progress and navigation
- **Flexible Configuration** - Customizable sentiment elements and categories
- **Translation Support** - Optional translations displayed below original text
- **Session Management** - Optional session IDs for tracking annotation sessions
- **Timing Analytics** - Optional timing data collection for annotation behavior analysis
- **CLI Tool** - Command-line configuration for different domains
- **Per-example aspect categories** — support for `aspect_category_list` in `/data/{index}` to render sample-specific categories (falls back to defaults).
- **AI-Powered Predictions** - Optional AI assistance with `--enable-ai-suggestions` flag for automated annotation suggestions based on your previous annotations
- **LLM Integration** - Uses Gemma 3:4B model (default) for intelligent aspect and sentiment prediction
- **Smart Similarity Matching** - Uses sentence transformers for finding relevant examples with semantic understanding

## 📊 Analytics Features

### Timing Data Collection
- **Optional timing tracking** - Enable with `--store-time` flag to collect annotation performance metrics
- **Duration measurement** - Records time spent on each annotation from viewing to saving
- **Change detection** - Tracks whether annotations were modified during the session
- **Per-example data** - Maintains a list of timing entries for each text example, supporting multiple annotation attempts
- **JSON storage** - Timing data saved as `[{"duration": <seconds>, "change": true/false}, ...]` per example
- **Privacy-focused** - Timing collection is disabled by default and must be explicitly enabled

## 🤖 AI-Powered Predictions with Ollama

The tool includes optional AI assistance for automated annotation suggestions using Large Language Models (LLMs). All processing happens locally on your machine via the Ollama API, ensuring data privacy. You can enable this feature with the `--enable-ai-suggestions` CLI flag. The only prerequisite is having [Ollama](https://ollama.com/) installed and a compatible model (e.g., Gemma 3:4B) downloaded.

### Similarity Matching
For finding relevant examples to provide context to the LLM, the tool uses **Sentence Transformers** for semantic similarity using the lightweight `all-MiniLM-L6-v2` model (~23MB). This provides much better context matching than traditional lexical approaches.

### How It Works
3. **UI Integration** - Click the ✨ AI button next to "Text to annotate" to get suggestions
1. **Few-Shot Learning** - The AI analyzes existing annotations in your dataset

---

## 🚀 Quick Start

### Option 1: One-Command Launch (Recommended)

```bash
# Install Python dependencies
pip install fastapi uvicorn pandas sentence-transformers

# Install frontend dependencies  
cd frontend && npm install && cd ..

# Start with example data
./absa-annotator examples/restaurant_reviews.csv
./absa-annotator examples/restaurant_reviews.json

# Or use the example configuration
./absa-annotator examples/restaurant_reviews.json --load-config examples/example_config.json

# Enable automatic position filling for imported data
./absa-annotator imported_annotations.csv --auto-positions
```

### Option 2: Manual Setup

#### Backend Setup
```bash
# Install dependencies
pip install fastapi uvicorn pandas sentence-transformers

# Start the server
uvicorn main:app --reload --port 8000
```

#### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server (Vite)
npm run dev
```

The app will open at `http://localhost:3000`

---

## 📁 Example Data

The `examples/` folder contains sample data to get you started:

| File | Format | Description |
|------|--------|-------------|
| `restaurant_reviews.csv` | CSV | 10 restaurant reviews in CSV format with English text and German translations |
| `restaurant_reviews.json` | JSON | Same reviews in JSON format with additional metadata (restaurant names, dates) |
| `example_config.json` | JSON | Example configuration file with restaurant domain settings |

---

---

## �️ CLI Configuration

The `absa-annotator` CLI tool configures and runs your annotation environment:

```bash
# Basic usage - starts frontend and backend by default
./absa-annotator examples/restaurant_reviews.csv
./absa-annotator examples/restaurant_reviews.json

# Load configuration from file
./absa-annotator examples/restaurant_reviews.json --load-config examples/example_config.json

# Start only backend server
./absa-annotator examples/restaurant_reviews.csv --backend

# Custom ports and session
./absa-annotator examples/restaurant_reviews.json --backend-port 8080 --frontend-port 3001 --session-id "study_2024"
```

### Configuration Files

You can save and reuse configurations with JSON files:

```bash
# Save current configuration
./absa-annotator examples/restaurant_reviews.csv --elements aspect_term sentiment_polarity --save-config examples/my_config.json

# Load and use saved configuration  
./absa-annotator examples/restaurant_reviews.csv --load-config examples/example_config.json

# Load config and override specific settings
./absa-annotator examples/restaurant_reviews.json --load-config examples/example_config.json --session-id "new_session"
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--backend` | Start only backend server | - |
| `--backend-port` | Backend server port | `8000` |
| `--frontend-port` | Frontend server port | `3000` |  
| `--backend-ip` | Backend server IP address | `127.0.0.1` |
| `--frontend-ip` | Frontend server IP address | `127.0.0.1` |
| `--session-id` | Session identifier for annotation tracking | `None` |
| `--elements` | Sentiment elements to annotate | `aspect_term, aspect_category, sentiment_polarity, opinion_term` |
| `--polarities` | Available sentiment polarities | `positive, negative, neutral` |
| `--categories` | Available aspect categories | Restaurant domain (18 categories) |
| `--implicit-aspect` | Allow implicit aspect terms | `True` |
| `--no-implicit-aspect` | Disable implicit aspect terms | - |
| `--implicit-opinion` | Allow implicit opinion terms | `False` |
| `--disable-implicit-opinion` | Disable implicit opinion terms | `True` (default) |
| `--disable-clean-phrases` | Disable automatic punctuation cleaning from phrase start/end | Enabled by default |
| `--disable-save-positions` | Disable saving phrase positions (at_start, at_end, ot_start, ot_end) for faster processing | Enabled by default |
| `--disable-click-on-token` | Disable click-on-token feature (precise character clicking instead of token snapping) | Enabled by default |
| `--auto-positions` | Enable automatic position filling** on startup for existing phrases without positions | Disabled by default |
| `--store-time` | Store timing data for annotation sessions (duration and change detection) | Disabled by default |
| `--display-avg-annotation-time` | Display average annotation time in the interface (requires timing data) | Disabled by default |
| `--enable-ai-suggestions` | Enable AI-powered prediction for automated annotation suggestions using LLM | Disabled by default |
| `--llm-model` | Language model for predictions (e.g., Gemma 3:4B) | `gemma-3:4b` |
| `--save-config` | Save config to JSON file | - |
| `--show-config` | Display current configuration | - |

### Real-World Example

For a restaurant review annotation project with multilingual support and position tracking:

```bash
./absa-annotator examples/restaurant_reviews.json \
  --session-id "restaurant_study_2024" \
  --elements aspect_term aspect_category sentiment_polarity opinion_term \
  --categories "food quality" "service speed" "price level" "ambience general" "location access" \
  --polarities positive negative neutral mixed \
  --implicit-aspect \
  --backend-ip 0.0.0.0 \
  --backend-port 8080 \
  --frontend-port 3001 \
  --save-config restaurant_config.json
```

This configuration:
- Tracks all annotation sessions with ID `restaurant_study_2024`
- Enables position saving for phrase analysis (default)
- Allows implicit aspects (useful for general sentiment)
- Uses custom categories relevant to restaurant reviews
- Saves the configuration for future use
- Enables network access with custom ports

### Working with Imported Data

If you're importing existing annotation data that may have inconsistent or missing position information, you can enable automatic preprocessing:

```bash
# Enable automatic position filling (slower startup but adds missing positions)
./absa-annotator imported_annotations.csv --auto-positions
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

**Example JSON** (`examples/restaurant_reviews.json`):
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

### Timing Data (Optional)

When timing data collection is enabled with `--store-time`, the tool adds timing analytics:

```json
{
  "text": "The food was amazing but service was slow.",
  "label": [...],
  "timings": [
    {"duration": 15.2, "change": true},
    {"duration": 3.8, "change": false},
    {"duration": 22.1, "change": true}
  ]
}
```

**Timing Fields:**
- **duration**: Time spent in seconds from viewing the text to saving annotations
- **change**: Whether the annotation was modified (`true`) or left unchanged (`false`)
- **Multiple entries**: Each annotation session appends a new timing entry, supporting re-annotation analysis

### Average Annotation Time Display

When both timing data collection and average time display are enabled, the interface shows annotation performance metrics:

```bash
# Enable timing collection and average time display
./absa-annotator examples/restaurant_reviews.csv --store-time --display-avg-annotation-time
```

This displays the average annotation time between the dark mode toggle and index input field. The statistic is calculated by:
1. Collecting all `duration` values from all examples that have timing data
2. Computing the average across all annotation sessions
3. Displaying the result as "Ø {time}s per annotation" in the interface

The average time helps researchers understand annotation efficiency and can guide training or process improvements.

### Position Data (Optional)

When phrase position saving is enabled (default), the tool automatically adds character position information:

| Field | Description |
|-------|-------------|
| `at_start` | Start character position of aspect term in text |
| `at_end` | End character position of aspect term in text |  
| `ot_start` | Start character position of opinion term in text |
| `ot_end` | End character position of opinion term in text |

Position indices are 0-based and inclusive. This data is useful for downstream processing and analysis.

#### Automatic Position Filling

**Optional Feature**: When enabled with `--auto-positions`, the tool automatically scans existing annotations and fills missing position data for phrases that have values but no position information. This is useful when:

- Importing existing annotation data from other tools
- Working with datasets that lack position information
- Migrating between different annotation formats

**Example**: If your data contains annotations like this:
```json
{
  "text": "The pasta was excellent",
  "label": [
    {
      "aspect_term": "pasta",
      "opinion_term": "excellent"
    }
  ]
}
```

The tool will automatically add position data on startup:
```json
{
  "text": "The pasta was excellent", 
  "label": [
    {
      "aspect_term": "pasta",
      "opinion_term": "excellent",
      "at_start": 4,
      "at_end": 8,
      "ot_start": 14,
      "ot_end": 22
    }
  ]
}
```

**Usage:**
- **Default**: Auto-position filling is disabled
- **Enable**: Use `--auto-positions` flag to enable this preprocessing step
- **Algorithm**: Uses first occurrence of each phrase in the text 

**Important**: Position data is only saved when the corresponding term has an actual value (not NULL or empty). This ensures data consistency and prevents storing meaningless position information for implicit aspects/opinions.

To disable position saving entirely, use the `--disable-save-positions` CLI option.

### Automatic Phrase Cleaning

By default, the tool automatically cleans selected phrases by:
- Trimming whitespace from start and end
- Removing common punctuation marks: `. , ; : ! ? ¡ ¿ " ' ` ´ ' ' " " „ « » ( ) [ ] { }`
- Adjusting saved positions to match the cleaned phrase

**Examples:**
- `"amazing!"` → `amazing` (exclamation mark removed)
- ` , great,  ` → `great` (whitespace and commas removed)
- `(excellent)` → `excellent` (parentheses removed)

This ensures consistent annotation quality and removes common annotation errors. To disable phrase cleaning, use the `--disable-clean-phrases` CLI option.

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
   ./absa-annotator examples/restaurant_reviews.csv      # CSV format
   ./absa-annotator examples/restaurant_reviews.json     # JSON format
   ```

2. **Use saved configuration:**
   ```bash
   ./absa-annotator examples/restaurant_reviews.json --load-config examples/example_config.json
   ```

3. **Create and save configuration:**
   ```bash
   ./absa-annotator examples/restaurant_reviews.csv --elements aspect_term sentiment_polarity --save-config examples/my_config.json
   ```

4. **Advanced: Load config and override settings:**
   ```bash
   ./absa-annotator examples/restaurant_reviews.json --load-config examples/example_config.json --polarities positive negative excited
   ```

5. **Open browser** at `http://localhost:3000` and start annotating!
   - **Dark Mode**: Click the 🌙/☀️ toggle in the top-right corner to switch themes
   - **Theme Persistence**: Your preferred theme is automatically saved and restored

---

## 🤝 Contributing

Feel free to open issues or submit pull requests to improve the tool!

## 📧 Contact

For questions, suggestions, or support, please reach out:

**Nils Constantin Hellwig**  
📧 [Nils-Constantin.Hellwig@ur.de](mailto:Nils-Constantin.Hellwig@ur.de)

---

<div align="center">
  <sub>Built with ❤️ for the NLP community</sub>
</div>
