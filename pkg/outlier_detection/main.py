# Copyright Fraunhofer Institute for Material Flow and Logistics
#
# Licensed under the Apache License, Version 2.0 (the "License").
# For details on the licensing terms, see the LICENSE file.
# SPDX-License-Identifier: Apache-2.0

"""
Outlier Detection Service - HTTP API Version

This service provides HTTP endpoints for outlier detection in recycled waste percentage data.
It connects directly to the database using Prisma and provides a RESTful API.
"""

import uvicorn
import os
import logging
import subprocess
import sys
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def setup_prisma():
    """Setup Prisma client before starting the application."""
    logger.info("Setting up Prisma client...")
    
    current_dir = Path(__file__).parent
    root_dir = current_dir.parent.parent

    # Prefer a local schema (could be a symlink) in the package directory
    local_schema = current_dir / "schema.prisma"
    local_prisma_sub = current_dir / "prisma" / "schema.prisma"
    root_schema = root_dir / "prisma" / "schema.prisma"

    for p in (local_schema, local_prisma_sub, root_schema):
        if p.exists():
            schema_path = p
            break
    else:
        logger.error(f"Schema file not found in {local_schema}, {local_prisma_sub} or {root_schema}")
        return False

    logger.info(f"Using schema file: {schema_path}")
    
    # Set the PRISMA_SCHEMA environment variable
    os.environ["PRISMA_SCHEMA"] = str(schema_path)
    
    # Generate the Prisma client
    try:
        subprocess.run(
            ["prisma", "generate", "--schema", str(schema_path), "--generator", "pyclient"],
            check=True,
            capture_output=True,
            text=True
        )
        logger.info("Prisma client generated successfully")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Error generating Prisma client: {e}")
        logger.error(e.stderr)
        return False
    except FileNotFoundError:
        logger.error("prisma command not found. Make sure Prisma CLI is installed.")
        return False

def main():
    """Main function to run the FastAPI application."""
    # Setup Prisma before starting the application
    if not setup_prisma():
        logger.error("Prisma setup failed, aborting application start")
        sys.exit(1)
    
    # Import app AFTER setup to ensure Prisma client is generated
    from api import app
    
    # Get configuration from environment variables
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "false").lower() == "true"
    
    logger.info(f"Starting Outlier Detection Service on {host}:{port}")
    logger.info(f"Reload mode: {reload}")
    
    # Run the FastAPI application
    uvicorn.run(
        "api:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )

if __name__ == "__main__":
    main()
