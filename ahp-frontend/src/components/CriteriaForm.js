import React, { useState, useEffect } from 'react';
import './CriteriaForm.css';

const DEFAULT_CRITERIA = [
  'Chi phí/ngày', 
  'Độ an toàn', 
  'Trải nghiệm văn hóa', 
  'Đánh giá KH', 
  'Khoảng cách', 
  'Phương Tiện'
];

const DEFAULT_MATRIX = [
  [1, 2, 0.3333, 1, 0.5, 2],
  [0.5, 1, 0.25, 1, 0.33, 1],
  [3, 4, 1, 5, 2, 3],
  [1, 1, 0.2, 1, 0.5, 2],
  [2, 3, 0.5, 2, 1, 3],
  [0.5, 1, 0.33, 0.5, 0.33, 1]
];

const CriteriaForm = ({ onSubmit, onNavigateBack, onDataChange, criteriaNames: propCriteriaNames }) => {
  const [criteriaNames] = useState(propCriteriaNames?.length > 0 ? propCriteriaNames : DEFAULT_CRITERIA);
  const [matrix, setMatrix] = useState(DEFAULT_MATRIX);
  const [originalMatrix, setOriginalMatrix] = useState(DEFAULT_MATRIX);
  const [hasChanges, setHasChanges] = useState(false);
  const [invalidInputs, setInvalidInputs] = useState({}); // Track invalid inputs

  // Track changes in the matrix
  useEffect(() => {
    // Check if matrix has changed from original
    const matrixChanged = JSON.stringify(matrix) !== JSON.stringify(originalMatrix);
    setHasChanges(matrixChanged);
    
    // Notify parent component about changes
    if (onDataChange) {
      onDataChange(matrixChanged);
    }
  }, [matrix, originalMatrix, onDataChange]);

  /**
   * Update matrix value when input changes
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @param {string} value - New value
   */
  const handleInputChange = (row, col, value) => {
    // Clear the invalid state for this cell
    const newInvalidInputs = { ...invalidInputs };
    delete newInvalidInputs[`${row}-${col}`];
    
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
          updateMatrixValue(row, col, roundedValue);
        } else {
          // Mark input as invalid with a specific message
          newInvalidInputs[`${row}-${col}`] = `Giá trị ${value} (${(fractionValue).toFixed(2)}) nằm ngoài phạm vi cho phép (1/9 đến 9)`;
          setInvalidInputs(newInvalidInputs);
          
          // Update the matrix with the original value but mark it as invalid
          const newMatrix = [...matrix];
          newMatrix[row][col] = value;
          setMatrix(newMatrix);
        }
      } else {
        // Invalid fraction format
        newInvalidInputs[`${row}-${col}`] = 'Định dạng phân số không hợp lệ (ví dụ: 1/3)';
        setInvalidInputs(newInvalidInputs);
        
        // Update the matrix with the invalid value to keep it in the input field
        const newMatrix = [...matrix];
        newMatrix[row][col] = value;
        setMatrix(newMatrix);
      }
    } else {
      const parsedValue = parseFloat(value);
      if (!isNaN(parsedValue)) {
        // Validate if the value is within the valid AHP range (1/9 to 9)
        if (parsedValue >= 1/9 && parsedValue <= 9) {
          // Round the input value to 2 decimal places
          const roundedValue = Math.round(parsedValue * 100) / 100;
          updateMatrixValue(row, col, roundedValue);
        } else {
          // Mark input as invalid with a specific message
          newInvalidInputs[`${row}-${col}`] = `Giá trị ${parsedValue} nằm ngoài phạm vi cho phép (1/9 đến 9)`;
          setInvalidInputs(newInvalidInputs);
          
          // Update the matrix with the invalid value to keep it in the input field
          const newMatrix = [...matrix];
          newMatrix[row][col] = value;
          setMatrix(newMatrix);
        }
      } else if (value !== '') {
        // Non-numeric input that isn't empty
        newInvalidInputs[`${row}-${col}`] = 'Vui lòng nhập số hoặc phân số (ví dụ: 3 hoặc 1/3)';
        setInvalidInputs(newInvalidInputs);
        
        // Update the matrix with the invalid value to keep it in the input field
        const newMatrix = [...matrix];
        newMatrix[row][col] = value;
        setMatrix(newMatrix);
      }
    }
    
    setInvalidInputs(newInvalidInputs);
  };
  
  /**
   * Update the matrix with the validated value
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @param {number} value - Validated numeric value
   */
  const updateMatrixValue = (row, col, value) => {
    const newMatrix = [...matrix];
    newMatrix[row][col] = value;
    
    // Update reciprocal value with rounding to 2 decimal places
    if (row !== col) {
      newMatrix[col][row] = Math.round((1 / value) * 100) / 100;
    }
    
    setMatrix(newMatrix);
  };

  /**
   * Validate matrix and submit form
   */
  const handleSubmit = () => {
    // Check if there are any invalid inputs
    if (Object.keys(invalidInputs).length > 0) {
      alert('Vui lòng sửa các giá trị không hợp lệ trước khi tiếp tục.');
      return;
    }
    
    if (hasChanges) {
      const confirmSubmit = window.confirm(
        "Your changes will overwrite previous calculations. Continue?"
      );
      if (!confirmSubmit) return;
    }
    
    // Sanitize matrix values (remove NaN values)
    const sanitizedMatrix = matrix.map(row => 
      row.map(value => (isNaN(value) ? 0 : value))
    );
    
    const formData = {
      criteria_names: criteriaNames,
      matrix: sanitizedMatrix
    };
    
    // Update original matrix to match current state
    setOriginalMatrix(JSON.parse(JSON.stringify(matrix)));
    setHasChanges(false);
    
    onSubmit(formData);
  };

  return (
    <div className="criteria-form">
      <h2>Nhập ma trận so sánh cặp tiêu chí</h2>
      
      <div className="input-instructions">
        <h3>Hướng dẫn nhập giá trị</h3>
        <p>Nhập các giá trị trong khoảng từ 1/9 đến 9:</p>
        <ul>
          <li>Nhập số thập phân (1, 2, 3, ...) hoặc phân số (1/2, 1/3, ...)</li>
          <li>1: Hai tiêu chí có tầm quan trọng ngang nhau</li>
          <li>9: Tiêu chí hàng quan trọng hơn rất nhiều so với tiêu chí cột</li>
          <li>1/9: Tiêu chí hàng kém quan trọng hơn rất nhiều so với tiêu chí cột</li>
        </ul>
      </div>

      <div className="matrix-table-container">
        <table className="matrix-table">
          <thead>
            <tr>
              <th>Tiêu chí</th>
              {criteriaNames.map((name, index) => (
                <th key={index}>{name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteriaNames.map((rowName, rowIndex) => (
              <tr key={rowIndex}>
                <td className="criteria-name">{rowName}</td>
                {criteriaNames.map((_, colIndex) => (
                  <td key={colIndex}>
                    <input
                      type="text"
                      value={matrix[rowIndex][colIndex]}
                      onChange={(e) => handleInputChange(rowIndex, colIndex, e.target.value)}
                      className={`
                        ${rowIndex === colIndex ? 'diagonal-cell' : rowIndex > colIndex ? 'below-diagonal-cell' : ''}
                        ${invalidInputs[`${rowIndex}-${colIndex}`] ? 'invalid' : ''}
                      `}
                      disabled={rowIndex === colIndex || rowIndex > colIndex}
                      title={invalidInputs[`${rowIndex}-${colIndex}`] || ''}
                    />
                    {invalidInputs[`${rowIndex}-${colIndex}`] && (
                      <div className="validation-message">
                        {invalidInputs[`${rowIndex}-${colIndex}`]}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {Object.keys(invalidInputs).length > 0 && (
        <div className="validation-summary">
          <p className="validation-error">Có {Object.keys(invalidInputs).length} giá trị không hợp lệ. Vui lòng sửa trước khi tiếp tục.</p>
        </div>
      )}
      
      <div className="criteria-form-buttons">
        <button 
          className="back-button" 
          onClick={onNavigateBack}
        >
          Quay lại
        </button>
        
        <button 
          className="calculate-button" 
          onClick={handleSubmit}
          disabled={Object.keys(invalidInputs).length > 0}
        >
          Tính toán trọng số
        </button>
      </div>
      
      {hasChanges && (
        <p className="changes-warning">
          Bạn có thay đổi chưa được lưu. Hãy nhấn "Tính toán trọng số" để cập nhật kết quả.
        </p>
      )}
    </div>
  );
};

export default CriteriaForm;
