from prisma import Prisma
from typing import List, Dict, Optional
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

class DatabaseClient:
    def __init__(self):
        """Initialize the database client with Prisma."""
        # Set the schema path to the root schema file
        schema_path = Path(__file__).parent.parent.parent / "prisma" / "schema.prisma"
        if not schema_path.exists():
            schema_path = Path(__file__).parent / "prisma" / "schema.prisma"
            if not schema_path.exists():
                raise FileNotFoundError("Schema file not found")
        
        if schema_path.exists():
            os.environ["PRISMA_SCHEMA"] = str(schema_path)
            logger.info(f"Using schema file: {schema_path}")
        
        self.prisma = Prisma()
        self._is_connected = False
    
    async def connect(self) -> None:
        """Connect to the database using the DATABASE_URL environment variable."""
        try:
            await self.prisma.connect()
            self._is_connected = True
            logger.info("Successfully connected to database")
        except Exception as e:
            logger.error(f"Failed to connect to database: {str(e)}")
            raise
    
    async def disconnect(self) -> None:
        """Disconnect from the database."""
        if self._is_connected:
            await self.prisma.disconnect()
            self._is_connected = False
            logger.info("Disconnected from database")
    
    async def get_products_with_waste_data(self) -> List[Dict]:
        """
        Retrieve all products with waste data from the database.
        
        Returns:
            List[Dict]: List of products with waste data
            
        Raises:
            RuntimeError: If not connected to database
            Exception: For any database query errors
        """
        if not self._is_connected:
            raise RuntimeError("Not connected to database")
        
        try:
            # Query products with waste data
            products = await self.prisma.product.find_many(
                where={
                    "waste": {
                        "is_not": None
                    },
                    "validated": True
                },
                include={
                    "waste": True,
                    "supplier": True,
                    "manufacturer": True
                }
            )
            
            # Transform to the expected format
            result = []
            for product in products:
                if product.waste and product.waste.recycledWastePercentage is not None:
                    result.append({
                        "id": product.id,
                        "productId": product.productId,
                        "name": product.name,
                        "description": product.description,
                        "category": product.category,
                        "waste": {
                            "recycledWastePercentage": product.waste.recycledWastePercentage,
                            "radioactiveAmount": product.waste.radioactiveAmount
                        },
                        "supplier": {
                            "id": product.supplier.id if product.supplier else None,
                            "name": product.supplier.name if product.supplier else None
                        } if product.supplier else None,
                        "manufacturer": {
                            "id": product.manufacturer.id if product.manufacturer else None,
                            "name": product.manufacturer.name if product.manufacturer else None
                        } if product.manufacturer else None
                    })
            
            logger.info(f"Retrieved {len(result)} products with waste data")
            return result
            
        except Exception as e:
            logger.error(f"Error retrieving products: {str(e)}")
            raise
    
    async def get_product_by_id(self, product_id: str) -> Optional[Dict]:
        """
        Retrieve a specific product by its ID.
        
        Args:
            product_id (str): The product ID to retrieve
            
        Returns:
            Optional[Dict]: Product data if found, None otherwise
            
        Raises:
            RuntimeError: If not connected to database
            Exception: For any database query errors
        """
        if not self._is_connected:
            raise RuntimeError("Not connected to database")
        
        try:
            product = await self.prisma.product.find_unique(
                where={"productId": product_id},
                include={
                    "waste": True,
                    "supplier": True,
                    "manufacturer": True
                }
            )
            
            if not product:
                return None
            
            return {
                "id": product.id,
                "productId": product.productId,
                "name": product.name,
                "description": product.description,
                "category": product.category,
                "waste": {
                    "recycledWastePercentage": product.waste.recycledWastePercentage if product.waste else None,
                    "radioactiveAmount": product.waste.radioactiveAmount if product.waste else None
                } if product.waste else None,
                "supplier": {
                    "id": product.supplier.id if product.supplier else None,
                    "name": product.supplier.name if product.supplier else None
                } if product.supplier else None,
                "manufacturer": {
                    "id": product.manufacturer.id if product.manufacturer else None,
                    "name": product.manufacturer.name if product.manufacturer else None
                } if product.manufacturer else None
            }
            
        except Exception as e:
            logger.error(f"Error retrieving product {product_id}: {str(e)}")
            raise 