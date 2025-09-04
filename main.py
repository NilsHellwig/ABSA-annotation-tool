from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from fastapi import HTTPException

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React App
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
    return {
        "sentiment elements": ["aspect_term", "aspect_category", "sentiment_polarity", "opinion_term"],
        "total_count": get_total_count(),
        "sentiment_polarity options": ["positive", "negative", "neutral"],
        "aspect_categories": ["food general", "food quality", "food style options", "food healthy", "service general", "service attitude", "service speed", "price general", "price level", "ambience general", "ambience decor", "ambience style", "location general", "location parking", "location access", "restaurant general", "restaurant variety", "restaurant specialty"],
        "implicit_aspect_term_allowed": True,
        "implicit_opinion_term_allowed": False,
        "current_index": get_current_index(),
        "max_number_of_idxs": max_number_of_idxs()
    }

@app.get("/data/{data_idx}")
def get_data(data_idx: int):
    try:
        df = pd.read_csv("annotations.csv")
        if data_idx >= len(df) or data_idx < 0:
            raise HTTPException(status_code=404, detail="Index out of range")
        row = df.iloc[data_idx]
        # Konvertiere NaN Werte zu None für JSON-Kompatibilität
        row_dict = row.to_dict()
        print(row_dict)
        # Ersetze NaN/inf Werte durch None
        for key, value in row_dict.items():
            if pd.isna(value) or (isinstance(value, float) and (value == float('inf') or value == float('-inf'))):
                row_dict[key] = ""
        return row_dict
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="annotations.csv not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_total_count():
    try:
        df = pd.read_csv("annotations.csv")
        return len(df)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="annotations.csv not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
def get_current_index():
    try:
        df = pd.read_csv("annotations.csv")
        # Finde den ersten Index wo die 'label' Spalte leer ist
        for idx in range(len(df)):
            if pd.isna(df.iloc[idx]['label']) or df.iloc[idx]['label'] == "":
                return idx
        # Falls alle Zeilen ein Label haben, gib die Gesamtanzahl zurück
        return len(df)
    except FileNotFoundError:
        return 0
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
def max_number_of_idxs():
    try:
        df = pd.read_csv("annotations.csv")
        return len(df)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="annotations.csv not found")
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
        df = pd.read_csv("annotations.csv")
        if data_idx >= len(df) or data_idx < 0:
            raise HTTPException(status_code=404, detail="Index out of range")
        
        # Convert annotations list to JSON string for storage
        import json
        annotations_json = json.dumps(annotation_data.value)
        df.at[data_idx, 'label'] = annotations_json
        df.to_csv("annotations.csv", index=False)
        return {"message": "Annotations saved successfully"}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="annotations.csv not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
