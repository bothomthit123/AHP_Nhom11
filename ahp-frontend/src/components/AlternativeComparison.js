import React, { useState, useEffect } from 'react';
import './AlternativeComparison.css';
import ApiService from '../api';

const DEFAULT_ALTERNATIVES = ['Hội An', 'Đà Lạt', 'Hạ Long', 'Nha Trang', 'Phú Quốc'];

const AlternativeComparison = ({ 
  decisionId, 
  criteriaNames = [], 
  criteriaIds = [], 
  criteriaWeights, 
  alternatives = DEFAULT_ALTERNATIVES,
  onFinalCalculation
}) => {
  const [localAlternatives, setAlternatives] = useState(alternatives);
  const [newAlternative, setNewAlternative] = useState('');
  const [matrices, setMatrices] = useState({});
  const [columnSums, setColumnSums] = useState({});
  const [normalizedMatrices, setNormalizedMatrices] = useState({});
  const [localWeights, setLocalWeights] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [criteriaData, setCriteriaData] = useState([]);
  const [localCriteriaNames, setLocalCriteriaNames] = useState(criteriaNames);
  const [localCriteriaIds, setLocalCriteriaIds] = useState(criteriaIds);
  const [activeCriterion, setActiveCriterion] = useState(null);
  const [invalidInputs, setInvalidInputs] = useState({}); // Track invalid inputs
  const [consistencyData, setConsistencyData] = useState({});

  // Fetch criteria data when component mounts or decisionId changes
  useEffect(() => {
    if (decisionId) {
      fetchCriteriaData();
    }
  }, [decisionId]);

  // Fetch criteria data from the API
  const fetchCriteriaData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await ApiService.getDecisionCriteria(decisionId);
      setCriteriaData(result.criteria);
      
      // Update local criteria names and IDs if they're empty or if the API returned different data
      if (result.criteria && result.criteria.length > 0) {
        const names = result.criteria.map(c => c.name);
        const ids = result.criteria.map(c => c.id);
        
        setLocalCriteriaNames(names);
        setLocalCriteriaIds(ids);
        
        // Set the first criterion as active by default
        setActiveCriterion(names[0]);

      }
        } catch (err) {
          console.error("Lỗi khi tải dữ liệu tiêu chí:", err);
          setError("Không thể tải dữ liệu tiêu chí. Vui lòng thử lại sau.");
        } finally {
      setLoading(false);
    }
  };

  // Initialize matrices for each criterion
  useEffect(() => {
    if (localCriteriaNames && localCriteriaNames.length > 0) {
      const initialMatrices = {};
      localCriteriaNames.forEach(criterion => {
        const size = localAlternatives.length;
        const matrix = Array(size).fill().map(() => Array(size).fill(1));
        initialMatrices[criterion] = matrix;
      });
      setMatrices(initialMatrices);
      
      // Calculate all values for each criterion
      Object.keys(initialMatrices).forEach(criterion => {
        calculateAllSteps(initialMatrices, criterion);
      });
    }
  }, [localCriteriaNames, localAlternatives]);

  const handleInputChange = (criterion, row, col, value) => {
    // Clear the invalid state for this cell
    const newInvalidInputs = { ...invalidInputs };
    delete newInvalidInputs[`${criterion}-${row}-${col}`];
    
    // Check if input is in fraction format (e.g., "1/3")
    if (value.includes('/')) {
      const [numerator, denominator] = value.split('/').map(part => parseFloat(part.trim()));
      if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
        // Calculate the fraction value
        const fractionValue = numerator / denominator;
        
        // Validate if the value is within the valid AHP range (1/9 to 9)
        if (fractionValue >= 1/9 && fractionValue <= 9) {
          // Round the fraction result to 2 decimal places
          const roundedValue = Math.round(fractionValue * 100) / 100;
          updateMatrixValue(criterion, row, col, roundedValue);
        } else {
          // Mark input as invalid with a specific message
          newInvalidInputs[`${criterion}-${row}-${col}`] = `Giá trị ${value} (${(fractionValue).toFixed(2)}) nằm ngoài phạm vi cho phép (1/9 đến 9)`;
          
          // Update the matrix with the original value but mark it as invalid
          const newMatrices = { ...matrices };
          if (!newMatrices[criterion]) {
            newMatrices[criterion] = Array(localAlternatives.length).fill().map(() => Array(localAlternatives.length).fill(1));
          }
          newMatrices[criterion][row][col] = value;
          setMatrices(newMatrices);
        }
      } else {
        // Invalid fraction format
        newInvalidInputs[`${criterion}-${row}-${col}`] = 'Định dạng phân số không hợp lệ (ví dụ: 1/3)';
        
        // Update the matrix with the invalid value to keep it in the input field
        const newMatrices = { ...matrices };
        if (!newMatrices[criterion]) {
          newMatrices[criterion] = Array(localAlternatives.length).fill().map(() => Array(localAlternatives.length).fill(1));
        }
        newMatrices[criterion][row][col] = value;
        setMatrices(newMatrices);
      }
    } else {
      const parsedValue = parseFloat(value);
      if (!isNaN(parsedValue)) {
        // Validate if the value is within the valid AHP range (1/9 to 9)
        if (parsedValue >= 1/9 && parsedValue <= 9) {
          // Round the input value to 2 decimal places
          const roundedValue = Math.round(parsedValue * 100) / 100;
          updateMatrixValue(criterion, row, col, roundedValue);
        } else {
          // Mark input as invalid with a specific message
          newInvalidInputs[`${criterion}-${row}-${col}`] = `Giá trị ${parsedValue} nằm ngoài phạm vi cho phép (1/9 đến 9)`;
          
          // Update the matrix with the invalid value to keep it in the input field
          const newMatrices = { ...matrices };
          if (!newMatrices[criterion]) {
            newMatrices[criterion] = Array(localAlternatives.length).fill().map(() => Array(localAlternatives.length).fill(1));
          }
          newMatrices[criterion][row][col] = value;
          setMatrices(newMatrices);
        }
      } else if (value !== '') {
        // Non-numeric input that isn't empty
        newInvalidInputs[`${criterion}-${row}-${col}`] = 'Vui lòng nhập số hoặc phân số (ví dụ: 3 hoặc 1/3)';
        
        // Update the matrix with the invalid value to keep it in the input field
        const newMatrices = { ...matrices };
        if (!newMatrices[criterion]) {
          newMatrices[criterion] = Array(localAlternatives.length).fill().map(() => Array(localAlternatives.length).fill(1));
        }
        newMatrices[criterion][row][col] = value;
        setMatrices(newMatrices);
      }
    }
    
    setInvalidInputs(newInvalidInputs);
  };
  
  /**
   * Update the matrix with the validated value
   * @param {string} criterion - The current criterion
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @param {number} value - Validated numeric value
   */
  const updateMatrixValue = (criterion, row, col, value) => {
    const newMatrices = { ...matrices };
    if (!newMatrices[criterion]) {
      newMatrices[criterion] = Array(localAlternatives.length).fill().map(() => Array(localAlternatives.length).fill(1));
    }
    
    newMatrices[criterion][row][col] = value;
    
    // Update reciprocal value with rounding to 2 decimal places
    if (row !== col) {
      newMatrices[criterion][col][row] = Math.round((1 / value) * 100) / 100;
    }
    
    setMatrices(newMatrices);
    
    // Calculate all values immediately after input changes
    calculateAllSteps(newMatrices, criterion);
  };

  // Calculate all steps for a specific criterion
  const calculateAllSteps = (currentMatrices = matrices, criterion) => {
    if (!criterion || !currentMatrices[criterion]) return;
    
    // Calculate column sums
    const newColumnSums = { ...columnSums };
    const matrix = currentMatrices[criterion];
    const size = matrix.length;
    const sums = Array(size).fill(0);
    
    for (let col = 0; col < size; col++) {
      for (let row = 0; row < size; row++) {
        sums[col] += matrix[row][col];
      }
    }
    
    newColumnSums[criterion] = sums;
    setColumnSums(newColumnSums);
    
    // Normalize matrix
    const newNormalizedMatrices = { ...normalizedMatrices };
    const normalized = Array(size).fill().map(() => Array(size).fill(0));
    
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        normalized[row][col] = matrix[row][col] / sums[col];
      }
    }
    
    newNormalizedMatrices[criterion] = normalized;
    setNormalizedMatrices(newNormalizedMatrices);
    
    // Calculate local weights
    const newLocalWeights = { ...localWeights };
    const weights = Array(size).fill(0);
    
    for (let row = 0; row < size; row++) {
      let sum = 0;
      for (let col = 0; col < size; col++) {
        sum += normalized[row][col];
      }
      weights[row] = sum / size;
    }
    
    newLocalWeights[criterion] = weights;
    setLocalWeights(newLocalWeights);
    
    // Calculate consistency check
    const weightedSums = Array(size).fill(0);
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        weightedSums[row] += matrix[row][col] * weights[col];
      }
    }
    
    const consistencyVector = Array(size).fill(0);
    for (let i = 0; i < size; i++) {
      consistencyVector[i] = weightedSums[i] / weights[i];
    }
    
    const lambdaMax = consistencyVector.reduce((sum, value) => sum + value, 0) / size;
    const ci = (lambdaMax - size) / (size - 1);
    const riValues = [0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];
    const ri = riValues[size - 1] || 1.5;
    const cr = ci / ri;
    const isConsistent = cr < 0.1;
    
    const newConsistencyData = { ...consistencyData };
    newConsistencyData[criterion] = {
      weighted_sums: weightedSums,
      consistency_vector: consistencyVector,
      lambda_max: lambdaMax,
      ci: ci,
      ri: ri,
      cr: cr,
      is_consistent: isConsistent
    };
    setConsistencyData(newConsistencyData);
  };

  const handleSubmit = () => {
    // Check if there are any invalid inputs
    if (Object.keys(invalidInputs).length > 0) {
      alert('Vui lòng sửa các giá trị không hợp lệ trước khi tiếp tục.');
      return;
    }
    
    // Check if all criterion matrices are consistent
    const inconsistentCriteria = Object.keys(consistencyData).filter(
      criterion => !consistencyData[criterion].is_consistent
    );
    
    if (inconsistentCriteria.length > 0) {
      const confirmContinue = window.confirm(
        `Phát hiện ${inconsistentCriteria.length} tiêu chí có ma trận không nhất quán: ${inconsistentCriteria.join(', ')}. Bạn vẫn muốn tiếp tục?`
      );
      if (!confirmContinue) return;
    }
    
    // Make sure all calculations are done for all criteria
    Object.keys(matrices).forEach(criterion => {
      calculateAllSteps(matrices, criterion);
    });
    
    // Prepare data for final calculation
    const alternativeWeightsByCriteria = [];
    
    localCriteriaNames.forEach((criterion) => {
      // Get weights for this criterion's alternatives
      const criterionWeights = localWeights[criterion] || [];
      alternativeWeightsByCriteria.push(criterionWeights);
    });

    // Call the onFinalCalculation prop with the updated criteria information
    if (onFinalCalculation) {
      onFinalCalculation({
        decision_id: decisionId,
        alternatives: localAlternatives,
        criteriaWeights: criteriaData.map(c => c.weight) || criteriaWeights,
        alternativeWeightsByCriteria: alternativeWeightsByCriteria
      });
    } else {
      console.error("onFinalCalculation prop is not provided");
    }
  };

  const handleAddAlternative = () => {
    if (newAlternative.trim() === '') return;
    
    const updatedAlternatives = [...localAlternatives, newAlternative.trim()];
    setAlternatives(updatedAlternatives);
    setNewAlternative('');
    
    // Update matrices to include the new alternative
    const updatedMatrices = { ...matrices };
    Object.keys(updatedMatrices).forEach(criterion => {
      const currentMatrix = updatedMatrices[criterion];
      const newSize = currentMatrix.length + 1;
      const newMatrix = Array(newSize).fill().map(() => Array(newSize).fill(1));
      
      // Copy existing values
      for (let i = 0; i < currentMatrix.length; i++) {
        for (let j = 0; j < currentMatrix.length; j++) {
          newMatrix[i][j] = currentMatrix[i][j];
        }
      }
      
      updatedMatrices[criterion] = newMatrix;
    });
    
    setMatrices(updatedMatrices);
    
    // Calculate all steps for all criteria
    Object.keys(updatedMatrices).forEach(criterion => {
      calculateAllSteps(updatedMatrices, criterion);
    });
  };

  const handleRemoveAlternative = (index) => {
    if (localAlternatives.length <= 2) {
      alert('Cần ít nhất hai lựa chọn');

      return;
    }
    
    const updatedAlternatives = localAlternatives.filter((_, i) => i !== index);
    setAlternatives(updatedAlternatives);
    
    // Update matrices to remove the alternative
    const updatedMatrices = { ...matrices };
    Object.keys(updatedMatrices).forEach(criterion => {
      const currentMatrix = updatedMatrices[criterion];
      const newMatrix = currentMatrix
        .filter((_, i) => i !== index)
        .map(row => row.filter((_, j) => j !== index));
      
      updatedMatrices[criterion] = newMatrix;
    });
    
    setMatrices(updatedMatrices);
    
    // Calculate all steps for all criteria
    Object.keys(updatedMatrices).forEach(criterion => {
      calculateAllSteps(updatedMatrices, criterion);
    });
  };

  const renderCriteriaSelector = () => {
    if (loading) {
      return <div className="loading">Đang tải tiêu chí...</div>;
    }
    
    if (error) {
      return <div className="error">{error}</div>;
    }
    
    return (
      <div className="criteria-tabs">
        {localCriteriaNames.map((name, index) => (
          <button 
            key={index}
            className={`criteria-tab ${activeCriterion === name ? 'active' : ''}`}
            onClick={() => setActiveCriterion(name)}
          >
            {name} 
            {criteriaData[index]?.weight && (
              <span className="weight-badge">
                {criteriaData[index].weight.toFixed(2)}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  };

  const renderActiveMatrix = () => {
    if (!activeCriterion || !matrices[activeCriterion]) {
      return <div>Vui lòng chọn một tiêu chí</div>;
    }

    return (
      <div className="matrix-sections">
      <div className="matrix-section">
        <h3>Bước 1: Giá trị so sánh cặp cho tiêu chí "{activeCriterion}"</h3>
        {/* <p className="instruction">
          So sánh các lựa chọn theo hàng và cột. Giá trị cho phép từ 1/9 đến 9:
          <br />1 = Tầm quan trọng ngang nhau
          <br />9 = Quan trọng hơn rất nhiều so với lựa chọn được so sánh
          <br />1/9 = Kém quan trọng hơn rất nhiều so với lựa chọn được so sánh
          <br />Nhập số thập phân (1, 2, 3,...) hoặc phân số (1/2, 1/3,...)
        </p>
        <div className="ahp-scale-guide">
          <h4>Thang đo AHP</h4>
          <div className="scale-values">
            <span>1/9</span>
            <span>1/7</span>
            <span>1/5</span>
            <span>1/3</span>
            <span>1</span>
            <span>3</span>
            <span>5</span>
            <span>7</span>
            <span>9</span>
          </div>
          <div className="scale-labels">
            <span>Rất kém quan trọng hơn</span>
            <span>Quan trọng ngang nhau</span>
            <span>Rất quan trọng hơn</span>
          </div>
        </div> */}
        
        {Object.keys(invalidInputs).some(key => key.startsWith(`${activeCriterion}-`)) && (
          <div className="validation-summary">
            <p className="validation-error">Có giá trị không hợp lệ. Vui lòng sửa trước khi tiếp tục.</p>
          </div>
        )}
        
        <div className="matrix-container">
        <table className="comparison-matrix">
          <thead>
          <tr>
            <th></th>
            {localAlternatives.map((alt, index) => (
            <th key={index}>{alt}</th>
            ))}
          </tr>
          </thead>
          <tbody>
          {localAlternatives.map((alt, rowIndex) => (
            <tr key={rowIndex}>
            <td className="alternative-name">{alt}</td>
            {localAlternatives.map((_, colIndex) => (
              <td key={colIndex}>
              <input
                type="text"
                placeholder="1"
                value={matrices[activeCriterion][rowIndex][colIndex]}
                onChange={(e) => handleInputChange(activeCriterion, rowIndex, colIndex, e.target.value)}
                className={`
                  ${rowIndex === colIndex ? 'diagonal-cell' : rowIndex > colIndex ? 'below-diagonal-cell' : ''}
                  ${invalidInputs[`${activeCriterion}-${rowIndex}-${colIndex}`] ? 'invalid' : ''}
                `}
                disabled={rowIndex === colIndex || rowIndex > colIndex}
                title={invalidInputs[`${activeCriterion}-${rowIndex}-${colIndex}`] || ''}
              />
              {invalidInputs[`${activeCriterion}-${rowIndex}-${colIndex}`] && (
                <div className="validation-message">
                  {invalidInputs[`${activeCriterion}-${rowIndex}-${colIndex}`]}
                </div>
              )}
              </td>
            ))}
            </tr>
          ))}
          </tbody>
        </table>
        </div>
      </div>
      
      <div className="matrix-section">
        <h3>Bước 2: Ma trận so sánh cặp với tổng cột theo tiêu chí "{activeCriterion}"</h3>
        <div className="matrix-container">
        <table className="comparison-matrix">
          <thead>
          <tr>
            <th></th>
            {localAlternatives.map((alt, index) => (
            <th key={index}>{alt}</th>
            ))}
          </tr>
          </thead>
          <tbody>
          {localAlternatives.map((alt, rowIndex) => (
            <tr key={rowIndex}>
            <td className="alternative-name">{alt}</td>
            {localAlternatives.map((_, colIndex) => (
              <td key={colIndex}>
              {matrices[activeCriterion] && matrices[activeCriterion][rowIndex] && 
               matrices[activeCriterion][rowIndex][colIndex] !== undefined
                ? (Math.round(matrices[activeCriterion][rowIndex][colIndex] * 100) / 100).toFixed(2)
                : '0.00'}
              </td>
            ))}
            </tr>
          ))}
          <tr className="sum-row">
            <td><strong>Tổng</strong></td>
            {columnSums[activeCriterion] && columnSums[activeCriterion].map((sum, index) => (
            <td key={index}><strong>{(Math.round(sum * 100) / 100).toFixed(2)}</strong></td>
            ))}
          </tr>
          </tbody>
        </table>
        </div>
        <p className="matrix-explanation">
        Mỗi cột được tính tổng để sử dụng trong quá trình chuẩn hóa.
        </p>
      </div>
      
      <div className="matrix-section">
        <h3>Bước 3: Ma trận chuẩn hóa theo tiêu chí "{activeCriterion}"</h3>
        <div className="matrix-container">
        <table className="comparison-matrix">
          <thead>
          <tr>
            <th></th>
            {localAlternatives.map((alt, index) => (
            <th key={index}>{alt}</th>
            ))}
          </tr>
          </thead>
          <tbody>
          {localAlternatives.map((alt, rowIndex) => (
            <tr key={rowIndex}>
            <td className="alternative-name">{alt}</td>
            {localAlternatives.map((_, colIndex) => (
              <td key={colIndex}>
              {normalizedMatrices[activeCriterion] && 
               normalizedMatrices[activeCriterion][rowIndex] && 
               normalizedMatrices[activeCriterion][rowIndex][colIndex] !== undefined
                ? (Math.round(normalizedMatrices[activeCriterion][rowIndex][colIndex] * 100) / 100).toFixed(2)
                : '0.00'}
              </td>
            ))}
            </tr>
          ))}
          </tbody>
        </table>
        </div>
        <p className="matrix-explanation">
        Mỗi ô được tính bằng cách chia giá trị gốc cho tổng cột.
        </p>
      </div>
      
      <div className="matrix-section">
        <h3>Bước 4: Trọng số phương án cho "{activeCriterion}"</h3>
        <div className="local-weights-container">
        <table className="weights-table">
          <thead>
          <tr>
            <th>Phương án</th>
            <th>Trọng số PA</th>
          </tr>
          </thead>
          <tbody>
          {localAlternatives.map((alt, index) => (
            <tr key={index}>
            <td>{alt}</td>
            <td>
              {localWeights[activeCriterion] && 
               localWeights[activeCriterion][index] !== undefined
              ? (Math.round(localWeights[activeCriterion][index] * 100) / 100).toFixed(2)
              : '0.00'}
            </td>
            </tr>
          ))}
          </tbody>
        </table>
        </div>
        <p className="matrix-explanation">
        Trọng số cục bộ được tính là giá trị trung bình của mỗi hàng trong ma trận đã chuẩn hóa.
        </p>
      </div>
      
      <div className="matrix-section">
        <h3>Bước 5: Kiểm tra tính nhất quán cho tiêu chí "{activeCriterion}"</h3>
        {renderConsistencyCheck(activeCriterion)}
      </div>
      </div>
    );
  };

  const renderConsistencyCheck = (criterion) => {
    const consistency = consistencyData[criterion];
    
    if (!consistency) {
      return <div className="no-data">Chưa có dữ liệu tính nhất quán</div>;
    }
    
    const { 
      weighted_sums, 
      consistency_vector, 
      lambda_max, 
      ci, 
      ri, 
      cr, 
      is_consistent 
    } = consistency;
    
    return (
      <div className="consistency-container">
        <div className="consistency-calculation">
          <h4>Tính toán vector nhất quán</h4>
          <p className="calculation-explanation">
            Mỗi phần tử trong ma trận gốc được nhân với trọng số của phương án tương ứng theo cột.
          </p>
          
          <div className="consistency-vector-container">
            <table className="consistency-vector-table">
              <thead>
                <tr>
                  <th>Phương án</th>
                  <th className="numeric-header">Trọng số (W)</th>
                  <th className="numeric-header">Tổng trọng số (AW)</th>
                  <th className="numeric-header">Vector nhất quán (AW/W)</th>
                </tr>
              </thead>
              <tbody>
                {localAlternatives.map((alt, idx) => (
                  <tr key={idx}>
                    <td>{alt}</td>
                    <td className="numeric-cell">
                      {localWeights[criterion] && localWeights[criterion][idx] 
                        ? (Math.round(localWeights[criterion][idx] * 100) / 100).toFixed(2) 
                        : '—'}
                    </td>
                    <td className="numeric-cell">
                      {weighted_sums && weighted_sums[idx] !== undefined 
                        ? (Math.round(weighted_sums[idx] * 100) / 100).toFixed(2) 
                        : '—'}
                    </td>
                    <td className="numeric-cell">
                      {consistency_vector && consistency_vector[idx] !== undefined 
                        ? (Math.round(consistency_vector[idx] * 100) / 100).toFixed(2) 
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="lambda-calculation">
            <h4>Tính λ<sub>max</sub> (Maximum Eigenvalue)</h4>
            <p>
              λ<sub>max</sub> = Trung bình của các giá trị Vector nhất quán = 
              {consistency_vector 
                ? ` (${consistency_vector.map(v => (Math.round(v * 100) / 100).toFixed(2)).join(' + ')}) / ${consistency_vector.length} = ${(Math.round(lambda_max * 100) / 100).toFixed(2)}`
                : ' —'}
            </p>
          </div>
        </div>
        
        <div className="consistency-info">
          <p>
            <strong>Giá trị (λ<sub>max</sub>):</strong> 
            <span className="numeric-value">{typeof lambda_max === 'number' ? (Math.round(lambda_max * 100) / 100).toFixed(2) : '—'}</span>
          </p>
          <p>
            <strong>Chỉ số nhất quán (CI):</strong> 
            <span className="numeric-value">{typeof ci === 'number' ? (Math.round(ci * 100) / 100).toFixed(2) : '—'}</span>
            {typeof ci === 'number' && typeof lambda_max === 'number' && localAlternatives.length > 0 && (
              <span className="formula-explanation">
                = (λ<sub>max</sub> - n) / (n - 1) = ({(Math.round(lambda_max * 100) / 100).toFixed(2)} - {localAlternatives.length}) / ({localAlternatives.length} - 1)
              </span>
            )}
          </p>
          <p>
            <strong>Chỉ số ngẫu nhiên (RI):</strong> 
            <span className="numeric-value">{typeof ri === 'number' ? (Math.round(ri * 100) / 100).toFixed(2) : '—'}</span>
            <span className="formula-explanation">
              (Từ bảng RI dựa trên kích thước ma trận n = {localAlternatives.length})
            </span>
          </p>
          <p>
            <strong>Tỉ lệ nhất quán (CR):</strong> 
            <span className="numeric-value">{typeof cr === 'number' ? (Math.round(cr * 100) / 100).toFixed(2) : '—'}</span>
            {typeof ci === 'number' && typeof ri === 'number' && (
              <span className="formula-explanation">
                = CI / RI = {(Math.round(ci * 100) / 100).toFixed(2)} / {(Math.round(ri * 100) / 100).toFixed(2)}
              </span>
            )}
            <span className="info-tooltip" title="CR nên nhỏ hơn 0.1 cho các đánh giá nhất quán">ⓘ</span>
          </p>
          <p className={is_consistent ? "consistent-status" : "inconsistent-status"}>
            <strong>Trạng thái:</strong> 
            {is_consistent !== undefined 
              ? (is_consistent ? "Nhất quán (CR < 0.1)" : "Không nhất quán (CR >= 0.1)") 
              : "Đang chờ tính toán"}
            {is_consistent === false && (
              <span className="warning-message"> - Cân nhắc xem xét lại các so sánh của bạn cho phương án này</span>
            )}
          </p>
        </div>
        
      </div>
    );
  };

  const renderAllWeightsSummary = () => {
    if (Object.keys(localWeights).length === 0) return null;
    
    return (
      <div className="all-weights-summary">
        <h3>Trọng số các PA theo các tiêu chí</h3>
        <div className="matrix-container">
          <table className="weights-summary-table">
            <thead>
              <tr>
                <th></th>
                {localCriteriaNames.map((criterion, index) => (
                  <th key={index}>{criterion}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {localAlternatives.map((alt, altIndex) => (
                <tr key={altIndex}>
                  <td className="alternative-name">{alt}</td>
                  {localCriteriaNames.map((criterion, critIndex) => (
                    <td key={critIndex}>
                      {localWeights[criterion] && 
                       localWeights[criterion][altIndex] !== undefined
                        ? (Math.round(localWeights[criterion][altIndex] * 100) / 100).toFixed(2)
                        : '0.00'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="matrix-explanation">
          Bảng này tổng hợp trọng số cục bộ của mỗi lựa chọn theo tất cả các tiêu chí.
          Mỗi ô thể hiện mức độ hiệu quả của lựa chọn đối với một tiêu chí cụ thể.
        </p>
      </div>
    );
  };

  if (loading) {
    return <div className="loading-container">Đang tải dữ liệu so sánh địa điểm...</div>;
  }

  return (
    <div className="alternative-comparison">
      <h2>So sánh cặp các lựa chọn thay thế</h2>
      
      <div className="alternatives-management">
        <h3>Quản lý các lựa chọn</h3>
        <div className="alternatives-list">
          {localAlternatives.map((alt, index) => (
            <div key={index} className="alternative-item">
              <span>{alt}</span>
              <button 
                className="remove-button" 
                onClick={() => handleRemoveAlternative(index)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="add-alternative">
          <input
            type="text"
            value={newAlternative}
            onChange={(e) => setNewAlternative(e.target.value)}
            placeholder="Tên lựa chọn mới"
          />
          <button onClick={handleAddAlternative}>Thêm</button>
        </div>
      </div>
      
      {/* Criteria tabs */}
      {renderCriteriaSelector()}
      
      {/* Matrix for active criterion */}
      {renderActiveMatrix()}
      
      {/* Summary of all weights */}
      {renderAllWeightsSummary()}
      
      <div className="submit-container">
        <button 
          className="submit-button"
          onClick={handleSubmit}
          disabled={Object.keys(invalidInputs).length > 0}
        >
          Tính kết quả cuối cùng
        </button>
      </div>
      
      {Object.keys(invalidInputs).length > 0 && (
        <div className="validation-summary">
          <p className="validation-error">Có {Object.keys(invalidInputs).length} giá trị không hợp lệ. Vui lòng sửa trước khi tiếp tục.</p>
        </div>
      )}
    </div>
  );
};

export default AlternativeComparison;
