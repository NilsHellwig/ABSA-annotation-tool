#!/usr/bin/env python3
"""
Script to remove 'text' key from all JSON files in predictions_random directory and subdirectories.
"""

import json
import os
from pathlib import Path

def remove_text_key_from_json_files(base_path):
    """Remove 'text' key from all JSON files in the given directory and subdirectories."""
    base_dir = Path(base_path)
    if not base_dir.exists():
        print(f"Directory {base_path} does not exist!")
        return

    # Find all JSON files recursively
    json_files = list(base_dir.rglob('*.json'))
    print(f"Found {len(json_files)} JSON files in {base_path}")

    files_processed = 0
    files_modified = 0
    errors = []

    for json_file in json_files:
        files_processed += 1
        try:
            # Read the JSON file
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Track if any changes were made
            modified = False

            # Handle different JSON structures
            if isinstance(data, list):
                # If it's a list of objects
                for item in data:
                    if isinstance(item, dict) and 'text' in item:
                        del item['text']
                        modified = True
            elif isinstance(data, dict):
                # If it's a single object
                if 'text' in data:
                    del data['text']
                    modified = True

            # Write back if modified
            if modified:
                with open(json_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=4, ensure_ascii=False)
                files_modified += 1
                print(f"✓ Modified: {json_file}")
            else:
                print(f"  Skipped (no 'text' key): {json_file}")

        except Exception as e:
            error_msg = f"Error processing {json_file}: {str(e)}"
            errors.append(error_msg)
            print(f"✗ {error_msg}")

    # Print summary
    print("\n" + "="*50)
    print("SUMMARY")
    print("="*50)
    print(f"Files processed: {files_processed}")
    print(f"Files modified: {files_modified}")
    print(f"Errors: {len(errors)}")

    if errors:
        print("\nErrors encountered:")
        for error in errors:
            print(f"  - {error}")

if __name__ == "__main__":
    # Process predictions_random directory
    remove_text_key_from_json_files('predictions_random')