# AHP Backend - Decision Support System

A FastAPI backend for Analytic Hierarchy Process (AHP) decision-making.

## Prerequisites

- Python 3.7+
- SQL Server

## Quick Start

1. Clone and setup environment:
   ```bash
   git clone <repository-url>
   cd ahp-backend
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```

2. Database setup:
   - Create a SQL Server database
   - Run `databases/schema.sql` to create tables

3. Configuration:
   Create `.env` file:
   ```
   DB_SERVER=your_server
   DB_DATABASE=your_db
   DB_USERNAME=your_user
   DB_PASSWORD=your_pass
   ```

4. Run the application:
   ```bash
   python run.py
   ```
   Access API at http://127.0.0.1:8000

## Documentation

- API docs: http://127.0.0.1:8000/docs
- Alternative docs: http://127.0.0.1:8000/redoc

## Project Structure

- `databases/`: SQL scripts and DB connections
- `run.py`: Application entry point
- `main.py`: FastAPI app and routes
