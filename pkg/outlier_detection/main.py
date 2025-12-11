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
from api import app

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def run_setup():
    """Run the setup script before starting the application."""
    logger.info("Running setup script...")
    
    current_dir = Path(__file__).parent
    setup_script = current_dir / "setup.py"
    
    if not setup_script.exists():
        logger.warning(f"Setup script not found at {setup_script}, skipping setup")
        return True
    
    try:
        result = subprocess.run(
            [sys.executable, str(setup_script)],
            check=True,
            capture_output=True,
            text=True
        )
        logger.info("Setup completed successfully")
        logger.debug(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Setup failed: {e}")
        logger.error(e.stderr)
        return False

def main():
    """Main function to run the FastAPI application."""
    # Run setup before starting the application
    if not run_setup():
        logger.error("Setup failed, aborting application start")
        sys.exit(1)
    
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
