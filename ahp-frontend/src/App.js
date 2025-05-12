// src/App.js
import React, { useState } from 'react';
import CriteriaForm from './components/CriteriaForm';
import CriteriaWeights from './components/CriteriaWeights';
import AlternativeComparison from './components/AlternativeComparison';
import Results from './components/Results';
import ApiService from './api';
import DecisionSetup from './components/DecisionSetup';
import './App.css';

const App = () => {
  const [currentStage, setCurrentStage] = useState('decision-setup');
  const [previousStage, setPreviousStage] = useState(null);
  const [decisionId, setDecisionId] = useState(null);
  const [decisionData, setDecisionData] = useState(null);
  const [criteriaData, setCriteriaData] = useState(null);
  const [criteriaWeights, setCriteriaWeights] = useState(null);
  const [alternativeWeightsByMatrix, setAlternativeWeightsByMatrix] = useState({});
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  /**
   * Handle navigation to a previous step
   * @param {string} targetStage - Stage to navigate back to
   */
  const handleNavigateBack = (targetStage) => {
    if (hasUnsavedChanges) {
      const confirmNavigation = window.confirm(
        "You have unsaved changes. If you go back, your recent inputs may be lost. Continue anyway?"
      );
      if (!confirmNavigation) return;
    }
    
    setPreviousStage(currentStage);
    setCurrentStage(targetStage);
    setHasUnsavedChanges(false);
  };

  /**
   * Handle decision setup submission
   * @param {Object} formData - The decision setup data
   */
  const handleDecisionSetup = async (formData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await ApiService.createDecisionProblem(formData);
      
      setDecisionId(result.id);
      setDecisionData(result);
      setPreviousStage('decision-setup');
      setCurrentStage('criteria-input');
    } catch (error) {
      console.error('Decision setup error:', error);
      let errorMessage = 'Error creating decision problem. Please try again later.';
      
      if (error.response && error.response.data) {
        errorMessage += ' Details: ' + 
          (error.response.data.detail || JSON.stringify(error.response.data));
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle criteria form submission and calculate weights
   * @param {Object} formData - The criteria data from the form
   */
  const handleCriteriaSubmit = async (formData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Make sure we have a decision ID
      if (!decisionId) {
        throw new Error('No decision ID found. Please set up a decision first.');
      }
      
      const result = await ApiService.computeCriteriaWeights(decisionId, formData);
      
      // Store the step-by-step calculation data
      setCriteriaData(result);
      
      // Store the weights for later use
      setCriteriaWeights(result.weights);
      
      setPreviousStage('criteria-input');
      setCurrentStage('criteria-weights');
    } catch (error) {
      console.error('Calculation error:', error);
      let errorMessage = 'Error calculating weights. Please try again later.';
      
      // Extract more detailed error message if available
      if (error.response && error.response.data) {
        errorMessage += ' Details: ' + 
          (error.response.data.detail || JSON.stringify(error.response.data));
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle proceeding to alternative comparison
   */
  const handleProceedToAlternatives = () => {
    setPreviousStage('criteria-weights');
    setCurrentStage('alternative-comparison');
  };

  /**
   * Handle alternative comparison matrix submission for a specific criterion
   * @param {Object} data - The alternative comparison data for a criterion
   */
  const handleAlternativeMatrix = async (data) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await ApiService.computeAlternativeWeights({
        decision_id: decisionId,
        criteria_id: data.criteriaId,
        criteria_name: data.criteriaName,
        alternatives: data.alternatives,
        matrix: data.matrix
      });
      
      // Store the weights for this criterion
      setAlternativeWeightsByMatrix(prev => ({
        ...prev,
        [data.criteriaName]: result
      }));
      
      return result;
    } catch (error) {
      console.error('Alternative matrix calculation error:', error);
      let errorMessage = 'Error calculating alternative weights. Please try again later.';
      
      if (error.response && error.response.data) {
        errorMessage += ' Details: ' + 
          (error.response.data.detail || JSON.stringify(error.response.data));
      }
      
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle calculation of final rankings
   * @param {Object} data - The data for final ranking calculation
   */
  const handleFinalRanking = async (data) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await ApiService.calculateFinalRanking({
        decision_id: decisionId,
        alternatives: data.alternatives,
        criteria_weights: data.criteriaWeights,
        alternative_weights_by_criteria: data.alternativeWeightsByCriteria
      });
      
      setResults(result);
      setPreviousStage('alternative-comparison');
      setCurrentStage('results');
    } catch (error) {
      console.error('Final ranking error:', error);
      let errorMessage = 'Error calculating final rankings. Please try again later.';
      
      if (error.response && error.response.data) {
        errorMessage += ' Details: ' + 
          (error.response.data.detail || JSON.stringify(error.response.data));
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle restart of the AHP process
   */
  const handleRestart = () => {
    setCurrentStage('decision-setup');
    setDecisionId(null);
    setDecisionData(null);
    setCriteriaData(null);
    setCriteriaWeights(null);
    setAlternativeWeightsByMatrix({});
    setResults(null);
    setError(null);
  };

  /**
   * Handle data changes in matrix inputs
   * @param {boolean} hasChanges - Whether there are unsaved changes
   */
  const handleDataChanges = (hasChanges) => {
    setHasUnsavedChanges(hasChanges);
  };

  /**
   * Render the current stage content
   */
  const renderStageContent = () => {
    if (isLoading) {
      return <div className="loading-indicator">Processing...</div>;
    }
    
    if (error) {
      return <div className="error-message">{error}</div>;
    }
    
    switch (currentStage) {
      case 'decision-setup':
        return <DecisionSetup onSubmit={handleDecisionSetup} />;
      
      case 'criteria-input':
        return (
          <CriteriaForm 
            onSubmit={handleCriteriaSubmit} 
            criteriaNames={decisionData?.criteria || []}
            onNavigateBack={() => handleNavigateBack('decision-setup')}
            onDataChange={handleDataChanges}
          />
        );
      
      case 'criteria-weights':
        return (
          <CriteriaWeights 
            criteriaData={criteriaData}
            onNextStep={handleProceedToAlternatives}
            onNavigateBack={() => handleNavigateBack('criteria-input')}
          />
        );
      
      case 'alternative-comparison':
        return (
          <AlternativeComparison 
            decisionId={decisionId}
            criteriaNames={decisionData?.criteria || []}
            criteriaIds={decisionData?.criteria_ids || []}
            criteriaWeights={criteriaWeights}
            alternatives={decisionData?.alternatives || []}
            onMatrixSubmit={handleAlternativeMatrix}
            onFinalCalculation={handleFinalRanking}
            onNavigateBack={() => handleNavigateBack('criteria-weights')}
            onDataChange={handleDataChanges}
          />
        );
      
      case 'results':
        return (
          <>
            <Results 
              data={results}
              onNavigateBack={() => handleNavigateBack('alternative-comparison')}
            />
            <div className="restart-container">
              <button className="restart-button" onClick={handleRestart}>
              Bắt đầu lại
              </button>
            </div>
          </>
        );
      
      default:
        return <DecisionSetup onSubmit={handleDecisionSetup} />;
    }
  };

  /**
   * Render the progress indicator
   */
  const renderProgressIndicator = () => {
    const stages = [
      { id: 'decision-setup', name: 'Thiết lập vấn đề' },
      { id: 'criteria-input', name: 'So sánh tiêu chí' },
      { id: 'criteria-weights', name: 'Trọng số tiêu chí' },
      { id: 'alternative-comparison', name: 'So sánh địa điểm' },
      { id: 'results', name: 'Kết quả' }
    ];
    
    return (
      <div className="progress-indicator">
        {stages.map((stage, index) => (
          <React.Fragment key={stage.id}>
            <div 
              className={`progress-step ${currentStage === stage.id ? 'active' : ''} ${
                stages.findIndex(s => s.id === currentStage) >= index ? 'completed' : ''
              }`}
            >
              <div className="step-number">{index + 1}</div>
              <div className="step-name">{stage.name}</div>
            </div>
            {index < stages.length - 1 && (
              <div className={`progress-line ${
                stages.findIndex(s => s.id === currentStage) > index ? 'completed' : ''
              }`}></div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Hệ thống hỗ trợ ra quyết định tìm địa điểm du lịch</h1>
        {renderProgressIndicator()}
      </header>
      
      <main className="app-content">
        {renderStageContent()}
      </main>
    </div>
  );
};

export default App;
