from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import json
import os
from fastapi import HTTPException

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
            "food general", "food quality", "food style options", "food healthy",
            "service general", "service attitude", "service speed",
            "price general", "price level",
            "ambience general", "ambience decor", "ambience style",
            "location general", "location parking", "location access",
            "restaurant general", "restaurant variety", "restaurant specialty"
        ],
        "implicit_aspect_term_allowed": True,
        "implicit_opinion_term_allowed": False,
        "auto_clean_phrases": True,
        "save_phrase_positions": True
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
    allow_origins=["*"],  # Allow all origins for flexibility with different IPs/ports
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
        "aspect_categories": CONFIG_DATA.get("aspect_categories", ["food general", "food quality", "food style options", "food healthy", "service general", "service attitude", "service speed", "price general", "price level", "ambience general", "ambience decor", "ambience style", "location general", "location parking", "location access", "restaurant general", "restaurant variety", "restaurant specialty"]),
        "implicit_aspect_term_allowed": CONFIG_DATA.get("implicit_aspect_term_allowed", True),
        "implicit_opinion_term_allowed": CONFIG_DATA.get("implicit_opinion_term_allowed", False),
        "auto_clean_phrases": CONFIG_DATA.get("auto_clean_phrases", True),
        "save_phrase_positions": CONFIG_DATA.get("save_phrase_positions", True),
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
        
        if DATA_FILE_TYPE == "json":
            item = data[data_idx]
            # Check if item has been annotated
            if 'label' in item:
                # Item has been annotated (could be empty list or list with annotations)
                label_value = json.dumps(item['label']) if item['label'] else ""
            else:
                # Item has not been annotated yet
                label_value = ""
            
            return {
                "text": item.get('text', ''),
                "label": label_value,
                "translation": item.get('translation', '')
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
                
            return row_dict
            
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"{DATA_FILE_PATH} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_total_count():
    try:
        data = load_data()
        return len(data)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"{DATA_FILE_PATH} not found")
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
        raise HTTPException(status_code=404, detail=f"{DATA_FILE_PATH} not found")
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
        raise HTTPException(status_code=404, detail="annotations.csv not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# POST Endpoint for Annotations
@app.post("/annotations/{data_idx}")
def post_annotations(data_idx: int, annotation_data: AnnotationData):
    try:
        data = load_data()
        if data_idx >= len(data) or data_idx < 0:
            raise HTTPException(status_code=404, detail="Index out of range")
        
        if DATA_FILE_TYPE == "json":
            # Update JSON format - set "label" key with annotation data
            data[data_idx]['label'] = annotation_data.value
            save_data(data)
        else:
            # Update CSV format  
            df = data
            annotations_json = json.dumps(annotation_data.value)
            df.at[data_idx, 'label'] = annotations_json
            save_data(df)
            
        return {"message": "Annotations saved successfully"}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"{DATA_FILE_PATH} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
