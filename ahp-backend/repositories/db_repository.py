import pyodbc
from typing import List, Optional, Dict, Any
import numpy as np
from datetime import datetime
from fastapi import HTTPException
import os
from dotenv import load_dotenv

class DBRepository:
    def __init__(self):
        load_dotenv()  # Load environment variables from .env file
        self.conn = self._get_db_connection()
        self.cursor = self.conn.cursor()
    
    def _get_db_connection(self):
        """Establish database connection using environment variables."""
        try:
            server = os.getenv('DB_SERVER')
            database = os.getenv('DB_DATABASE')
            username = os.getenv('DB_USERNAME')
            password = os.getenv('DB_PASSWORD')
            
            # Check if using Windows authentication or SQL authentication
            if username and password:
                connection_string = (
                    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
                    f"SERVER={server};"
                    f"DATABASE={database};"
                    f"UID={username};"
                    f"PWD={password}"
                )
            else:
                # Use Windows authentication if no username/password provided
                connection_string = (
                    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
                    f"SERVER={server};"
                    f"DATABASE={database};"
                    f"Trusted_Connection=yes"
                )
            
            return pyodbc.connect(connection_string)
        except pyodbc.Error as e:
            raise RuntimeError(f"Database connection failed: {e}")
    
    def create_decision_problem(self, title: str, description: str = None) -> int:
        """Create a new decision problem and return its ID."""
        try:
            self.cursor.execute(
                "INSERT INTO decision_problems (title, description, status) VALUES (?, ?, ?)",
                (title, description, 'in_progress')
            )
            self.conn.commit()
            
            self.cursor.execute("SELECT TOP 1 id FROM decision_problems ORDER BY id DESC")
            result = self.cursor.fetchone()
            
            if not result:
                raise HTTPException(status_code=500, detail="Failed to retrieve decision problem ID")
            
            return result[0]
        except pyodbc.Error as e:
            self.conn.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    def save_criteria_to_db(self, criteria_names: List[str]) -> List[int]:
        """Save criteria to database if they don't exist and return their IDs."""
        criteria_ids = []
        
        for name in criteria_names:
            self.cursor.execute("SELECT id FROM criteria WHERE name = ?", (name,))
            result = self.cursor.fetchone()
            
            if result:
                criteria_ids.append(result[0])
            else:
                self.cursor.execute(
                    "INSERT INTO criteria (name) VALUES (?)", 
                    (name,)
                )
                self.conn.commit()
                
                self.cursor.execute("SELECT TOP 1 id FROM criteria ORDER BY id DESC")
                new_id = self.cursor.fetchone()[0]
                criteria_ids.append(new_id)
        
        return criteria_ids
    
    def save_alternatives_to_db(self, alternatives: List[str]) -> List[int]:
        """Save alternatives to database if they don't exist and return their IDs."""
        alternative_ids = []
        
        for name in alternatives:
            self.cursor.execute("SELECT id FROM alternatives WHERE name = ?", (name,))
            result = self.cursor.fetchone()
            
            if result:
                alternative_ids.append(result[0])
            else:
                self.cursor.execute(
                    "INSERT INTO alternatives (name) VALUES (?)", 
                    (name,)
                )
                self.conn.commit()
                
                self.cursor.execute("SELECT TOP 1 id FROM alternatives ORDER BY id DESC")
                new_id = self.cursor.fetchone()[0]
                alternative_ids.append(new_id)
        
        return alternative_ids
    
    def link_criteria_to_decision(self, decision_id: int, criteria_ids: List[int]):
        """Link criteria to a decision problem."""
        for i, criteria_id in enumerate(criteria_ids):
            self.cursor.execute(
                "INSERT INTO decision_criteria (decision_id, criteria_id, display_order) VALUES (?, ?, ?)",
                (decision_id, criteria_id, i)
            )
        self.conn.commit()
    
    def link_alternatives_to_decision(self, decision_id: int, alternative_ids: List[int]):
        """Link alternatives to a decision problem."""
        for i, alternative_id in enumerate(alternative_ids):
            self.cursor.execute(
                "INSERT INTO decision_alternatives (decision_id, alternative_id, display_order) VALUES (?, ?, ?)",
                (decision_id, alternative_id, i)
            )
        self.conn.commit()
    
    def save_criteria_comparison_matrix(self, decision_id: int, criteria_ids: List[int], matrix: List[List[float]]):
        """Save criteria pairwise comparison matrix."""
        for i, row_id in enumerate(criteria_ids):
            for j, col_id in enumerate(criteria_ids):
                value = matrix[i][j]
                
                # Check if entry already exists
                self.cursor.execute(
                    "SELECT id FROM criteria_comparisons WHERE decision_id = ? AND row_criteria_id = ? AND column_criteria_id = ?",
                    (decision_id, row_id, col_id)
                )
                existing = self.cursor.fetchone()
                
                if existing:
                    # Update existing record
                    self.cursor.execute(
                        "UPDATE criteria_comparisons SET value = ? WHERE id = ?",
                        (value, existing[0])
                    )
                else:
                    # Insert new record
                    self.cursor.execute(
                        "INSERT INTO criteria_comparisons (decision_id, row_criteria_id, column_criteria_id, value) "
                        "VALUES (?, ?, ?, ?)",
                        (decision_id, row_id, col_id, value)
                    )
        self.conn.commit()
    
    def save_criteria_weights(self, decision_id: int, criteria_ids: List[int], weights: List[float]):
        """Save calculated criteria weights."""
        for criteria_id, weight in zip(criteria_ids, weights):
            # Check if weight already exists
            self.cursor.execute(
                "SELECT id FROM criteria_weights WHERE decision_id = ? AND criteria_id = ?",
                (decision_id, criteria_id)
            )
            existing = self.cursor.fetchone()
            
            if existing:
                # Update existing record
                self.cursor.execute(
                    "UPDATE criteria_weights SET weight = ? WHERE id = ?",
                    (weight, existing[0])
                )
            else:
                # Insert new record
                self.cursor.execute(
                    "INSERT INTO criteria_weights (decision_id, criteria_id, weight) VALUES (?, ?, ?)",
                    (decision_id, criteria_id, weight)
                )
        self.conn.commit()
    
    def save_consistency_check(self, decision_id: int, criteria_id: Optional[int], 
                              lambda_max: float, ci: float, cr: float, is_consistent: bool):
        """Save consistency check results."""
        # Check if consistency check already exists
        self.cursor.execute(
            "SELECT id FROM consistency_checks WHERE decision_id = ? AND (criteria_id = ? OR (criteria_id IS NULL AND ? IS NULL))",
            (decision_id, criteria_id, criteria_id)
        )
        existing = self.cursor.fetchone()
        
        if existing:
            # Update existing record
            self.cursor.execute(
                "UPDATE consistency_checks SET lambda_max = ?, consistency_index = ?, "
                "consistency_ratio = ?, is_consistent = ? WHERE id = ?",
                (lambda_max, ci, cr, 1 if is_consistent else 0, existing[0])
            )
        else:
            # Insert new record
            self.cursor.execute(
                "INSERT INTO consistency_checks (decision_id, criteria_id, lambda_max, consistency_index, "
                "consistency_ratio, is_consistent) VALUES (?, ?, ?, ?, ?, ?)",
                (decision_id, criteria_id, lambda_max, ci, cr, 1 if is_consistent else 0)
            )
        self.conn.commit()
    
    def save_alternative_comparison_matrix(self, decision_id: int, criteria_id: int, 
                                          alternative_ids: List[int], matrix: List[List[float]]):
        """Save alternative pairwise comparison matrix for a specific criterion."""
        for i, row_id in enumerate(alternative_ids):
            for j, col_id in enumerate(alternative_ids):
                value = matrix[i][j]
                
                # Check if entry already exists
                self.cursor.execute(
                    "SELECT id FROM alternative_comparisons WHERE decision_id = ? AND criteria_id = ? "
                    "AND row_alternative_id = ? AND column_alternative_id = ?",
                    (decision_id, criteria_id, row_id, col_id)
                )
                existing = self.cursor.fetchone()
                
                if existing:
                    # Update existing record
                    self.cursor.execute(
                        "UPDATE alternative_comparisons SET value = ? WHERE id = ?",
                        (value, existing[0])
                    )
                else:
                    # Insert new record
                    self.cursor.execute(
                        "INSERT INTO alternative_comparisons (decision_id, criteria_id, row_alternative_id, "
                        "column_alternative_id, value) VALUES (?, ?, ?, ?, ?)",
                        (decision_id, criteria_id, row_id, col_id, value)
                    )
        self.conn.commit()
    
    def save_alternative_scores(self, decision_id: int, alternative_ids: List[int], 
                               criteria_id: Optional[int], scores: List[float], is_final: bool = False):
        """Save calculated alternative scores for a specific criterion or final scores."""
        for i, alt_id in enumerate(alternative_ids):
            score = scores[i]
            rank = i + 1 if is_final else None
            
            # Check if score already exists
            self.cursor.execute(
                "SELECT id FROM alternative_scores WHERE decision_id = ? AND alternative_id = ? "
                "AND (criteria_id = ? OR (criteria_id IS NULL AND ? IS NULL)) AND is_final_score = ?",
                (decision_id, alt_id, criteria_id, criteria_id, 1 if is_final else 0)
            )
            existing = self.cursor.fetchone()
            
            if existing:
                # Update existing record
                self.cursor.execute(
                    "UPDATE alternative_scores SET score = ?, rank_order = ? WHERE id = ?",
                    (score, rank, existing[0])
                )
            else:
                # Insert new record
                self.cursor.execute(
                    "INSERT INTO alternative_scores (decision_id, alternative_id, criteria_id, score, is_final_score, rank_order) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    (decision_id, alt_id, criteria_id, score, 1 if is_final else 0, rank)
                )
        self.conn.commit()
    
    def get_decision_problem(self, decision_id: int) -> Dict[str, Any]:
        """Get decision problem details including criteria and alternatives."""
        # Get decision details
        self.cursor.execute("SELECT title, description, status FROM decision_problems WHERE id = ?", (decision_id,))
        decision = self.cursor.fetchone()
        if not decision:
            raise HTTPException(status_code=404, detail=f"Decision problem with ID {decision_id} not found")
        
        decision_data = {
            "id": decision_id,
            "title": decision[0],
            "description": decision[1],
            "status": decision[2]
        }
        
        # Get criteria
        self.cursor.execute(
            "SELECT c.id, c.name FROM criteria c "
            "JOIN decision_criteria dc ON c.id = dc.criteria_id "
            "WHERE dc.decision_id = ? ORDER BY dc.display_order",
            (decision_id,)
        )
        criteria = self.cursor.fetchall()
        decision_data["criteria"] = [{"id": c[0], "name": c[1]} for c in criteria]
        
        # Get alternatives
        self.cursor.execute(
            "SELECT a.id, a.name FROM alternatives a "
            "JOIN decision_alternatives da ON a.id = da.alternative_id "
            "WHERE da.decision_id = ? ORDER BY da.display_order",
            (decision_id,)
        )
        alternatives = self.cursor.fetchall()
        decision_data["alternatives"] = [{"id": a[0], "name": a[1]} for a in alternatives]
        
        return decision_data
    
    def get_criteria_weights(self, decision_id: int) -> Dict[int, float]:
        """Get calculated criteria weights for a decision problem."""
        self.cursor.execute(
            "SELECT criteria_id, weight FROM criteria_weights WHERE decision_id = ?",
            (decision_id,)
        )
        weights = self.cursor.fetchall()
        return {w[0]: w[1] for w in weights}
    
    def get_alternative_scores(self, decision_id: int, is_final: bool = True) -> List[Dict[str, Any]]:
        """Get alternative scores for a decision problem."""
        query = """
            SELECT a.id, a.name, s.score, s.rank_order
            FROM alternatives a
            JOIN alternative_scores s ON a.id = s.alternative_id
            WHERE s.decision_id = ? AND s.is_final_score = ?
            ORDER BY s.rank_order
        """
        self.cursor.execute(query, (decision_id, 1 if is_final else 0))
        scores = self.cursor.fetchall()
        
        return [
            {"id": s[0], "name": s[1], "score": s[2], "rank": s[3]}
            for s in scores
        ]

    def update_decision_status(self, decision_id: int, status: str):
        """Update the status of a decision problem."""
        self.cursor.execute(
            "UPDATE decision_problems SET status = ?, updated_at = ? WHERE id = ?",
            (status, datetime.now(), decision_id)
        )
        self.conn.commit()

    def get_criteria_with_weights(self, decision_id: int) -> List[Dict[str, Any]]:
        """Get criteria with weights for a decision problem."""
        query = """
            SELECT 
                c.id, 
                c.name, 
                c.description,
                dc.display_order,
                cw.weight
            FROM criteria c
            JOIN decision_criteria dc ON c.id = dc.criteria_id
            LEFT JOIN criteria_weights cw ON c.id = cw.criteria_id AND cw.decision_id = dc.decision_id
            WHERE dc.decision_id = ?
            ORDER BY dc.display_order
        """
        self.cursor.execute(query, (decision_id,))
        criteria = self.cursor.fetchall()
        
        return [
            {
                "id": c[0], 
                "name": c[1], 
                "description": c[2],
                "display_order": c[3],
                "weight": c[4]
            }
            for c in criteria
        ]
