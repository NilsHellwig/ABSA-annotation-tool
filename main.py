import re
import numpy as np
from rank_bm25 import BM25Okapi
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import json
import os
from fastapi import HTTPException

app = FastAPI()

# Global variable to store the data file path and type
DATA_FILE_PATH = os.environ.get('ABSA_DATA_PATH', "annotations.csv")  # Default
DATA_FILE_TYPE = "json" if DATA_FILE_PATH.endswith('.json') else "csv"
CONFIG_PATH = os.environ.get('ABSA_CONFIG_PATH', None)  # Path to config file
CONFIG_DATA = {}  # Store configuration data including session_id

# Load configuration if provided
CONFIG_PATH = os.environ.get('ABSA_CONFIG_PATH')
if CONFIG_PATH and os.path.exists(CONFIG_PATH):
    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            CONFIG_DATA = json.load(f)
    except Exception as e:
        print(f"Warning: Could not load config from {CONFIG_PATH}: {e}")

# Get auto_positions flag from loaded configuration
AUTO_POSITIONS = CONFIG_DATA.get('auto_positions', False)


def set_data_file(file_path: str):
    """Set the data file path and determine file type."""
    global DATA_FILE_PATH, DATA_FILE_TYPE
    DATA_FILE_PATH = file_path
    DATA_FILE_TYPE = "json" if file_path.endswith('.json') else "csv"


def set_config_file(config_path: str):
    """Set the config file path."""
    global CONFIG_PATH
    CONFIG_PATH = config_path


def load_config():
    """Load configuration from JSON file."""
    if CONFIG_PATH and os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    # Return default configuration if no config file
    return {
        "session_id": None,
        "sentiment_elements": ["aspect_term", "aspect_category", "sentiment_polarity", "opinion_term"],
        "sentiment_polarity_options": ["positive", "negative", "neutral"],
        "aspect_categories": [
            'location general', 'food prices', 'food quality', 'food general',
            'ambience general', 'service general', 'restaurant prices',
            'drinks prices', 'restaurant miscellaneous', 'drinks quality',
            'drinks style_options', 'restaurant general', 'food style_options'
        ],
        "implicit_aspect_term_allowed": True,
        "implicit_opinion_term_allowed": False,
        "auto_clean_phrases": True,
        "save_phrase_positions": True,
        "click_on_token": True,
        "store_time": False,
        "display_avg_annotation_time": False,
        "enable_pre_prediction": False
    }


def set_config(config_dict: dict):
    """Set the configuration data including session_id."""
    global CONFIG_DATA
    CONFIG_DATA = config_dict


