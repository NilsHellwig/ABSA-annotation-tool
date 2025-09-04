#!/usr/bin/env python3
"""
ABSA Annotation Tool CLI
A command-line interface for configuring and running the ABSA annotation tool.
"""

import argparse
import json
import sys
import os
import subprocess
import threading
import time
from typing import List, Dict, Any

class ABSAAnnotatorConfig:
    """Configuration manager for ABSA annotation tool."""
    
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.config = {
            "csv_path": csv_path,
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
        }
    
    def set_sentiment_elements(self, elements: List[str]) -> None:
        """Set the sentiment elements to annotate."""
        valid_elements = ["aspect_term", "aspect_category", "sentiment_polarity", "opinion_term"]
        for element in elements:
            if element not in valid_elements:
                raise ValueError(f"Invalid sentiment element: {element}. Valid options: {valid_elements}")
        self.config["sentiment_elements"] = elements
    
    def set_sentiment_polarities(self, polarities: List[str]) -> None:
        """Set the available sentiment polarities."""
        self.config["sentiment_polarity_options"] = polarities
    
    def set_aspect_categories(self, categories: List[str]) -> None:
        """Set the available aspect categories."""
        self.config["aspect_categories"] = categories
    
    def set_implicit_aspect_allowed(self, allowed: bool) -> None:
        """Set whether implicit aspect terms are allowed."""
        self.config["implicit_aspect_term_allowed"] = allowed
    
    def set_implicit_opinion_allowed(self, allowed: bool) -> None:
        """Set whether implicit opinion terms are allowed."""
        self.config["implicit_opinion_term_allowed"] = allowed
    
    def set_session_id(self, session_id: str) -> None:
        """Set the session ID for this annotation session."""
        self.config["session_id"] = session_id
    
    def get_config(self) -> Dict[str, Any]:
        """Get the current configuration."""
        return self.config.copy()
    
    def save_config(self, output_path: str = "absa_config.json") -> None:
        """Save configuration to JSON file."""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, indent=2, ensure_ascii=False)
        print(f"✅ Configuration saved to {output_path}")
    
    def load_config(self, config_path: str) -> None:
        """Load configuration from JSON file."""
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                loaded_config = json.load(f)
            
            # Update configuration with loaded values
            for key, value in loaded_config.items():
                if key in self.config:
                    self.config[key] = value
            
            print(f"✅ Configuration loaded from {config_path}")
            
        except FileNotFoundError:
            print(f"❌ Configuration file '{config_path}' not found!")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON in configuration file: {e}")
            sys.exit(1)
        except Exception as e:
            print(f"❌ Error loading configuration: {e}")
            sys.exit(1)
    
    def print_config(self) -> None:
        """Print the current configuration in a formatted way."""
        print("🎯 ABSA Annotator Configuration")
        print("=" * 40)
        print(f"📄 Data Path: {self.config['csv_path']}")
        if self.config.get('session_id'):
            print(f"🔖 Session ID: {self.config['session_id']}")
        print(f"🏷️  Sentiment Elements: {', '.join(self.config['sentiment_elements'])}")
        print(f"😊 Sentiment Polarities: {', '.join(self.config['sentiment_polarity_options'])}")
        print(f"📝 Aspect Categories: {len(self.config['aspect_categories'])} categories")
        print(f"🔍 Implicit Aspect Terms: {'✅' if self.config['implicit_aspect_term_allowed'] else '❌'}")
        print(f"💭 Implicit Opinion Terms: {'✅' if self.config['implicit_opinion_term_allowed'] else '❌'}")


def start_backend(port: int = 8000, data_path: str = None, config: ABSAAnnotatorConfig = None):
    """Start the FastAPI backend server."""
    try:
        print(f"🚀 Starting backend server on port {port}...")
        if data_path:
            os.environ['ABSA_DATA_PATH'] = data_path
        if config:
            # Save config to temporary file for backend to read
            config_file = "temp_absa_config.json"
            config.save_config(config_file)
            os.environ['ABSA_CONFIG_PATH'] = config_file
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app", "--reload", f"--port={port}"
        ], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start backend server: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n🛑 Backend server stopped by user")


def start_frontend(port: int = 3000, backend_port: int = 8000):
    """Start the React frontend development server."""
    frontend_path = os.path.join(os.getcwd(), "frontend")
    if not os.path.exists(frontend_path):
        print("❌ Frontend directory not found! Make sure you're in the project root.")
        return False
    
    try:
        print(f"🌐 Starting frontend development server on port {port}...")
        os.chdir(frontend_path)
        
        # Set environment variables for React
        env = os.environ.copy()
        env["PORT"] = str(port)
        env["REACT_APP_BACKEND_URL"] = f"http://localhost:{backend_port}"
        
        subprocess.run(["npm", "start"], check=True, env=env)
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start frontend server: {e}")
        return False
    except KeyboardInterrupt:
        print("\n🛑 Frontend server stopped by user")
        return True
    except FileNotFoundError:
        print("❌ npm not found! Please install Node.js and npm.")
        return False


