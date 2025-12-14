# Simple development Dockerfile for Tableau AI BI Summarization Backend
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    curl \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast Python package management
RUN pip install --no-cache-dir uv

# Create non-root user for development
RUN groupadd -r tableau && useradd -r -g tableau tableau -m -s /bin/bash

# Create app directory
WORKDIR /app

# Copy requirements.txt and install dependencies
COPY backend/requirements.txt .
RUN uv pip install --system -r requirements.txt

# Copy the backend code
COPY backend/ ./backend/

# Set ownership to tableau user
RUN chown -R tableau:tableau /app

# Switch to non-root user
USER tableau

# Expose port
EXPOSE 8000

# Set working directory to app root
WORKDIR /app

# Default command for development
CMD ["python", "-m", "uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]