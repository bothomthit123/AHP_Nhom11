from typing import List, Dict, Optional, Any
from pydantic import BaseModel

class DecisionProblemInput(BaseModel):
    title: str
    description: Optional[str] = None
    criteria: List[str]
    alternatives: List[str]

class DecisionProblemOutput(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str
    criteria: List[str]
    alternatives: List[str]
    criteria_ids: List[int]
    alternative_ids: List[int]

class PairwiseMatrixInput(BaseModel):
    criteria_names: List[str]
    matrix: List[List[float]]

class AlternativeMatrixInput(BaseModel):
    decision_id: int
    criteria_id: int
    criteria_name: str
    alternatives: List[str]
    matrix: List[List[float]]

class ConsistencyCheck(BaseModel):
    lambda_max: float
    consistency_vector: List[float]
    ci: float
    ri: float
    cr: float
    is_consistent: bool

class StepByStepCalculation(BaseModel):
    step_name: str
    original_matrix: List[List[float]]
    column_sums: List[float]
    normalized_matrix: List[List[float]]
    weights: List[float]
    consistency_check: ConsistencyCheck

class CriteriaWeightsOutput(BaseModel):
    weights: List[float]
    column_sums: List[float]
    normalized_matrix: List[List[float]]
    consistency_ratio: float
    is_consistent: bool
    lambda_max: float
    ci: float
    ri: float

class AlternativeComparisonInput(BaseModel):
    decision_id: int
    criteria_weights: List[float]
    criteria_names: List[str]
    criteria_ids: List[int]
    alternatives: List[str]
    matrices_by_criteria: Dict[str, List[List[float]]]

class FinalRankingInput(BaseModel):
    decision_id: int
    alternatives: List[str]
    criteria_weights: List[float]
    alternative_weights_by_criteria: List[List[float]]

class RankedAlternative(BaseModel):
    alternative: str
    weight: float
    rank: int
    local_weights: Optional[Dict[str, float]] = None
    consistency_checks: Optional[Dict[str, Dict[str, Any]]] = None
