FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Set environment variables
ENV APP_PORT=8080
ENV APP_ENV=production

# Create a non-root user and switch to it
RUN useradd -m appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

# Run the application
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
