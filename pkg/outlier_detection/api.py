from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os
from typing import List

from database_client import DatabaseClient
from product_outliers_db import ProductOutlierDetector
from models import (
    OutlierDetectionRequest,
    OutlierDetectionResponse,
    ProductResponse,
    OutlierProductResponse,
    HealthResponse,
    ErrorResponse
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables for database client and detector
db_client: DatabaseClient = None
detector: ProductOutlierDetector = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan - startup and shutdown."""
    global db_client, detector
    
    # Startup
    logger.info("Starting outlier detection service...")
    
    # Initialize database client
    db_client = DatabaseClient()
    await db_client.connect()
    
    # Initialize and train the outlier detection model
    detector = ProductOutlierDetector(db_client)
    logger.info("Training model with existing data...")
    await detector.train()
    logger.info("Model training completed")
    
    logger.info("Outlier detection service started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down outlier detection service...")
    if db_client:
        await db_client.disconnect()
    logger.info("Outlier detection service shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="Outlier Detection Service",
    description="A service for detecting outliers in recycled waste percentage data",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get database client
async def get_db_client() -> DatabaseClient:
    if db_client is None:
        raise HTTPException(status_code=503, detail="Database client not initialized")
    return db_client

# Dependency to get detector
async def get_detector() -> ProductOutlierDetector:
    if detector is None:
        raise HTTPException(status_code=503, detail="Outlier detector not initialized")
    return detector

@app.get("/", response_model=dict)
async def root():
    """Root endpoint with service information."""
    return {
        "service": "Outlier Detection Service",
        "version": "1.0.0",
        "description": "Detect outliers in recycled waste percentage data"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    db_connected = db_client is not None and hasattr(db_client, '_is_connected') and db_client._is_connected
    model_trained = detector is not None and detector.model is not None
    
    return HealthResponse(
        status="healthy" if db_connected and model_trained else "unhealthy",
        database_connected=db_connected,
        model_trained=model_trained
    )

@app.post("/outliers", response_model=OutlierDetectionResponse)
async def detect_outlier(
    request: OutlierDetectionRequest,
    detector_instance: ProductOutlierDetector = Depends(get_detector)
):
    """
    Detect if a recycled waste percentage is an outlier.
    
    Args:
        request: OutlierDetectionRequest containing the recycled waste percentage
        detector_instance: ProductOutlierDetector instance
        
    Returns:
        OutlierDetectionResponse with outlier status and score
    """
    try:
        is_outlier, score = await detector_instance.predict(request.recycledWastePercentage)
        
        logger.info(f"Outlier detection result for {request.recycledWastePercentage}%: "
                   f"is_outlier={is_outlier}, score={score}")
        
        return OutlierDetectionResponse(
            outlier=bool(is_outlier),
            score=score,
            recycledWastePercentage=request.recycledWastePercentage
        )
        
    except Exception as e:
        logger.error(f"Error in outlier detection: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in outlier detection: {str(e)}")

@app.get("/outliers", response_model=List[OutlierProductResponse])
async def get_outliers(detector_instance: ProductOutlierDetector = Depends(get_detector)):
    """
    Get all outliers in the current dataset.
    
    Returns:
        List of outlier products with their scores
    """
    try:
        outliers = await detector_instance.get_all_outliers()
        return [OutlierProductResponse(**outlier) for outlier in outliers]
        
    except Exception as e:
        logger.error(f"Error retrieving outliers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving outliers: {str(e)}")

@app.post("/retrain", response_model=dict)
async def retrain_model(detector_instance: ProductOutlierDetector = Depends(get_detector)):
    """
    Retrain the outlier detection model with current data.
    
    Returns:
        Success message
    """
    try:
        await detector_instance.train()
        return {"message": "Model retrained successfully"}
        
    except Exception as e:
        logger.error(f"Error retraining model: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retraining model: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment variable or use default
    port = int(os.getenv("PORT", "8000"))
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    ) 