def load_data():
    """Load data from CSV or JSON file with UTF-8 encoding."""
    if DATA_FILE_TYPE == "json":
        with open(DATA_FILE_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        return pd.read_csv(DATA_FILE_PATH, encoding='utf-8')


def save_data(data):
    """Save data to CSV or JSON file with UTF-8 encoding."""
    if DATA_FILE_TYPE == "json":
        with open(DATA_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    else:
        if isinstance(data, list):
            # Convert list of dicts to DataFrame
            df = pd.DataFrame(data)
        else:
            df = data
        df.to_csv(DATA_FILE_PATH, index=False, encoding='utf-8')


app.add_middleware(
    CORSMiddleware,
    # Allow all origins for flexibility with different IPs/ports
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Datenmodell für POST Requests
class Item(BaseModel):
    name: str
    value: int

# Datenmodell für Annotations


class AnnotationData(BaseModel):
    name: str
    value: list

# GET Endpoint


@app.get("/settings")
def get_settings():
    settings = {
        "sentiment elements": CONFIG_DATA.get("sentiment_elements", ["aspect_term", "aspect_category", "sentiment_polarity", "opinion_term"]),
        "total_count": get_total_count(),
        "sentiment_polarity options": CONFIG_DATA.get("sentiment_polarity_options", ["positive", "negative", "neutral"]),
        "aspect_categories": CONFIG_DATA.get("aspect_categories", ['location general', 'food prices', 'food quality', 'food general',
                                                                   'ambience general', 'service general', 'restaurant prices',
                                                                   'drinks prices', 'restaurant miscellaneous', 'drinks quality',
                                                                   'drinks style_options', 'restaurant general', 'food style_options']),
        "implicit_aspect_term_allowed": CONFIG_DATA.get("implicit_aspect_term_allowed", True),
        "implicit_opinion_term_allowed": CONFIG_DATA.get("implicit_opinion_term_allowed", False),
        "auto_clean_phrases": CONFIG_DATA.get("auto_clean_phrases", True),
        "save_phrase_positions": CONFIG_DATA.get("save_phrase_positions", True),
        "click_on_token": CONFIG_DATA.get("click_on_token", True),
        "store_time": CONFIG_DATA.get("store_time", False),
        "display_avg_annotation_time": CONFIG_DATA.get("display_avg_annotation_time", False),
        "enable_pre_prediction": CONFIG_DATA.get("enable_pre_prediction", CONFIG_DATA.get("enable_preprediction", False)),
        "disable_ai_automatic_prediction": CONFIG_DATA.get("disable_ai_automatic_prediction", False),
        "annotation_guideline": CONFIG_DATA.get("annotation_guideline", None),
        "current_index": get_current_index(),
        "max_number_of_idxs": max_number_of_idxs()
    }

    # Add session_id if it exists
    if CONFIG_DATA.get("session_id"):
        settings["session_id"] = CONFIG_DATA["session_id"]

    return settings


@app.get("/data/{data_idx}")
def get_data(data_idx: int):
    try:
        data = load_data()
        if data_idx >= len(data) or data_idx < 0:
            raise HTTPException(status_code=404, detail="Index out of range")

        default_aspects = CONFIG_DATA.get("aspect_categories", ['location general', 'food prices', 'food quality', 'food general',
                                                                'ambience general', 'service general', 'restaurant prices',
                                                                'drinks prices', 'restaurant miscellaneous', 'drinks quality',
                                                                'drinks style_options', 'restaurant general', 'food style_options'])

        if DATA_FILE_TYPE == "json":
            item = data[data_idx]
            # Check if item has been annotated
            if 'label' in item:
                # Item has been annotated (could be empty list or list with annotations)
                label_value = json.dumps(
                    item['label']) if item['label'] else ""
            else:
                # Item has not been annotated yet
                label_value = ""

            # Determine aspect categories for this example
            aspects = item.get('aspect_category_list', default_aspects)
            return {
                "text": item.get('text', ''),
                "label": label_value,
                "translation": item.get('translation', ''),
                "aspect_category_list": aspects
            }
        else:
            # CSV handling
            df = data
            row = df.iloc[data_idx]
            row_dict = row.to_dict()
            # Replace NaN values with empty strings
            for key, value in row_dict.items():
                if pd.isna(value) or (isinstance(value, float) and (value == float('inf') or value == float('-inf'))):
                    row_dict[key] = ""
            # Ensure translation field exists
            if 'translation' not in row_dict:
                row_dict['translation'] = ""
            # Determine aspect categories for this example (CSV column or default)
            raw_aspects = row_dict.get('aspect_category_list', None)
            if raw_aspects:
                aspects = raw_aspects
            else:
                aspects = default_aspects
            row_dict['aspect_category_list'] = aspects
            return row_dict

    except FileNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"{DATA_FILE_PATH} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_total_count():
    try:
        data = load_data()
        return len(data)
    except FileNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"{DATA_FILE_PATH} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_current_index():
    try:
        data = load_data()
        if DATA_FILE_TYPE == "json":
            # Find first entry that doesn't have a "label" key (not annotated yet)
            for idx, item in enumerate(data):
                if 'label' not in item:
                    return idx
            return len(data)  # All entries have been annotated
        else:
            # CSV handling
            df = data
            for idx in range(len(df)):
                if pd.isna(df.iloc[idx]['label']) or df.iloc[idx]['label'] == "":
                    return idx
            return len(df)
    except FileNotFoundError:
        return 0
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def max_number_of_idxs():
    try:
        data = load_data()
        return len(data)
    except FileNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"{DATA_FILE_PATH} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# POST Endpoint


@app.post("/data/{data_idx}")
def post_data(data_idx: int, item: Item):
    # add value to row label
    try:
        df = pd.read_csv("annotations.csv")
        if data_idx >= len(df) or data_idx < 0:
            raise HTTPException(status_code=404, detail="Index out of range")
        df.at[data_idx, 'label'] = item.value
        df.to_csv("annotations.csv", index=False)
        return {"message": "Data updated successfully"}
    except FileNotFoundError:
        raise HTTPException(
            status_code=404, detail="annotations.csv not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# POST Endpoint for Annotations


@app.post("/annotations/{data_idx}")
def post_annotations(data_idx: int, annotation_data: AnnotationData):
    try:
        data = load_data()
        if data_idx >= len(data) or data_idx < 0:
            raise HTTPException(status_code=404, detail="Index out of range")

        annotation_data = annotation_data.value

        if DATA_FILE_TYPE == "json":
            # Update JSON format - set "label" key with annotation data
            data[data_idx]['label'] = annotation_data
            save_data(data)
        else:
            # Update CSV format
            df = data
            annotations_json = json.dumps(annotation_data)
            df.at[data_idx, 'label'] = annotations_json
            save_data(df)

        return {"message": "Annotations saved successfully"}
    except FileNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"{DATA_FILE_PATH} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Timing-Logik: Speichere pro Beispiel eine Liste von {duration, change}


@app.post("/timing/{data_idx}")
def post_timing(data_idx: int, timing: dict):
    """Speichere Timing-Informationen für ein Beispiel (append an Liste)."""
    try:
        data = load_data()
        if data_idx >= len(data) or data_idx < 0:
            raise HTTPException(status_code=404, detail="Index out of range")
        timing_entry = {"duration": timing.get(
            "duration", 0), "change": timing.get("change", False)}
        if DATA_FILE_TYPE == "json":
            item = data[data_idx]
            if "timings" not in item or not isinstance(item["timings"], list):
                item["timings"] = []
            item["timings"].append(timing_entry)
            save_data(data)
        else:
            df = data
            timings_col = df.at[data_idx,
                                "timings"] if "timings" in df.columns else None
            try:
                timings = json.loads(timings_col) if timings_col else []
            except Exception:
                timings = []
            timings.append(timing_entry)
            df.at[data_idx, "timings"] = json.dumps(
                timings, ensure_ascii=False)
            save_data(df)
        return {"message": "Timing gespeichert"}
    except FileNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"{DATA_FILE_PATH} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def find_phrase_positions(text: str, phrase: str):
    """
    Find start and end positions of a phrase in text.
    Returns tuple (start, end) or (None, None) if not found.
    """
    if not phrase or phrase == "NULL" or not text:
        return None, None

    # Try exact match first
    index = text.find(phrase)
    if index != -1:
        return index, index + len(phrase) - 1

    # If exact match fails, try case-insensitive match
    index = text.lower().find(phrase.lower())
    if index != -1:
        return index, index + len(phrase) - 1

    return None, None


def auto_add_missing_positions():
    """Automatically add missing position data for existing phrases."""
    if not AUTO_POSITIONS:
        print("ℹ️  Auto position filling disabled (use --auto-positions to enable)")
        return

    print("🔍 Scanning for missing position data...")

    try:
        data = load_data()
        data_changed = False
        updated_count = 0

        if DATA_FILE_TYPE == "json":
            # Handle JSON format
            for item in data:
                if 'text' not in item:
                    continue

                text = item['text']
                label_data = item.get('label', [])

                # Handle both string and array formats
                if isinstance(label_data, str):
                    if not label_data or label_data == '':
                        continue
                    try:
                        annotations = json.loads(label_data)
                    except (json.JSONDecodeError, TypeError):
                        continue
                else:
                    # Already an array
                    annotations = label_data

                if not isinstance(annotations, list):
                    continue

                annotations_updated = False

                for annotation in annotations:
                    # Check aspect_term positions
                    if ('aspect_term' in annotation and
                        annotation['aspect_term'] and
                        annotation['aspect_term'] != 'NULL' and
                            ('at_start' not in annotation or 'at_end' not in annotation)):

                        phrase = annotation['aspect_term']
                        start_pos = text.find(phrase)
                        if start_pos != -1:
                            annotation['at_start'] = start_pos
                            annotation['at_end'] = start_pos + len(phrase) - 1
                            annotations_updated = True
                            updated_count += 1

                    # Check opinion_term positions
                    if ('opinion_term' in annotation and
                        annotation['opinion_term'] and
                        annotation['opinion_term'] != 'NULL' and
                            ('ot_start' not in annotation or 'ot_end' not in annotation)):

                        phrase = annotation['opinion_term']
                        start_pos = text.find(phrase)
                        if start_pos != -1:
                            annotation['ot_start'] = start_pos
                            annotation['ot_end'] = start_pos + len(phrase) - 1
                            annotations_updated = True
                            updated_count += 1

                if annotations_updated:
                    # Store as array, not as JSON string
                    item['label'] = annotations
                    data_changed = True

        else:
            # Handle CSV format
            for idx, row in data.iterrows():
                if pd.isna(row.get('text')):
                    continue

                text = row['text']
                label_str = row.get('label', '')

                if not label_str or pd.isna(label_str) or label_str == '':
                    continue

                try:
                    annotations = json.loads(label_str)
                    if not isinstance(annotations, list):
                        continue

                    annotations_updated = False

                    for annotation in annotations:
                        # Check aspect_term positions
                        if ('aspect_term' in annotation and
                            annotation['aspect_term'] and
                            annotation['aspect_term'] != 'NULL' and
                                ('at_start' not in annotation or 'at_end' not in annotation)):

                            phrase = annotation['aspect_term']
                            start_pos = text.find(phrase)
                            if start_pos != -1:
                                annotation['at_start'] = start_pos
                                annotation['at_end'] = start_pos + \
                                    len(phrase) - 1
                                annotations_updated = True
                                updated_count += 1

                        # Check opinion_term positions
                        if ('opinion_term' in annotation and
                            annotation['opinion_term'] and
                            annotation['opinion_term'] != 'NULL' and
                                ('ot_start' not in annotation or 'ot_end' not in annotation)):

                            phrase = annotation['opinion_term']
                            start_pos = text.find(phrase)
                            if start_pos != -1:
                                annotation['ot_start'] = start_pos
                                annotation['ot_end'] = start_pos + \
                                    len(phrase) - 1
                                annotations_updated = True
                                updated_count += 1

                    if annotations_updated:
                        data.at[idx, 'label'] = json.dumps(
                            annotations, ensure_ascii=False)
                        data_changed = True

                except (json.JSONDecodeError, TypeError):
                    continue

        if data_changed:
            save_data(data)
            print(
                f"✅ Auto-added {updated_count} missing position entries and saved to {DATA_FILE_PATH}")
        else:
            print("ℹ️  No missing positions found")

    except Exception as e:
        print(f"❌ Error during auto position filling: {e}")

# POST Endpoint to manually trigger position data addition


@app.post("/auto-add-positions")
def manual_auto_add_positions():
    """Manually trigger the auto-addition of missing position data."""
    try:
        auto_add_missing_positions()
        return {"message": "Position data auto-addition completed successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error adding position data: {str(e)}")


def predict_llm(text, considered_sentiment_elements, examples, aspect_categories, polarities, allow_implicit_aspect_terms=False, allow_implicit_opinion_terms=False, n_few_shot=10, llm_model="gemma3:4b"):
    from ollama import generate
    from pydantic import BaseModel, create_model

    prompt_head = "According to the following sentiment elements definition: \n\n"

    if "aspect_term" in considered_sentiment_elements:
        prompt_head += "- The 'aspect term' is the exact word or phrase in the text that represents a specific feature, attribute, or aspect of a product or service that a user may express an opinion about. "
        if allow_implicit_aspect_terms:
            prompt_head += "The aspect term might be 'NULL' for implicit aspect."
        prompt_head += "\n"
    if "aspect_category" in considered_sentiment_elements:
        prompt_head += f"- The 'aspect category' refers to the category that aspect belongs to, and the available categories includes: {', '.join(aspect_categories)}.\n"
    if "sentiment_polarity" in considered_sentiment_elements:
        prompt_head += f"- The 'sentiment polarity' refers to the degree of positivity, negativity or neutrality expressed in the opinion towards a particular aspect or feature of a product or service, and the available polarities include: {', '.join(polarities)}.\n"
    if "opinion_term" in considered_sentiment_elements:
        prompt_head += "- The 'opinion term' is the exact word or phrase in the text that refers to the sentiment or attitude expressed by a user towards a particular aspect or feature of a product or service. "
        if allow_implicit_opinion_terms:
            prompt_head += "The opinion term might be 'NULL' for implicit opinion."
        prompt_head += "\n"

    prompt_head += "\nRecognize all sentiment elements with their corresponding "
    for element in considered_sentiment_elements:
        prompt_head += element.replace("_", " ") + "s, "
    prompt_head = prompt_head[:-2]  # remove last comma and space
    prompt_head += " in the following text in the form of a list of objects, each object having key(s) "
    for element in considered_sentiment_elements:
        prompt_head += f"'{element.replace('_', ' ')}', "
    prompt_head = prompt_head[:-2]  # remove last comma and space
    prompt_head += ".\n\n"

    few_shot_examples = get_most_similar_examples(text, examples, n=n_few_shot)

    prompt = prompt_head + "Here are some examples:\n"
    for ex in few_shot_examples:
        prompt += f"Text: {ex['text']}\n"
        prompt += "Sentiment elements: ["
        for label in ex['label']:
            prompt += "("
            for element in considered_sentiment_elements:
                prompt += f"'{element.replace('_', ' ')}': '{label[element]}', "
            prompt = prompt[:-2]  # remove last comma and space
            prompt += "), "
        prompt = prompt[:-2]  # remove last comma and space
        prompt += "]\n"
    prompt += f"Text: {text}\nSentiment elements: "


    from enum import Enum
    allowed_phrases = find_valid_phrases_list(text)
    allowed_aspect_terms = allowed_phrases + \
        ["NULL"] if allow_implicit_aspect_terms else allowed_phrases
    allowed_opinion_terms = allowed_phrases + \
        ["NULL"] if allow_implicit_opinion_terms else allowed_phrases

    AspectEnum = Enum("AspectEnum", {p: p for p in allowed_aspect_terms})
    OpinionEnum = Enum("OpinionEnum", {p: p for p in allowed_opinion_terms})
    PolarityEnum = Enum("PolarityEnum", {p: p for p in polarities})
    CategoryEnum = Enum("CategoryEnum", {c: c for c in aspect_categories})

    # Mapping von Namen -> Typen
    field_types = {
        "aspect_term": (AspectEnum, ...),
        "aspect_category": (CategoryEnum, ...),
        "opinion_term": (OpinionEnum, ...),
        "sentiment_polarity": (PolarityEnum, ...)
    }

    # dynamisch Modell bauen
    SentimentElement = create_model(
        "SentimentElement",
        **{name: field_types[name] for name in considered_sentiment_elements}
    )

    class Aspects(BaseModel):
        aspects: list[SentimentElement]

    response = generate(
        prompt=prompt,
        model=llm_model,
        raw=True,
        options={"temperature": 0.0, "max_tokens": 1024},
        format=Aspects.model_json_schema()
    )

    # response.message.content is a JSON string
    aspects = Aspects.model_validate_json(response.response)

    if not aspects.aspects:
        return [], few_shot_examples
    else:
        return json.loads(response.response), few_shot_examples


def predict_openai(text, considered_sentiment_elements, examples, aspect_categories, polarities, allow_implicit_aspect_terms=False, allow_implicit_opinion_terms=False, n_few_shot=10, llm_model="gpt-4o-2024-08-06", openai_key=None):
    """Predict sentiment elements using OpenAI's structured output."""
    from openai import OpenAI
    from pydantic import BaseModel, create_model
    from enum import Enum
    
    if not openai_key:
        raise ValueError("OpenAI API key is required for OpenAI predictions")
    
    client = OpenAI(api_key=openai_key)
    
    # Build dynamic pydantic model based on considered sentiment elements
    allowed_phrases = find_valid_phrases_list(text)
    allowed_aspect_terms = allowed_phrases + ["NULL"] if allow_implicit_aspect_terms else allowed_phrases
    allowed_opinion_terms = allowed_phrases + ["NULL"] if allow_implicit_opinion_terms else allowed_phrases

    AspectEnum = Enum("AspectEnum", {p: p for p in allowed_aspect_terms})
    OpinionEnum = Enum("OpinionEnum", {p: p for p in allowed_opinion_terms})
    PolarityEnum = Enum("PolarityEnum", {p: p for p in polarities})
    CategoryEnum = Enum("CategoryEnum", {c: c for c in aspect_categories})

    # Mapping von Namen -> Typen
    field_types = {
        "aspect_term": (AspectEnum, ...),
        "aspect_category": (CategoryEnum, ...),
        "opinion_term": (OpinionEnum, ...),
        "sentiment_polarity": (PolarityEnum, ...)
    }

    # dynamisch Modell bauen
    SentimentElement = create_model(
        "SentimentElement",
        **{name: field_types[name] for name in considered_sentiment_elements}
    )

    class Aspects(BaseModel):
        aspects: list[SentimentElement]

    # Build prompt similar to Ollama version
    prompt_head = "According to the following sentiment elements definition: \n\n"

    if "aspect_term" in considered_sentiment_elements:
        prompt_head += "- The 'aspect term' is the exact word or phrase in the text that represents a specific feature, attribute, or aspect of a product or service that a user may express an opinion about. "
        if allow_implicit_aspect_terms:
            prompt_head += "The aspect term might be 'NULL' for implicit aspect."
        prompt_head += "\n"
    if "aspect_category" in considered_sentiment_elements:
        prompt_head += f"- The 'aspect category' refers to the category that aspect belongs to, and the available categories includes: {', '.join(aspect_categories)}.\n"
    if "sentiment_polarity" in considered_sentiment_elements:
        prompt_head += f"- The 'sentiment polarity' refers to the degree of positivity, negativity or neutrality expressed in the opinion towards a particular aspect or feature of a product or service, and the available polarities include: {', '.join(polarities)}.\n"
    if "opinion_term" in considered_sentiment_elements:
        prompt_head += "- The 'opinion term' is the exact word or phrase in the text that refers to the sentiment or attitude expressed by a user towards a particular aspect or feature of a product or service. "
        if allow_implicit_opinion_terms:
            prompt_head += "The opinion term might be 'NULL' for implicit opinion."
        prompt_head += "\n"

    prompt_head += "\nRecognize all sentiment elements with their corresponding "
    for element in considered_sentiment_elements:
        prompt_head += element.replace("_", " ") + "s, "
    prompt_head = prompt_head[:-2]  # remove last comma and space
    prompt_head += " in the following text in the form of a list of objects, each object having key(s) "
    for element in considered_sentiment_elements:
        prompt_head += f"'{element.replace('_', ' ')}', "
    prompt_head = prompt_head[:-2]  # remove last comma and space
    prompt_head += ".\n\n"

    few_shot_examples = get_most_similar_examples(text, examples, n=n_few_shot)

    prompt = prompt_head + "Here are some examples:\n"
    for ex in few_shot_examples:
        prompt += f"Text: {ex['text']}\n"
        prompt += "Sentiment elements: ["
        for label in ex['label']:
            prompt += "("
            for element in considered_sentiment_elements:
                prompt += f"'{element.replace('_', ' ')}': '{label[element]}', "
            prompt = prompt[:-2]  # remove last comma and space
            prompt += "), "
        prompt = prompt[:-2]  # remove last comma and space
        prompt += "]\n"
    prompt += f"Text: {text}\nSentiment elements: "

    try:
        print("🔍 Sending request to OpenAI...")
        completion = client.beta.chat.completions.parse(
            model=llm_model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant for aspect-based sentiment analysis. Extract the sentiment elements from the given text according to the provided instructions."},
                {"role": "user", "content": prompt},
            ],
            response_format=Aspects,
            temperature=0.0
        )

        message = completion.choices[0].message
        if message.parsed:
            # Convert to same format as Ollama response
            aspects_data = {"aspects": []}
            for aspect in message.parsed.aspects:
                aspect_dict = {}
                for element in considered_sentiment_elements:
                    aspect_dict[element] = getattr(aspect, element).value
                aspects_data["aspects"].append(aspect_dict)
            
            return aspects_data, few_shot_examples
        else:
            print(f"OpenAI refused the request: {message.refusal}")
            return {"aspects": []}, few_shot_examples
            
    except Exception as e:
        print(f"Error in OpenAI prediction: {e}")
        return {"aspects": []}, few_shot_examples


# ermittel die n Beispiele die am ähnlichsten zum input text sind


def get_most_similar_examples(input_text, examples, n):
    """Return up to n most similar example annotations based on input_text using BM25"""

    # If no examples available, return empty list
    if not examples:
        return []

    # Limit n to available examples
    n = min(n, len(examples))

    # Early exit if only need 1 example and we have examples
    if n == 1 and len(examples) == 1:
        return examples

    # Convert input_text to string if it's a tuple
    if isinstance(input_text, tuple):
        input_text_str = input_text[0]  # Assume first element is the text
    else:
        input_text_str = str(input_text)

    # Extract text from examples
    example_texts = []
    for ex in examples:
        if isinstance(ex, dict) and 'text' in ex:
            text = str(ex['text'])
        elif isinstance(ex, tuple):
            text = str(ex[0])  # Assume first element is the text
        else:
            text = str(ex)
        example_texts.append(text)

    # Tokenize texts for BM25
    def tokenize(text):
        # Simple tokenization: lowercase and split on whitespace/punctuation
        return re.findall(r'\b\w+\b', text.lower())

    tokenized_examples = [tokenize(text) for text in example_texts]
    tokenized_query = tokenize(input_text_str)

    # Create BM25 model and get scores
    bm25 = BM25Okapi(tokenized_examples)
    scores = bm25.get_scores(tokenized_query)

    # Get top n indices
    if n < len(examples):
        # Get indices of top n scores
        top_indices = np.argsort(scores)[-n:][::-1]  # Sort descending
    else:
        # If we need all examples, just sort everything
        top_indices = np.argsort(scores)[::-1]

    return [examples[i] for i in top_indices]


def find_valid_phrases_list(text, max_tokens_in_phrase=None):
    phrases = []
    # identify split positions based on punctuation and spaces
    split_positions = [0]
    for match in re.finditer(r'(?<=\w)(?=[,\.\!\?\;\:])|[\s]+', text):
        split_positions.append(match.end())

    n_splits = len(split_positions)
    if max_tokens_in_phrase is None:
        max_tokens_in_phrase = n_splits

    # print all phrases between split positions
    for i in range(len(split_positions)):
        for j in range(i+1, len(split_positions)):
            phrase = text[split_positions[i]:split_positions[j]].strip()
            if phrase:
                num_tokens = len(phrase.split())
                if num_tokens <= max_tokens_in_phrase:
                    phrases.append(phrase)

    # remove phrases with special characters at the beginning or end
    phrases = [p for p in phrases if re.match(r'^[\w].*[\w]$', p)]

    return phrases


@app.get("/ai_prediction/{data_idx}")
def get_ai_prediction(data_idx: int):
    try:
        data = load_data()
        config = load_config()
        default_aspects = config.get('aspect_categories', [])
        examples = []
        # Branch by file type
        if DATA_FILE_TYPE == "json":
            # JSON data is a list of dicts
            if data_idx < 0 or data_idx >= len(data):
                raise HTTPException(
                    status_code=404, detail="Index out of range")
            item = data[data_idx]
            text = item.get('text', '')
            # Collect examples with non-empty labels
            for entry in data:
                lbl = entry.get('label', [])
                if isinstance(lbl, list) and lbl:
                    examples.append(
                        {'text': entry.get('text', ''), 'label': lbl})
            aspect_categories = item.get(
                'aspect_category_list', default_aspects)
        else:
            # CSV data is a DataFrame
            df = data
            if data_idx < 0 or data_idx >= len(df):
                raise HTTPException(
                    status_code=404, detail="Index out of range")
            # Current row
            row = df.iloc[data_idx].to_dict()
            text = row.get('text', '')
            # Collect examples with non-empty label field
            for _, r in df.iterrows():
                lbl_str = r.get('label', '')
                if pd.isna(lbl_str) or lbl_str == '':
                    continue
                try:
                    lbl = json.loads(lbl_str)
                    if isinstance(lbl, list) and lbl:
                        examples.append(
                            {'text': r.get('text', ''), 'label': lbl})
                except Exception:
                    continue
            # Determine aspect categories per example
            raw_aspects = row.get('aspect_category_list', None)
            aspect_categories = raw_aspects if raw_aspects else default_aspects

        # filter examples that are identical to the requested text
        examples = [ex for ex in examples if ex['text'] != text]

        # Check if OpenAI key is available, use OpenAI if yes, otherwise use Ollama
        openai_key = config.get('openai_key')
        if openai_key:
            predictions = predict_openai(
                text,
                config.get('sentiment_elements', [
                           "aspect_term", "aspect_category", "sentiment_polarity", "opinion_term"]),
                examples,
                aspect_categories,
                config.get('sentiment_polarity_options', [
                           "positive", "negative", "neutral"]),
                allow_implicit_aspect_terms=config.get(
                    'implicit_aspect_term_allowed', True),
                allow_implicit_opinion_terms=config.get(
                    'implicit_opinion_term_allowed', False),
                n_few_shot=10,
                llm_model=config.get('llm_model', 'gpt-4o-2024-08-06'),
                openai_key=openai_key
            )[0]
        else:
            predictions = predict_llm(
                text,
                config.get('sentiment_elements', [
                           "aspect_term", "aspect_category", "sentiment_polarity", "opinion_term"]),
                examples,
                aspect_categories,
                config.get('sentiment_polarity_options', [
                           "positive", "negative", "neutral"]),
                allow_implicit_aspect_terms=config.get(
                    'implicit_aspect_term_allowed', True),
                allow_implicit_opinion_terms=config.get(
                    'implicit_opinion_term_allowed', False),
                n_few_shot=10,
                llm_model=config.get('llm_model', 'gemma3:4b')
            )[0]
        predictions = predictions["aspects"]

        # if position saving is enabled, add positions to predictions
        if config.get('save_phrase_positions', True) and not config.get("disable-save-positions", False):
            for aspect in predictions:
                if 'aspect_term' in aspect and aspect['aspect_term'] != 'NULL':
                    start, end = find_phrase_positions(
                        text, aspect['aspect_term'])
                    aspect['at_start'] = start
                    aspect['at_end'] = end
                if 'opinion_term' in aspect and aspect['opinion_term'] != 'NULL':
                    start, end = find_phrase_positions(
                        text, aspect['opinion_term'])
                    aspect['ot_start'] = start
                    aspect['ot_end'] = end

        return predictions
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error loading prediction: {str(e)}")


@app.get("/avg-annotation-time")
def get_avg_annotation_time():
    """Calculate and return the average annotation time across all examples with timing data."""
    try:
        data = load_data()
        total_duration = 0.0
        total_entries = 0

        for idx, item in enumerate(data):
            if DATA_FILE_TYPE == "json":
                timings = item.get("timings", []) if isinstance(
                    item.get("timings"), list) else []
            else:
                # CSV: timings stored as JSON string in 'timings' column
                timings_str = item.get("timings") if hasattr(item, 'get') and callable(item.get) else (
                    data.iloc[idx]["timings"] if "timings" in data.columns and idx < len(
                        data) else None
                )
                try:
                    timings = json.loads(
                        timings_str) if timings_str and timings_str != '' else []
                except Exception:
                    timings = []

            # Sum all duration values for this example
            for timing_entry in timings:
                if isinstance(timing_entry, dict) and "duration" in timing_entry:
                    total_duration += timing_entry["duration"]
                    total_entries += 1

        avg_time = total_duration / total_entries if total_entries > 0 else 0.0

        return {
            "avg_annotation_time": round(avg_time, 2),
            "total_entries": total_entries,
            "total_duration": round(total_duration, 2)
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error calculating average annotation time: {str(e)}")


@app.on_event("startup")
async def startup_event():
    """Run startup tasks including auto-adding missing position data."""
    print(f"🚀 Starting AnnoABSA Backend...")
    print(f"📄 Data file: {DATA_FILE_PATH} (type: {DATA_FILE_TYPE})")
    if CONFIG_PATH:
        print(f"⚙️  Config file: {CONFIG_PATH}")

    # Auto-add missing position data when server starts (only if enabled)
    if AUTO_POSITIONS:
        print("🔧 Auto-positions feature enabled - scanning for missing position data...")
        auto_add_missing_positions()
    else:
        print("ℹ️  Auto-positions feature disabled (use --auto-positions to enable)")

    print("✨ Backend ready!")

# BM25-based similarity matching (no caching needed)

# Removed _load_embedding_cache function - BM25 doesn't need caching

# Removed _save_embedding_cache function - BM25 doesn't need caching

# Removed _get_sentence_model function - BM25 doesn't need sentence transformers

# Removed _get_cached_embedding function - BM25 doesn't need caching

# Removed _cleanup_embedding_cache function - BM25 doesn't need caching
