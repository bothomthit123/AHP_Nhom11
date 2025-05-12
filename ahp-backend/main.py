from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
from datetime import datetime

# Import modules
from models.schemas import (
    PairwiseMatrixInput, CriteriaWeightsOutput, 
    AlternativeComparisonInput, RankedAlternative,
    DecisionProblemInput, DecisionProblemOutput,
    StepByStepCalculation, AlternativeMatrixInput,
    FinalRankingInput
)
from services.ahp_service import AHPService
from repositories.db_repository import DBRepository

# === FastAPI App Initialization ===
app = FastAPI(title="AHP Decision Support API")

# === CORS Configuration ===
origins = [
    "http://localhost",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency Injection
def get_db_repository():
    try:
        repo = DBRepository()
        return repo
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")

def get_ahp_service(db_repository: DBRepository = Depends(get_db_repository)):
    return AHPService(db_repository)

# === API Endpoints ===
@app.post("/api/ahp/decision", response_model=DecisionProblemOutput)
def create_decision_problem(
    input_data: DecisionProblemInput, 
    ahp_service: AHPService = Depends(get_ahp_service)
):
    """Create a new decision problem with criteria and alternatives."""
    decision_id = ahp_service.create_decision_problem(input_data)
    return ahp_service.get_decision_problem(decision_id)

@app.get("/api/ahp/decision/{decision_id}", response_model=DecisionProblemOutput)
def get_decision_problem(
    decision_id: int, 
    ahp_service: AHPService = Depends(get_ahp_service)
):
    """Get decision problem details by ID."""
    return ahp_service.get_decision_problem(decision_id)

@app.get("/api/ahp/decision/{decision_id}/criteria")
def get_decision_criteria(
    decision_id: int, 
    db_repository: DBRepository = Depends(get_db_repository)
):
    """Get all criteria for a specific decision problem with weights if available."""
    try:
        # Get decision problem to verify it exists
        decision_data = db_repository.get_decision_problem(decision_id)
        
        # Get criteria with weights
        criteria_data = db_repository.get_criteria_with_weights(decision_id)
        
        return {
            "decision_id": decision_id,
            "criteria": criteria_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving criteria: {str(e)}")

@app.post("/api/ahp/criteria-matrix", response_model=StepByStepCalculation)
def compute_criteria_weights(
    decision_id: int,
    input_data: PairwiseMatrixInput, 
    ahp_service: AHPService = Depends(get_ahp_service)
):
    """Compute criteria weights from pairwise comparison matrix with detailed steps."""
    return ahp_service.compute_criteria_weights(decision_id, input_data)

@app.post("/api/ahp/alternative-matrix", response_model=StepByStepCalculation)
def compute_alternative_weights(
    input_data: AlternativeMatrixInput, 
    ahp_service: AHPService = Depends(get_ahp_service)
):
    """Compute alternative weights for a specific criterion with detailed steps."""
    return ahp_service.compute_alternative_weights(
        input_data.decision_id,
        input_data.criteria_id,
        input_data.criteria_name,
        input_data.alternatives,
        input_data.matrix
    )

@app.post("/api/ahp/final-ranking", response_model=List[RankedAlternative])
def calculate_final_ranking(
    input_data: FinalRankingInput, 
    ahp_service: AHPService = Depends(get_ahp_service)
):
    """Calculate final alternative rankings based on all weights."""
    return ahp_service.calculate_final_ranking(
        input_data.decision_id,
        input_data.alternatives,
        input_data.criteria_weights,
        input_data.alternative_weights_by_criteria
    )

@app.post("/api/ahp/alternatives", response_model=List[RankedAlternative], deprecated=True)
def rank_alternatives(
    input_data: AlternativeComparisonInput, 
    ahp_service: AHPService = Depends(get_ahp_service)
):
    """
    Legacy endpoint for ranking alternatives.
    Use the new step-by-step endpoints for better tracking of the AHP process.
    """
    # Process each criterion's matrix
    alternative_weights_by_criteria = []
    for i, criterion_name in enumerate(input_data.criteria_names):
        matrix = input_data.matrices_by_criteria[criterion_name]
        result = ahp_service.compute_alternative_weights(
            input_data.decision_id,
            input_data.criteria_ids[i],
            criterion_name,
            input_data.alternatives,
            matrix,
            True  # Save to database
        )
        alternative_weights_by_criteria.append(result.weights)
    
    # Calculate final ranking
    return ahp_service.calculate_final_ranking(
        input_data.decision_id,
        input_data.alternatives,
        input_data.criteria_weights,
        alternative_weights_by_criteria
    )

@app.get("/api/ahp/criteria")
def get_all_criteria(db_repository: DBRepository = Depends(get_db_repository)):
    """Get all available criteria."""
    try:
        query = "SELECT id, name, description FROM criteria ORDER BY name"
        db_repository.cursor.execute(query)
        criteria = db_repository.cursor.fetchall()
        
        return [
            {"id": c[0], "name": c[1], "description": c[2]}
            for c in criteria
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving criteria: {str(e)}")

@app.get("/api/ahp/alternatives")
def get_all_alternatives(db_repository: DBRepository = Depends(get_db_repository)):
    """Get all available alternatives."""
    try:
        query = "SELECT id, name, description FROM alternatives ORDER BY name"
        db_repository.cursor.execute(query)
        alternatives = db_repository.cursor.fetchall()
        
        return [
            {"id": a[0], "name": a[1], "description": a[2]}
            for a in alternatives
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving alternatives: {str(e)}")
