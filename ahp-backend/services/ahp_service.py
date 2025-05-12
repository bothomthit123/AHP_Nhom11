from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from fastapi import HTTPException

from models.schemas import (
    PairwiseMatrixInput, CriteriaWeightsOutput, 
    AlternativeComparisonInput, RankedAlternative,
    DecisionProblemInput, DecisionProblemOutput,
    StepByStepCalculation, ConsistencyCheck
)
from repositories.db_repository import DBRepository

class AHPService:
    # Constants
    RI_TABLE = {
        1: 0.00, 2: 0.00, 3: 0.58, 4: 0.90, 5: 1.12,
        6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49
    }
    
    def __init__(self, db_repository: DBRepository):
        self.db_repository = db_repository
    
    def create_decision_problem(self, input_data: DecisionProblemInput) -> int:
        """Create a new decision problem with criteria and alternatives."""
        try:
            # Create decision problem
            decision_id = self.db_repository.create_decision_problem(
                input_data.title, input_data.description
            )
            
            # Save criteria and get IDs
            criteria_ids = self.db_repository.save_criteria_to_db(input_data.criteria)
            
            # Save alternatives and get IDs
            alternative_ids = self.db_repository.save_alternatives_to_db(input_data.alternatives)
            
            # Link criteria and alternatives to decision problem
            self.db_repository.link_criteria_to_decision(decision_id, criteria_ids)
            self.db_repository.link_alternatives_to_decision(decision_id, alternative_ids)
            
            return decision_id
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error creating decision problem: {str(e)}")
    
    def get_decision_problem(self, decision_id: int) -> DecisionProblemOutput:
        """Get decision problem details."""
        try:
            decision_data = self.db_repository.get_decision_problem(decision_id)
            
            return DecisionProblemOutput(
                id=decision_id,
                title=decision_data["title"],
                description=decision_data["description"],
                status=decision_data["status"],
                criteria=[c["name"] for c in decision_data["criteria"]],
                alternatives=[a["name"] for a in decision_data["alternatives"]],
                criteria_ids=[c["id"] for c in decision_data["criteria"]],
                alternative_ids=[a["id"] for a in decision_data["alternatives"]]
            )
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error retrieving decision problem: {str(e)}")
    
    def calculate_column_sums(self, matrix: np.ndarray) -> np.ndarray:
        """Calculate the sum of each column in the pairwise comparison matrix."""
        return matrix.sum(axis=0)
    
    def normalize_matrix(self, matrix: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Normalize the pairwise comparison matrix by dividing each cell by its column sum.
        Returns both the normalized matrix and the column sums.
        """
        column_sums = self.calculate_column_sums(matrix)
        normalized_matrix = matrix / column_sums
        return normalized_matrix, column_sums

    def compute_weights(self, norm_matrix: np.ndarray) -> np.ndarray:
        """Compute criteria weights by calculating the row averages of the normalized matrix."""
        return norm_matrix.mean(axis=1)

    def calculate_consistency_vector(self, matrix: np.ndarray, weights: np.ndarray) -> np.ndarray:
        """
        Calculate the consistency vector by multiplying the original matrix by weights
        and dividing by respective weights.
        """
        weighted_sum = np.dot(matrix, weights)
        # Avoid division by zero
        consistency_vector = np.divide(weighted_sum, weights, out=np.zeros_like(weighted_sum), where=weights!=0)
        return consistency_vector

    def check_consistency(self, matrix: np.ndarray, weights: np.ndarray) -> Dict:
        """
        Check the consistency of the pairwise comparison matrix.
        Returns lambda_max, consistency index (CI), random index (RI), and consistency ratio (CR).
        """
        n = len(matrix)
        consistency_vector = self.calculate_consistency_vector(matrix, weights)
        
        # Calculate lambda_max as the average of the consistency vector
        lambda_max = np.mean(consistency_vector)
        
        # Calculate Consistency Index (CI)
        ci = (lambda_max - n) / (n - 1) if n > 1 else 0
        
        # Get Random Index (RI) from table
        ri = self.RI_TABLE.get(n, 1.49)
        
        # Calculate Consistency Ratio (CR)
        cr = ci / ri if ri != 0 else 0
        
        return {
            "lambda_max": lambda_max,
            "consistency_vector": consistency_vector.tolist(),
            "ci": ci,
            "ri": ri,
            "cr": cr,
            "is_consistent": cr < 0.1
        }
    
    def compute_criteria_weights(self, decision_id: int, input_data: PairwiseMatrixInput, 
                                save_to_db: bool = True) -> StepByStepCalculation:
        """
        Compute criteria weights from pairwise comparison matrix following AHP methodology.
        Return detailed step-by-step calculation data.
        """
        try:
            # Step 1: Convert input to numpy array
            matrix = np.array(input_data.matrix)

            if matrix.shape[0] != matrix.shape[1]:
                raise HTTPException(status_code=400, detail="Matrix must be square")

            # Step 2: Calculate column sums and normalize the matrix
            norm_matrix, column_sums = self.normalize_matrix(matrix)
            
            # Step 3: Calculate weights (row averages of normalized matrix)
            weights = self.compute_weights(norm_matrix)
            
            # Step 4: Check consistency
            consistency_data = self.check_consistency(matrix, weights)
            
            if save_to_db:
                # Get criteria IDs
                criteria_ids = self.db_repository.save_criteria_to_db(input_data.criteria_names)
                
                # Save criteria pairwise comparison matrix
                self.db_repository.save_criteria_comparison_matrix(decision_id, criteria_ids, input_data.matrix)
                
                # Save criteria weights
                self.db_repository.save_criteria_weights(decision_id, criteria_ids, weights.tolist())
                
                # Save consistency check
                self.db_repository.save_consistency_check(
                    decision_id, 
                    None,  # No specific criteria for criteria matrix consistency
                    consistency_data["lambda_max"], 
                    consistency_data["ci"], 
                    consistency_data["cr"], 
                    consistency_data["is_consistent"]
                )

            # Create response with detailed step data
            return StepByStepCalculation(
                step_name="criteria_weights",
                original_matrix=input_data.matrix,
                column_sums=column_sums.tolist(),
                normalized_matrix=norm_matrix.tolist(),
                weights=weights.tolist(),
                consistency_check=ConsistencyCheck(
                    lambda_max=consistency_data["lambda_max"],
                    consistency_vector=consistency_data["consistency_vector"],
                    ci=consistency_data["ci"],
                    ri=consistency_data["ri"],
                    cr=consistency_data["cr"],
                    is_consistent=consistency_data["is_consistent"]
                )
            )
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            # Catch any other errors and convert to HTTP exception
            raise HTTPException(status_code=500, detail=f"Error in criteria weight computation: {str(e)}")
    
    def compute_alternative_weights(self, decision_id: int, criteria_id: int, criteria_name: str,
                                   alternatives: List[str], matrix: List[List[float]], 
                                   save_to_db: bool = True) -> StepByStepCalculation:
        """
        Compute alternative weights for a specific criterion from pairwise comparison matrix.
        Return detailed step-by-step calculation data.
        """
        try:
            # Step 1: Convert input to numpy array
            matrix_np = np.array(matrix)

            if matrix_np.shape[0] != matrix_np.shape[1]:
                raise HTTPException(status_code=400, detail="Matrix must be square")

            # Step 2: Calculate column sums and normalize the matrix
            norm_matrix, column_sums = self.normalize_matrix(matrix_np)
            
            # Step 3: Calculate weights (row averages of normalized matrix)
            weights = self.compute_weights(norm_matrix)
            
            # Step 4: Check consistency
            consistency_data = self.check_consistency(matrix_np, weights)
            
            if save_to_db:
                # Get alternative IDs
                alternative_ids = self.db_repository.save_alternatives_to_db(alternatives)
                
                # Save alternative pairwise comparison matrix
                self.db_repository.save_alternative_comparison_matrix(decision_id, criteria_id, alternative_ids, matrix)
                
                # Save alternative scores for this criterion
                self.db_repository.save_alternative_scores(decision_id, alternative_ids, criteria_id, weights.tolist())
                
                # Save consistency check
                self.db_repository.save_consistency_check(
                    decision_id, 
                    criteria_id,
                    consistency_data["lambda_max"], 
                    consistency_data["ci"], 
                    consistency_data["cr"], 
                    consistency_data["is_consistent"]
                )

            # Create response with detailed step data
            return StepByStepCalculation(
                step_name=f"alternative_weights_for_{criteria_name}",
                original_matrix=matrix,
                column_sums=column_sums.tolist(),
                normalized_matrix=norm_matrix.tolist(),
                weights=weights.tolist(),
                consistency_check=ConsistencyCheck(
                    lambda_max=consistency_data["lambda_max"],
                    consistency_vector=consistency_data["consistency_vector"],
                    ci=consistency_data["ci"],
                    ri=consistency_data["ri"],
                    cr=consistency_data["cr"],
                    is_consistent=consistency_data["is_consistent"]
                )
            )
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            # Catch any other errors and convert to HTTP exception
            raise HTTPException(
                status_code=500, 
                detail=f"Error in alternative weight computation for {criteria_name}: {str(e)}"
            )
    
    def calculate_final_ranking(self, decision_id: int, alternatives: List[str], 
                              criteria_weights: List[float], alternative_weights_by_criteria: List[List[float]]) -> List[RankedAlternative]:
        """
        Calculate final alternative rankings based on criteria weights and alternative weights.
        Returns sorted alternatives with final weights.
        """
        try:
            # Convert to numpy arrays for calculations
            criteria_weights_np = np.array(criteria_weights)
            alternative_weights_np = np.array(alternative_weights_by_criteria).T  # Transpose to get alternatives in rows
            
            # Calculate final scores
            final_scores = np.dot(alternative_weights_np, criteria_weights_np)
            
            # Get alternative IDs
            alternative_ids = self.db_repository.save_alternatives_to_db(alternatives)
            
            # Save final scores
            self.db_repository.save_alternative_scores(
                decision_id, alternative_ids, None, final_scores.tolist(), True
            )
            
            # Mark decision as completed
            self.db_repository.update_decision_status(decision_id, "completed")
            
            # Create ranked alternatives list
            ranked_alternatives = []
            for i, (name, score) in enumerate(
                sorted(zip(alternatives, final_scores), key=lambda x: x[1], reverse=True)
            ):
                # Get local weights for each criterion
                local_weights = {}
                for j, criterion_name in enumerate(self.get_decision_problem(decision_id).criteria):
                    # Find the index of this alternative in the original list
                    orig_idx = alternatives.index(name)
                    local_weights[criterion_name] = alternative_weights_by_criteria[j][orig_idx]
                
                ranked_alternatives.append(
                    RankedAlternative(
                        alternative=name,
                        weight=float(score),
                        rank=i+1,
                        local_weights=local_weights
                    )
                )
            
            return ranked_alternatives
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error calculating final rankings: {str(e)}")

