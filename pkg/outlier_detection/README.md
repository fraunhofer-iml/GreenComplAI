# Outlier Detection Service

Ein HTTP-basierter Service zur Erkennung von Ausreißern in Recycled Waste Percentage Daten. Der Service verwendet Machine Learning (Isolation Forest) und liest Produktdaten direkt aus der Datenbank.

## Features

- **HTTP API**: RESTful API mit FastAPI
- **Datenbankanbindung**: Direkte Verbindung zur PostgreSQL-Datenbank über Prisma
- **Outlier Detection**: Machine Learning-basierte Erkennung von Ausreißern
- **Automatisches Training**: Model wird beim Start automatisch mit vorhandenen Daten trainiert
- **Health Checks**: Endpunkt zur Überprüfung des Service-Status
- **CORS Support**: Cross-Origin Resource Sharing für Frontend-Integration

## API Endpunkte

### Health Check

- `GET /health` - Überprüft den Service-Status

### Outlier Detection

- `POST /detect-outlier` - Erkennt Ausreißer in Recycled Waste Percentage
- `GET /outliers` - Zeigt alle Ausreißer im aktuellen Datensatz

### Produktdaten

- `GET /products` - Alle Produkte mit Waste-Daten
- `GET /products/{product_id}` - Spezifisches Produkt nach ID

### Model Management

- `POST /retrain` - Trainiert das Model neu mit aktuellen Daten

## Setup

### Voraussetzungen

- Python 3.12+
- PostgreSQL Datenbank
- `DATABASE_URL` Environment Variable

### Installation

**Option 1: Automatisches Setup (empfohlen)**

```bash
python setup.py
```

**Option 2: Manuelles Setup**

1. **Dependencies installieren:**

   ```bash
   pip install -e .
   # oder mit uv
   uv sync
   ```

2. **Prisma Client generieren:**

   ```bash
   # Verwende das Root-Schema
   python prisma_config.py

   # Oder manuell mit dem Root-Schema
   prisma generate --schema ../../prisma/schema.prisma
   ```

3. **Environment Variables setzen:**
   ```bash
   export DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
   export PORT=8000  # Optional, Standard: 8000
   export HOST=0.0.0.0  # Optional, Standard: 0.0.0.0
   ```

### Starten des Services

```bash
# Mit Python
python main.py

# Oder direkt mit uvicorn
uvicorn api:app --host 0.0.0.0 --port 8000

# Mit Reload für Development
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

## API Verwendung

### Outlier Detection

```bash
curl -X POST "http://localhost:8000/detect-outlier" \
     -H "Content-Type: application/json" \
     -d '{"recycledWastePercentage": 75.5}'
```

**Response:**

```json
{
  "outlier": false,
  "score": -0.123,
  "recycledWastePercentage": 75.5
}
```

### Alle Produkte abrufen

```bash
curl "http://localhost:8000/products"
```

### Health Check

```bash
curl "http://localhost:8000/health"
```

**Response:**

```json
{
  "status": "healthy",
  "database_connected": true,
  "model_trained": true
}
```

## Datenbank Schema

Der Service verwendet das **Root-Prisma-Schema** aus `../../prisma/schema.prisma` und verbindet sich mit der PostgreSQL-Datenbank über die `DATABASE_URL` Environment Variable. Dies vermeidet Duplikation und stellt sicher, dass beide Services (NestJS und Python) das gleiche Schema verwenden.

### Wichtige Tabellen:

- `Product`: Produktinformationen
- `Waste`: Waste-Daten mit `recycledWastePercentage`
- `Company`: Lieferanten und Hersteller
- `Address`: Adressen für Lager und Produktion

## Konfiguration

### Environment Variables

| Variable       | Beschreibung                | Standard |
| -------------- | --------------------------- | -------- |
| `DATABASE_URL` | PostgreSQL Verbindungs-URL  | -        |
| `PORT`         | HTTP Port                   | 8000     |
| `HOST`         | HTTP Host                   | 0.0.0.0  |
| `RELOAD`       | Reload Mode für Development | false    |

### Model Konfiguration

Das Isolation Forest Model kann in `product_outliers_db.py` konfiguriert werden:

```python
detector = ProductOutlierDetector(db_client, contamination=0.1)
```

- `contamination`: Erwarteter Anteil von Ausreißern (0.1 = 10%)

## Entwicklung

### Projektstruktur

```
pkg/outlier_detection/
├── api.py                 # FastAPI Anwendung
├── main.py               # Entry Point
├── models.py             # Pydantic Models
├── database_client.py    # Prisma Database Client
├── product_outliers_db.py # Outlier Detection Logic
├── prisma_config.py      # Prisma Configuration (uses root schema)
└── pyproject.toml        # Dependencies

# Verwendet Root-Schema: ../../prisma/schema.prisma
```

### Neue Features hinzufügen

1. **Neue Endpunkte** in `api.py` hinzufügen
2. **Pydantic Models** in `models.py` definieren
3. **Database Queries** in `database_client.py` implementieren
4. **Tests** schreiben (empfohlen)

## Troubleshooting

### Häufige Probleme

1. **Database Connection Error:**

   - Überprüfen Sie die `DATABASE_URL`
   - Stellen Sie sicher, dass die Datenbank läuft

2. **Prisma Client Error:**

   - Führen Sie `prisma generate` aus
   - Überprüfen Sie das Schema in `prisma/schema.prisma`

3. **Model Training Error:**
   - Stellen Sie sicher, dass Produkte mit Waste-Daten in der Datenbank vorhanden sind
   - Überprüfen Sie die Logs für detaillierte Fehlermeldungen

### Logs

Der Service loggt alle wichtigen Ereignisse:

- Database Verbindungen
- Model Training
- API Requests
- Fehler

Logs können über die Konsole oder in eine Datei umgeleitet werden.

## Deployment

### Docker (empfohlen)

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY . .

RUN pip install -r requirements.txt
RUN prisma generate

EXPOSE 8000

CMD ["python", "main.py"]
```

### Production

Für Production-Umgebungen:

- Setzen Sie `RELOAD=false`
- Konfigurieren Sie CORS entsprechend
- Verwenden Sie einen Reverse Proxy (nginx)
- Implementieren Sie Authentication/Authorization
- Setzen Sie Logging auf Production-Level