def start_full_app(backend_port: int = 8000, frontend_port: int = 3000, data_path: str = None, config: ABSAAnnotatorConfig = None):
    """Start both backend and frontend servers."""
    print("🚀 Starting ABSA Annotation Tool...")
    print("=" * 50)
    
    # Start backend in a separate thread
    backend_thread = threading.Thread(target=start_backend, args=(backend_port, data_path, config))
    backend_thread.daemon = True
    backend_thread.start()
    
    # Wait a moment for backend to start
    print("⏳ Waiting for backend to initialize...")
    time.sleep(3)
    
    # Start frontend (this will block until stopped)
    try:
        start_frontend(frontend_port, backend_port)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down ABSA Annotation Tool...")
        sys.exit(0)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        prog="absa-annotator",
        description="🎯 ABSA Annotation Tool - Configure and run your annotation environment",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage with CSV path
  absa-annotator /path/to/annotations.csv
  
  # Load configuration from file and start
  absa-annotator /path/to/annotations.csv --load-config my_project.json --start
  
  # Start with a session ID
  absa-annotator /path/to/annotations.csv --session-id "user123_session1" --start
  
  # Start the full application (backend + frontend)
  absa-annotator /path/to/annotations.csv --start
  
  # Start only backend server
  absa-annotator /path/to/annotations.csv --backend --port 8001
  
  # Configure elements and save to config file with session ID
  absa-annotator data.csv --elements aspect_term sentiment_polarity --session-id "exp_2024" --save-config quick_config.json
  
  # Load config, override some settings, and start
  absa-annotator data.csv --load-config base_config.json --polarities positive negative --start
        """
    )
    
    parser.add_argument(
        "data_path",
        help="Path to the CSV or JSON file containing the data to annotate"
    )
    
    parser.add_argument(
        "--session-id",
        help="Optional session ID to identify this annotation session"
    )
    
    parser.add_argument(
        "--elements", 
        nargs="+",
        choices=["aspect_term", "aspect_category", "sentiment_polarity", "opinion_term"],
        help="Sentiment elements to annotate (default: all four elements)"
    )
    
    parser.add_argument(
        "--polarities",
        nargs="+",
        help="Available sentiment polarities (default: positive, negative, neutral)"
    )
    
    parser.add_argument(
        "--categories",
        nargs="+",
        help="Available aspect categories (default: restaurant domain categories)"
    )
    
    parser.add_argument(
        "--implicit-aspect",
        action="store_true",
        default=True,
        help="Allow implicit aspect terms (default: True)"
    )
    
    parser.add_argument(
        "--no-implicit-aspect",
        action="store_true",
        help="Disable implicit aspect terms"
    )
    
    parser.add_argument(
        "--implicit-opinion",
        action="store_true",
        help="Allow implicit opinion terms"
    )
    
    parser.add_argument(
        "--no-implicit-opinion",
        action="store_true",
        default=True,
        help="Disable implicit opinion terms (default)"
    )
    
    parser.add_argument(
        "--save-config",
        metavar="PATH",
        nargs="?",
        const="absa_config.json",
        help="Save configuration to JSON file (default: absa_config.json)"
    )
    
    parser.add_argument(
        "--load-config",
        metavar="PATH",
        help="Load configuration from JSON file"
    )
    
    parser.add_argument(
        "--show-config",
        action="store_true",
        help="Display the current configuration"
    )
    
    # Server control arguments
    parser.add_argument(
        "--start",
        action="store_true",
        help="Start both backend and frontend servers"
    )
    
    parser.add_argument(
        "--backend",
        action="store_true", 
        help="Start only the backend server"
    )
    
    parser.add_argument(
        "--backend-port",
        type=int,
        default=8000,
        help="Port for the backend server (default: 8000)"
    )
    
    parser.add_argument(
        "--frontend-port",
        type=int,
        default=3000,
        help="Port for the frontend server (default: 3000)"
    )
    
    # Keep --port for backward compatibility
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port for the backend server (deprecated, use --backend-port)"
    )
    
    args = parser.parse_args()
    
    # Check if data file exists
    if not os.path.exists(args.data_path):
        print(f"❌ Error: Data file '{args.data_path}' not found!")
        sys.exit(1)
    
    # Check file format
    file_extension = os.path.splitext(args.data_path)[1].lower()
    if file_extension not in ['.csv', '.json']:
        print(f"❌ Error: Unsupported file format '{file_extension}'. Use .csv or .json files.")
        sys.exit(1)
    
    print(f"📂 Using {file_extension[1:].upper()} file: {args.data_path}")
    if file_extension == '.csv':
        print("💡 Note: CSV file will be read/written with UTF-8 encoding")
    
    # Initialize configuration
    config = ABSAAnnotatorConfig(args.data_path)
    
    # Load configuration from file if specified (before applying command line overrides)
    if args.load_config:
        config.load_config(args.load_config)
    
    # Apply command line arguments (these override loaded config)
    if args.elements:
        config.set_sentiment_elements(args.elements)
    
    if args.polarities:
        config.set_sentiment_polarities(args.polarities)
    
    if args.categories:
        config.set_aspect_categories(args.categories)
    
    if args.no_implicit_aspect:
        config.set_implicit_aspect_allowed(False)
    elif args.implicit_aspect:
        config.set_implicit_aspect_allowed(True)
    
    if args.implicit_opinion:
        config.set_implicit_opinion_allowed(True)
    elif args.no_implicit_opinion:
        config.set_implicit_opinion_allowed(False)
    
    if args.session_id:
        config.set_session_id(args.session_id)
    
    # Show configuration if requested
    if args.show_config:
        config.print_config()
    
    # Save configuration if requested
    if args.save_config:
        config.save_config(args.save_config)
    
    # Start servers if requested
    # Use new port arguments if provided, otherwise fall back to --port for backward compatibility
    backend_port = args.backend_port if args.backend_port != 8000 else args.port
    frontend_port = args.frontend_port
    
    if args.start:
        start_full_app(backend_port, frontend_port, args.data_path, config)
    elif args.backend:
        start_backend(backend_port, args.data_path, config)
    else:
        print("🚀 Ready to start annotation!")
        print("💡 Use --start to launch both servers, or --backend for backend only")
        print(f"   Example: absa-annotator {args.data_path} --start")


if __name__ == "__main__":
    main()
