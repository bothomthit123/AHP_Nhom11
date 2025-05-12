# AHP Decision Support System for Tourist Destinations

This project implements a decision support system using the Analytic Hierarchy Process (AHP) methodology to help users choose the best tourist destination based on multiple criteria.

## Project Structure

The project is divided into two main components:

- **Frontend**: React-based web application ([`ahp-frontend/`](./ahp-frontend/))
- **Backend**: FastAPI-based REST API service ([`ahp-backend/`](./ahp-backend/))

## Features

- Multi-criteria decision making using AHP
- Step-by-step visualization of the AHP process
- Comparison of tourist destinations across multiple criteria
- Consistency checks for user inputs
- Dynamic weighting calculations
- Interactive results with visual charts

## System Requirements

- Node.js 14+ (for frontend)
- Python 3.7+ (for backend)
- SQL Server (for database)

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd ahp-backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure the database connection by creating a `.env` file:
   ```
   DB_SERVER=your_server
   DB_DATABASE=your_db
   DB_USERNAME=your_user
   DB_PASSWORD=your_pass
   ```

5. Run the backend server:
   ```bash
   python run.py
   ```

   The API will be accessible at http://127.0.0.1:8000

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ahp-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

   The application will open at http://localhost:3000

## AHP Methodology

The Analytic Hierarchy Process follows these key steps:

1. **Problem definition**: Identify the decision goal, criteria, and alternatives
2. **Criteria comparison**: Pairwise comparison of criteria to determine their relative importance
3. **Alternative comparison**: Pairwise comparison of alternatives for each criterion
4. **Synthesis**: Calculate final rankings by combining criteria weights and alternative scores
5. **Consistency check**: Verify the logical consistency of the comparisons

## User Guide

1. **Setup Decision**: Define the decision problem, criteria, and alternatives
2. **Compare Criteria**: Create pairwise comparisons between criteria
3. **View Criteria Weights**: Examine the calculated weights and consistency
4. **Compare Alternatives**: Create pairwise comparisons between alternatives for each criterion
5. **View Results**: See the final rankings and recommendations

## Development

### Backend API Documentation

- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

### Building for Production

Frontend:
```bash
cd ahp-frontend
npm run build
```

## Contributors

- AHP Group 11


