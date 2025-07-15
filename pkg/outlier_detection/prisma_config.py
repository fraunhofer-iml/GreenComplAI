#!/usr/bin/env python3
"""
Prisma Configuration for Outlier Detection Service

This script configures Prisma to use the root schema file instead of a local copy.
"""

import os
import subprocess
import sys
from pathlib import Path

def setup_prisma():
    """Setup Prisma to use the root schema file."""
    
    # Get the current directory (pkg/outlier_detection)
    current_dir = Path(__file__).parent.absolute()
    
    # Get the root directory (two levels up)
    root_dir = current_dir.parent.parent
    
    # Path to the root schema file
    schema_path = root_dir / "prisma" / "schema.prisma"
    
    if not schema_path.exists():
        print(f"Error: Schema file not found at {schema_path}")
        schema_path = current_dir / "prisma" / "schema.prisma"
        if not schema_path.exists():
            print(f"Error: Schema file not found at {schema_path}")
            sys.exit(1)
    
    print(f"Using schema file: {schema_path}")
    
    # Set the PRISMA_SCHEMA environment variable
    os.environ["PRISMA_SCHEMA"] = str(schema_path)
    
    # Generate the Prisma client
    try:
        subprocess.run([
            "prisma", "generate", 
            "--schema", str(schema_path),
            "--generator", "pyclient"
        ], check=True)
        print("Prisma client generated successfully")
    except subprocess.CalledProcessError as e:
        print(f"Error generating Prisma client: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print("Error: prisma command not found. Make sure Prisma CLI is installed.")
        sys.exit(1)

if __name__ == "__main__":
    setup_prisma() 