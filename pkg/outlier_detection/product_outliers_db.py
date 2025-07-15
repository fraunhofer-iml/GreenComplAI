import pandas as pd
from sklearn.ensemble import IsolationForest
from typing import List, Tuple
from database_client import DatabaseClient
import logging

logger = logging.getLogger(__name__)

class ProductOutlierDetector:
    def __init__(self, db_client: DatabaseClient, contamination: float = 0.1):
        """
        Initialize the outlier detection model.
        
        Args:
            db_client (DatabaseClient): Client for database communication
            contamination (float): Expected proportion of outliers in the dataset (default: 0.1)
            
        Raises:
            ValueError: If contamination is not between 0 and 0.5
        """
        if not 0 < contamination <= 0.5:
            raise ValueError("Contamination must be between 0 and 0.5")
            
        self.contamination = contamination
        self.model = None
        self.db_client = db_client
        self.feature_columns = ['recycledWastePercentage']
        
    def load_data(self) -> pd.DataFrame:
        """
        Retrieve and process product data from the database.
        
        Returns:
            pd.DataFrame: Processed dataset containing product IDs and recycled waste percentages
            
        Raises:
            ValueError: If no valid product data is found
            Exception: For any communication or processing errors
        """
        products = self.db_client.get_products_with_waste_data()
        
        data = []
        for product in products:
            if product.get('waste') and product['waste'].get('recycledWastePercentage') is not None:
                data.append({
                    'productId': product['productId'],
                    'recycledWastePercentage': product['waste']['recycledWastePercentage'],
                })
        
        if not data:
            raise ValueError("No products with waste data found")
            
        return pd.DataFrame(data)
    
    def train(self) -> None:
        """
        Train the Isolation Forest model on the available product data.
        
        Raises:
            ValueError: If insufficient data is available for training
            Exception: For any model training errors
        """
        df = self.load_data()
        
        if len(df) == 0:
            raise ValueError("No data available for training")
            
        X = df[self.feature_columns]
        
        self.model = IsolationForest(
            contamination=self.contamination,
            random_state=42
        )
        self.model.fit(X)
        
        logger.info(f"Model trained with {len(df)} samples")
        logger.info(f"Feature statistics:")
        logger.info(df[self.feature_columns].describe())
    
    async def predict(self, recycled_waste_percentage: float) -> Tuple[bool, float]:
        """
        Predict whether a given recycled waste percentage is an outlier.
        
        Args:
            recycled_waste_percentage (float): Percentage value to evaluate
            
        Returns:
            Tuple[bool, float]: (is_outlier, anomaly_score)
                - is_outlier: True if the value is identified as an outlier
                - anomaly_score: The computed anomaly score (negative values indicate outliers)
                
        Raises:
            RuntimeError: If model is not trained
            Exception: For any prediction errors
        """
        if self.model is None:
            self.train()
            
        X = pd.DataFrame({
            'recycledWastePercentage': [recycled_waste_percentage]
        })
        
        prediction = self.model.predict(X)
        score = self.model.score_samples(X)
        
        is_outlier = prediction[0] == -1
        
        return is_outlier, score[0]
    
    async def get_all_outliers(self) -> List[dict]:
        """
        Identify and return all outliers in the current dataset.
        
        Returns:
            List[dict]: List of outlier records containing:
                - productId: Identifier of the product
                - recycledWastePercentage: The outlier percentage value
                - anomalyScore: The computed anomaly score
                
        Raises:
            RuntimeError: If model is not trained
            Exception: For any processing errors
        """
        if self.model is None:
            self.train()
            
        df = self.load_data()
        X = df[self.feature_columns]
        
        predictions = self.model.predict(X)
        scores = self.model.score_samples(X)
        
        outliers = []
        for idx, (pred, score) in enumerate(zip(predictions, scores)):
            if pred == -1:
                outliers.append({
                    'productId': df.iloc[idx]['productId'],
                    'recycledWastePercentage': df.iloc[idx]['recycledWastePercentage'],
                    'anomalyScore': score
                })
                
        return outliers 