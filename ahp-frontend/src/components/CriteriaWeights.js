import React, { useState, useEffect } from 'react';
import './CriteriaWeights.css';
import ApiService from '../api';

const CriteriaWeights = ({ criteriaData, onNextStep, onNavigateBack }) => {
  const [step, setStep] = useState(1);
  const [fetchedCriteria, setFetchedCriteria] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch criteria from the database when component mounts
  useEffect(() => {
    const fetchCriteriaFromDB = async () => {
      try {
        setIsLoading(true);
        const result = await ApiService.getCriteria();
        if (result && result.length > 0) {
          setFetchedCriteria(result);
        }
      } catch (err) {
        console.error('Error fetching criteria:', err);
        setError('Failed to load criteria from the database.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCriteriaFromDB();
  }, []);
  
  // Extract the data with safe defaults to ensure we always have a structure to render
  const weights = criteriaData?.weights || [];
  const column_sums = criteriaData?.column_sums || [];
  const normalized_matrix = criteriaData?.normalized_matrix || [];
  const original_matrix = criteriaData?.original_matrix || [];
  
  // Use criteria names from criteriaData if available, otherwise use fetched criteria names
  const criteriaNames = criteriaData?.criteria_names || fetchedCriteria.map(c => c.name) || [];
  
  const consistency_check = criteriaData?.consistency_check || {
    lambda_max: 0,
    ci: 0,
    ri: 0,
    cr: 0,
    is_consistent: false
  };
  
  // Create placeholder matrices if we don't have real data yet
  const placeholderMatrixSize = Math.max(criteriaNames.length, 1);
  const placeholderMatrix = Array(placeholderMatrixSize).fill().map(() => Array(placeholderMatrixSize).fill('—'));
  const placeholderSums = Array(placeholderMatrixSize).fill('—');
  
  const handleNextStep = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Check if the matrix is consistent before proceeding
      if (!consistency_check.is_consistent) {
        alert('Ma trận không nhất quán (CR >= 0.1). Vui lòng quay lại bước nhập ma trận và điều chỉnh các giá trị so sánh cặp.');
        return;
      }
      onNextStep(criteriaData);
    }
  };
  
  const handlePreviousStep = () => {
    setStep(Math.max(1, step - 1));
  };
  
  const renderStep = () => {
    switch(step) {
      case 1:
        return renderOriginalMatrix();
      case 2:
        return renderNormalizedMatrix();
      case 3:
        return renderWeights();
      case 4:
        return renderConsistencyCheck();
      default:
        return null;
    }
  };
  
  const renderOriginalMatrix = () => {
    const matrixToRender = original_matrix.length ? original_matrix : placeholderMatrix;
    const sumsToRender = column_sums.length ? column_sums : placeholderSums;
    
    return (
      <div className="matrix-step">
        <h3>Bước 1: Ma trận so sánh cặp với tổng cột</h3>
        <div className="matrix-table-container">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Tiêu chí</th>
                {criteriaNames.length > 0 ? (
                  criteriaNames.map((name, idx) => <th key={idx}>{name}</th>)
                ) : (
                  <th>Tiêu chí 1</th>
                )}
              </tr>
            </thead>
            <tbody>
              {matrixToRender.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <td className="criteria-name">
                    {criteriaNames.length > rowIdx ? criteriaNames[rowIdx] : `Tiêu chí ${rowIdx + 1}`}
                  </td>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx}>
                      {typeof cell === 'number' ? (Math.round(cell * 100) / 100).toFixed(2) : cell}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="sum-row">
                <td><strong>Tổng</strong></td>
                {sumsToRender.map((sum, idx) => (
                  <td key={idx}>
                    <strong>{typeof sum === 'number' ? (Math.round(sum * 100) / 100).toFixed(2) : sum}</strong>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="step-description">
          Ma trận thể hiện tầm quan trọng tương đối của mỗi tiêu chí so với các tiêu chí khác.
          Giá trị 1 có nghĩa là bằng nhau về tầm quan trọng, trong khi 9 có nghĩa là tiêu chí hàng quan trọng hơn rất nhiều so với tiêu chí cột.
        </p>
      </div>
    );
  };
  
  const renderNormalizedMatrix = () => {
    const matrixToRender = normalized_matrix.length ? normalized_matrix : placeholderMatrix;
    
    return (
      <div className="matrix-step">
        <h3>Bước 2: Ma trận chuẩn hóa</h3>
        <div className="matrix-table-container">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Tiêu chí</th>
                {criteriaNames.length > 0 ? (
                  criteriaNames.map((name, idx) => <th key={idx}>{name}</th>)
                ) : (
                  <th>Tiêu chí 1</th>
                )}
              </tr>
            </thead>
            <tbody>
              {matrixToRender.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <td className="criteria-name">
                    {criteriaNames.length > rowIdx ? criteriaNames[rowIdx] : `Tiêu chí ${rowIdx + 1}`}
                  </td>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx}>
                      {typeof cell === 'number' ? (Math.round(cell * 100) / 100).toFixed(2) : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="step-description">
          Mỗi ô được chuẩn hóa bằng cách chia giá trị gốc cho tổng cột tương ứng.
          Công thức: Giá trị chuẩn hóa = Giá trị gốc / Tổng cột
        </p>
      </div>
    );
  };
  
  const renderWeights = () => {
    const weightsToRender = weights.length ? weights : Array(placeholderMatrixSize).fill('—');
    
    return (
      <div className="matrix-step">
        <h3>Bước 3: Tính toán trọng số tiêu chí</h3>
        <div className="weights-table-container">
          <table className="weights-table">
            <thead>
              <tr>
                <th>Tiêu chí</th>
                <th>Trọng số</th>
              </tr>
            </thead>
            <tbody>
              {weightsToRender.map((weight, idx) => (
                <tr key={idx}>
                  <td>
                    {criteriaNames.length > idx ? criteriaNames[idx] : `Tiêu chí ${idx + 1}`}
                  </td>
                  <td>
                    {typeof weight === 'number' ? (Math.round(weight * 100) / 100).toFixed(2) : weight}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="step-description">
          Trọng số của mỗi tiêu chí được tính bằng trung bình các giá trị hàng tương ứng trong ma trận chuẩn hóa.
          Các trọng số này thể hiện tầm quan trọng tương đối của từng tiêu chí trong quá trình ra quyết định.
        </p>
      </div>
    );
  };
  
  const renderConsistencyCheck = () => {
    const { lambda_max, consistency_vector, ci, ri, cr: consistency_ratio, is_consistent } = consistency_check;
    
    return (
      <div className="matrix-step">
      <h3>Bước 4: Kiểm tra tính nhất quán</h3>
      <div className="consistency-calculation">
        <h4>Tính CR (Consistency Rate)</h4>
        <p className="calculation-explanation">
        Mỗi phần tử trong ma trận gốc được nhân với trọng số của tiêu chí tương ứng theo cột.
        </p>
        
        <div className="matrix-table-container">
        <table className="matrix-table">
          <thead>
          <tr>
            <th>Tiêu chí</th>
            {criteriaNames.map((name, idx) => (
            <th key={idx}>{name} (w={(weights[idx] ? (Math.round(weights[idx] * 100) / 100).toFixed(2) : '—')})</th>
            ))}
          </tr>
          </thead>
          <tbody>
          {original_matrix.length > 0 && weights.length > 0 ? (
            original_matrix.map((row, rowIdx) => (
            <tr key={rowIdx}>
              <td className="criteria-name">
              {criteriaNames.length > rowIdx ? criteriaNames[rowIdx] : `Tiêu chí ${rowIdx + 1}`}
              </td>
              {row.map((cell, cellIdx) => (
              <td key={cellIdx} className="numeric-cell">
                {typeof cell === 'number' && typeof weights[cellIdx] === 'number' 
                ? (Math.round(cell * weights[cellIdx] * 100) / 100).toFixed(2) 
                : '—'}
              </td>
              ))}
            </tr>
            ))
          ) : (
            <tr><td colSpan={criteriaNames.length + 1} className="no-data">Không có dữ liệu</td></tr>
          )}
          </tbody>
        </table>
        </div>
      </div>
      {consistency_vector && consistency_vector.length > 0 && (
        <div className="consistency-calculation">
        <h4>Tính toán Vector nhất quán</h4>
        <p className="calculation-explanation">
          Chia tổng trọng số cho trọng số tiêu chí tương ứng để tính vector nhất quán
        </p>
        
        <div className="consistency-vector-container">
          <table className="consistency-vector-table">
          <thead>
            <tr>
            <th>Tiêu chí</th>
            <th className="numeric-header">Trọng số (W)</th>
            <th className="numeric-header">Tổng trọng số (AW)</th>
            <th className="numeric-header">Vector nhất quán (AW/W)</th>
            </tr>
          </thead>
          <tbody>
            {criteriaNames.map((name, idx) => (
            <tr key={idx}>
              <td>{name}</td>
              <td className="numeric-cell">{weights[idx] ? (Math.round(weights[idx] * 100) / 100).toFixed(2) : '—'}</td>
              <td className="numeric-cell">
              {weights[idx] && original_matrix && original_matrix.length > 0 
                ? (() => {
                  // Calculate AW (the weighted sum)
                  let weightedSum = 0;
                  for (let col = 0; col < original_matrix[idx].length; col++) {
                  weightedSum += original_matrix[idx][col] * weights[col];
                  }
                  return (Math.round(weightedSum * 100) / 100).toFixed(2);
                })()
                : '—'}
              </td>
              <td className="numeric-cell">{consistency_vector[idx] ? (Math.round(consistency_vector[idx] * 100) / 100).toFixed(2) : '—'}</td>
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
      )}
      
      <div className="consistency-container">
        <div className="consistency-info">
        <p>
          <strong>Giá trị (λ<sub>max</sub>):</strong> 
          <span className="numeric-value">{typeof lambda_max === 'number' ? (Math.round(lambda_max * 100) / 100).toFixed(2) : '—'}</span>
        </p>
        <p>
          <strong>Chỉ số nhất quán (CI):</strong> 
          <span className="numeric-value">{typeof ci === 'number' ? (Math.round(ci * 100) / 100).toFixed(2) : '—'}</span>
          {typeof ci === 'number' && typeof lambda_max === 'number' && criteriaNames.length > 0 && (
          <span className="formula-explanation">
            = (λ<sub>max</sub> - n) / (n - 1) = ({(Math.round(lambda_max * 100) / 100).toFixed(2)} - {criteriaNames.length}) / ({criteriaNames.length} - 1)
          </span>
          )}
        </p>
        <p>
          <strong>Chỉ số ngẫu nhiên (RI):</strong> 
          <span className="numeric-value">{typeof ri === 'number' ? (Math.round(ri * 100) / 100).toFixed(2) : '—'}</span>
          <span className="formula-explanation">
          (Từ bảng RI dựa trên kích thước ma trận n = {criteriaNames.length})
          </span>
        </p>
        <p>
          <strong>Tỉ lệ nhất quán (CR):</strong> 
          <span className="numeric-value">{typeof consistency_ratio === 'number' ? (Math.round(consistency_ratio * 100) / 100).toFixed(2) : '—'}</span>
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
          <span className="warning-message"> - Cần điều chỉnh lại ma trận so sánh để giảm CR xuống dưới 0.1</span>
          )}
        </p>
        
        {!is_consistent && (
          <div className="inconsistency-message">
            <p>Ma trận hiện tại không nhất quán. Bạn cần quay lại bước nhập ma trận và điều chỉnh lại các giá trị so sánh cặp.</p>
            <button 
              className="fix-matrix-button"
              onClick={onNavigateBack}
            >
              Quay lại điều chỉnh ma trận
            </button>
          </div>
        )}
        </div>
        <div className="criteria-ranking">
        <h4>Xếp hạng tiêu chí theo trọng số:</h4>
        <div className="ranking-table-container">
          <table className="ranking-table">
          <thead>
            <tr>
            <th className="rank-column">Hạng</th>
            <th>Tiêu chí</th>
            <th className="numeric-header">Trọng số</th>
            </tr>
          </thead>
          <tbody>
            {weights.length > 0 && criteriaNames.length > 0 ? (
            [...Array(weights.length).keys()]
              .map(index => ({ 
              name: criteriaNames[index], 
              weight: weights[index] 
              }))
              .sort((a, b) => b.weight - a.weight)
              .map((criteria, index) => (
              <tr key={index}>
                <td className="rank-column">{index + 1}</td>
                <td>{criteria.name}</td>
                <td className="numeric-cell">{typeof criteria.weight === 'number' ? (Math.round(criteria.weight * 100) / 100).toFixed(2) : '—'}</td>
              </tr>
              ))
            ) : (
            <tr>
              <td colSpan={3} className="no-data">Không có dữ liệu để xếp hạng</td>
            </tr>
            )}
          </tbody>
          </table>
        </div>
        <p className="ranking-explanation">
          Các tiêu chí được xếp hạng dựa trên trọng số tính toán được. 
          Tiêu chí có trọng số cao hơn đóng vai trò quan trọng hơn trong quá trình ra quyết định.
        </p>
        </div>

        <div className="consistency-explanation">
        <h4>Giải thích về tính nhất quán:</h4>
        <p>Quá trình tính toán tính nhất quán bao gồm các bước:</p>
        <ol>
          <li>Nhân ma trận so sánh với vector trọng số: A × W</li>
          <li>Chia kết quả cho trọng số tương ứng để có vector nhất quán</li>
          <li>Tính λ<sub>max</sub> là trung bình của vector nhất quán</li>
          <li>Tính CI = (λ<sub>max</sub> - n) / (n - 1) với n là số tiêu chí</li>
          <li>Tính CR = CI / RI, với RI là chỉ số ngẫu nhiên từ bảng tham chiếu</li>
        </ol>
        
        <div className="ri-table">
          <h5>Bảng chỉ số ngẫu nhiên (RI)</h5>
          <table className="reference-table">
          <thead>
            <tr>
            <th>n</th>
            {[...Array(10).keys()].map(i => (
              <th key={i} className="numeric-header">{i+1}</th>
            ))}
            </tr>
          </thead>
          <tbody>
            <tr>
            <td><strong>RI</strong></td>
            <td className="numeric-cell">0.00</td>
            <td className="numeric-cell">0.00</td>
            <td className="numeric-cell">0.58</td>
            <td className="numeric-cell">0.90</td>
            <td className="numeric-cell">1.12</td>
            <td className="numeric-cell">1.24</td>
            <td className="numeric-cell">1.32</td>
            <td className="numeric-cell">1.41</td>
            <td className="numeric-cell">1.45</td>
            <td className="numeric-cell">1.49</td>
            </tr>
          </tbody>
          </table>
        </div>
        
        <p>Tỉ lệ nhất quán (CR) đo lường mức độ nhất quán của các so sánh cặp.</p>
        <p>Nếu CR &lt; 0.1, các so sánh được coi là nhất quán và chấp nhận được.</p>
        <p>Nếu CR &gt;= 0.1, các so sánh cần được xem xét lại và có thể điều chỉnh.</p>
        </div>
      </div>
      </div>
    );
  };
  
  return (
    <div className="criteria-weights-container">
      <h2>Quy trình tính toán AHP cho các tiêu chí</h2>
      
      {isLoading && <div className="loading-indicator">Đang tải dữ liệu tiêu chí...</div>}
      {error && <div className="error-message">{error}</div>}
      
      {renderStep()}
      
      <div className="step-navigation">
        <button 
          onClick={handlePreviousStep}
          disabled={step === 1}
          className="prev-step-button"
        >
          Bước trước
        </button>
        
        <button
          onClick={onNavigateBack}
          className="back-button"
        >
          Quay lại bảng ma trận
        </button>
        
        <div className="step-indicator">
          Bước {step} / 4
        </div>
        
        <button 
          onClick={handleNextStep}
          className={step === 4 ? "next-stage-button" : ""}
          disabled={step === 4 && !consistency_check.is_consistent}
          title={step === 4 && !consistency_check.is_consistent ? 
            "Ma trận không nhất quán (CR >= 0.1). Vui lòng quay lại bảng ma trận để điều chỉnh." : ""}
        >
          {step === 4 ? 
            (consistency_check.is_consistent ? 
              "Tiếp tục đến so sánh địa điểm" : 
              "Cần điều chỉnh ma trận") : 
            "Bước tiếp theo"}
        </button>
      </div>
    </div>
  );
};

export default CriteriaWeights;
