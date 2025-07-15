from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class OutlierDetectionRequest(BaseModel):
    """Request model for outlier detection."""
    recycledWastePercentage: float = Field(..., ge=0, le=100, description="Recycled waste percentage (0-100)")

class OutlierDetectionResponse(BaseModel):
    """Response model for outlier detection."""
    outlier: bool = Field(..., description="Whether the value is identified as an outlier")
    score: float = Field(..., description="Anomaly score (negative values indicate outliers)")
    recycledWastePercentage: float = Field(..., description="The input recycled waste percentage")

class ProductResponse(BaseModel):
    """Response model for product data."""
    id: str = Field(..., description="Product ID")
    productId: str = Field(..., description="Product identifier")
    name: str = Field(..., description="Product name")
    description: Optional[str] = Field(None, description="Product description")
    category: Optional[str] = Field(None, description="Product category")
    waste: Optional[Dict[str, Any]] = Field(None, description="Waste data")
    supplier: Optional[Dict[str, Any]] = Field(None, description="Supplier information")
    manufacturer: Optional[Dict[str, Any]] = Field(None, description="Manufacturer information")

class OutlierProductResponse(BaseModel):
    """Response model for outlier product data."""
    productId: str = Field(..., description="Product identifier")
    recycledWastePercentage: float = Field(..., description="Recycled waste percentage")
    anomalyScore: float = Field(..., description="Anomaly score")

class HealthResponse(BaseModel):
    """Response model for health check."""
    status: str = Field(..., description="Service status")
    database_connected: bool = Field(..., description="Database connection status")
    model_trained: bool = Field(..., description="Model training status")

class ErrorResponse(BaseModel):
    """Response model for errors."""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information") 