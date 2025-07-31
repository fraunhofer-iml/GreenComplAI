#!/usr/bin/env python3
"""
Setup script for Outlier Detection Service

This script handles the complete setup including Prisma configuration.
"""

import subprocess
import sys
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors."""
    print(f"🔄 {description}...")
    try:
        subprocess.run(command, shell=True, check=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        return False

def main():
    """Main setup function."""
    print("🚀 Setting up Outlier Detection Service...")
    
    # Check if we're in the right directory
    current_dir = Path(__file__).parent
    if not (current_dir / "pyproject.toml").exists():
        print("❌ Error: pyproject.toml not found. Please run this script from the pkg/outlier_detection directory.")
        sys.exit(1)
    
    # Check if root schema exists
    root_schema = current_dir.parent.parent / "prisma" / "schema.prisma"
    if not root_schema.exists():
        print(f"❌ Error: Root schema not found at {root_schema}")
        print("Please make sure you're running this from the correct directory.")
        sys.exit(1)
    
    print(f"📁 Using root schema: {root_schema}")
    
    # Install dependencies
    if not run_command("uv sync", "Installing dependencies"):
        print("💡 Trying pip install...")
        if not run_command("pip install -e .", "Installing dependencies with pip"):
            sys.exit(1)
    
    # Configure Prisma
    if not run_command("python prisma_config.py", "Configuring Prisma"):
        sys.exit(1)
    
    print("\n🎉 Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Set your DATABASE_URL environment variable")
    print("2. Run: python main.py")
    print("\n📖 For more information, see README.md")

if __name__ == "__main__":
    main() 