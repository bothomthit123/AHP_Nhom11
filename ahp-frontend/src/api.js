// src/api.js
import axios from 'axios';

const API_URL = 'http://localhost:8000/api/ahp';

// Create axios instance with common configuration
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Error handler helper
const handleApiError = (error, operation) => {
  console.error(`Error ${operation}:`, error);
  throw error;
};

// API service with methods for each endpoint
const ApiService = {
  /**
   * Create a new decision problem
   * @param {Object} data - Decision problem data with criteria and alternatives
   * @returns {Promise<Object>} - Created decision problem
   */
  createDecisionProblem: async (data) => {
    try {
      const response = await apiClient.post('/decision', data);
      return response.data;
    } catch (error) {
      handleApiError(error, 'creating decision problem');
    }
  },

  /**
   * Get decision problem by ID
   * @param {number} id - Decision problem ID
   * @returns {Promise<Object>} - Decision problem details
   */
  getDecisionProblem: async (id) => {
    try {
      const response = await apiClient.get(`/decision/${id}`);
      return response.data;
    } catch (error) {
      handleApiError(error, 'fetching decision problem');
    }
  },

  /**
   * Get criteria for a decision problem with weights if available
   * @param {number} id - Decision problem ID
   * @returns {Promise<Object>} - Decision criteria with weights
   */
  getDecisionCriteria: async (id) => {
    try {
      const response = await apiClient.get(`/decision/${id}/criteria`);
      return response.data;
    } catch (error) {
      handleApiError(error, 'fetching decision criteria');
    }
  },

  /**
   * Calculate criteria weights from pairwise comparison matrix with step-by-step details
   * @param {number} decisionId - Decision problem ID
   * @param {Object} data - Criteria comparison data
   * @returns {Promise<Object>} - Step-by-step calculation details
   */
  computeCriteriaWeights: async (decisionId, data) => {
    try {
      const response = await apiClient.post(`/criteria-matrix?decision_id=${decisionId}`, data);
      return response.data;
    } catch (error) {
      handleApiError(error, 'calculating criteria weights');
    }
  },

  /**
   * Calculate alternative weights for a specific criterion with step-by-step details
   * @param {Object} data - Alternative comparison data for a criterion
   * @returns {Promise<Object>} - Step-by-step calculation details
   */
  computeAlternativeWeights: async (data) => {
    try {
      const response = await apiClient.post('/alternative-matrix', data);
      return response.data;
    } catch (error) {
      handleApiError(error, 'calculating alternative weights');
    }
  },

  /**
   * Calculate final alternative rankings
   * @param {Object} data - Final ranking input data
   * @returns {Promise<Array>} - Ranked alternatives with weights
   */
  calculateFinalRanking: async (data) => {
    try {
      const response = await apiClient.post('/final-ranking', data);
      return response.data;
    } catch (error) {
      handleApiError(error, 'calculating final ranking');
    }
  },

  /**
   * Legacy method: Rank alternatives based on criteria weights and comparison matrices
   * @param {Object} data - Alternative comparison data including criteria weights
   * @returns {Promise<Array>} - Ranked alternatives with weights
   */
  rankAlternatives: async (data) => {
    try {
      const response = await apiClient.post('/alternatives', data);
      return response.data;
    } catch (error) {
      handleApiError(error, 'ranking alternatives');
    }
  },

  /**
   * Get all available criteria from the database
   * @returns {Promise<Array>} - Available criteria
   */
  getCriteria: async () => {
    try {
      const response = await apiClient.get('/criteria');
      return response.data;
    } catch (error) {
      handleApiError(error, 'fetching criteria');
    }
  },

  /**
   * Get all available alternatives from the database
   * @returns {Promise<Array>} - Available alternatives
   */
  getAlternatives: async () => {
    try {
      const response = await apiClient.get('/alternatives');
      return response.data;
    } catch (error) {
      handleApiError(error, 'fetching alternatives');
    }
  }
};

export default ApiService;


