#!/usr/bin/env python3
"""
ABSA Annotation Tool CLI
A command-line interface for configuring the ABSA annotation tool.
"""

import argparse
import json
import sys
import os
from typing import List, Dict, Any

class ABSAAnnotatorConfig:
    """Configuration manager for ABSA annotation tool."""
    
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.config = {
            "csv_path": csv_path,
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
    
    def get_config(self) -> Dict[str, Any]:
        """Get the current configuration."""
        return self.config.copy()
    
    def save_config(self, output_path: str = "absa_config.json") -> None:
        """Save configuration to JSON file."""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, indent=2, ensure_ascii=False)
        print(f"✅ Configuration saved to {output_path}")
    
    def print_config(self) -> None:
        """Print the current configuration in a formatted way."""
        print("🎯 ABSA Annotator Configuration")
        print("=" * 40)
        print(f"📄 CSV Path: {self.config['csv_path']}")
        print(f"🏷️  Sentiment Elements: {', '.join(self.config['sentiment_elements'])}")
        print(f"😊 Sentiment Polarities: {', '.join(self.config['sentiment_polarity_options'])}")
        print(f"📝 Aspect Categories: {len(self.config['aspect_categories'])} categories")
        print(f"🔍 Implicit Aspect Terms: {'✅' if self.config['implicit_aspect_term_allowed'] else '❌'}")
        print(f"💭 Implicit Opinion Terms: {'✅' if self.config['implicit_opinion_term_allowed'] else '❌'}")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="🎯 ABSA Annotation Tool - Configure your annotation settings",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage with CSV path
  python cli.py /path/to/annotations.csv
  
  # Configure all sentiment elements  
  python cli.py data.csv --elements aspect_term aspect_category sentiment_polarity opinion_term
  
  # Custom polarities
  python cli.py data.csv --polarities positive negative neutral excited disappointed
  
  # Custom categories for tech domain
  python cli.py data.csv --categories "tech performance" "tech design" "tech price" "tech support"
  
  # Configure implicit terms
  python cli.py data.csv --no-implicit-aspect --implicit-opinion
  
  # Show and save configuration
  python cli.py data.csv --show-config --save-config project_config.json
        """
    )
    
    parser.add_argument(
        "csv_path",
        help="Path to the CSV file containing the data to annotate"
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
        "--show-config",
        action="store_true",
        help="Display the current configuration"
    )
    
    args = parser.parse_args()
    
    # Check if CSV file exists
    if not os.path.exists(args.csv_path):
        print(f"❌ Error: CSV file '{args.csv_path}' not found!")
        sys.exit(1)
    
    # Initialize configuration
    config = ABSAAnnotatorConfig(args.csv_path)
    
    # Apply command line arguments
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
    
    # Show configuration if requested
    if args.show_config:
        config.print_config()
    
    # Save configuration if requested
    if args.save_config:
        config.save_config(args.save_config)
    
    print("🚀 Ready to start annotation! Run 'python main.py' to start the server.")


if __name__ == "__main__":
    main()
