import React, { useState, useEffect } from 'react';
import './DecisionSetup.css';
import ApiService from '../api';

const DEFAULT_ALTERNATIVES = [
  'Hội An', 
  'Đà Lạt', 
  'Hạ Long', 
  'Nha Trang', 
  'Phú Quốc'
];

const DecisionSetup = ({ onSubmit }) => {
  const [title, setTitle] = useState('Lựa chọn địa điểm du lịch');
  const [description, setDescription] = useState('Phân tích AHP để lựa chọn địa điểm du lịch tốt nhất dựa trên nhiều tiêu chí');
  const [criteria, setCriteria] = useState([]);
  const [alternatives, setAlternatives] = useState([]);
  const [newAlternative, setNewAlternative] = useState('');
  const [availableAlternatives, setAvailableAlternatives] = useState([]);
  const [selectedAlternative, setSelectedAlternative] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch criteria and alternatives from the database on component mount
  useEffect(() => {
    fetchCriteriaAndAlternatives();
  }, []);

  const fetchCriteriaAndAlternatives = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch criteria from the database
      const criteriaResponse = await ApiService.getCriteria();
      if (criteriaResponse && criteriaResponse.length > 0) {
        setCriteria(criteriaResponse.map(c => c.name));
      }
      
      // Fetch available alternatives from the database
      const alternativesResponse = await ApiService.getAlternatives();
      if (alternativesResponse && alternativesResponse.length > 0) {
        setAvailableAlternatives(alternativesResponse);
      } else {
        // If no alternatives are available, use defaults
        setAlternatives(DEFAULT_ALTERNATIVES);
      }
    } catch (err) {
      console.error('Error fetching criteria and alternatives:', err);
      setError('Không thể tải tiêu chí và địa điểm từ cơ sở dữ liệu.');
      // Set default alternatives if fetch fails
      setAlternatives(DEFAULT_ALTERNATIVES);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAlternative = () => {
    if (!newAlternative.trim()) return;
    setAlternatives([...alternatives, newAlternative.trim()]);
    setNewAlternative('');
  };

  const handleRemoveAlternative = (index) => {
    setAlternatives(alternatives.filter((_, i) => i !== index));
  };

  const handleSelectAlternative = () => {
    if (!selectedAlternative) return;
    
    // Ensure we don't add duplicates
    if (!alternatives.includes(selectedAlternative)) {
      setAlternatives([...alternatives, selectedAlternative]);
    }
    
    setSelectedAlternative('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (criteria.length < 2) {
      alert('Bạn cần ít nhất 2 tiêu chí');
      return;
    }
    if (alternatives.length < 2) {
      alert('Bạn cần ít nhất 2 địa điểm');
      return;
    }

    onSubmit({
      title,
      description,
      criteria,
      alternatives
    });
  };

  if (isLoading) {
    return <div className="loading-message">Đang tải tiêu chí và địa điểm...</div>;
  }

  return (
    <div className="decision-setup">
      <h2>Thiết lập</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Tiêu đề:</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Mô tả:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        
        <div className="criteria-section">
          <h3>Tiêu chí quyết định</h3>
          <p className="info-text">Các tiêu chí sau sẽ được sử dụng cho quyết định của bạn:</p>
          <div className="criteria-list read-only">
            {criteria.length > 0 ? (
              criteria.map((criterion, index) => (
                <div key={index} className="criterion-item read-only">
                  <span>{criterion}</span>
                </div>
              ))
            ) : (
              <p className="no-data-message">Không có tiêu chí nào trong cơ sở dữ liệu.</p>
            )}
          </div>
        </div>
        
        <div className="alternatives-section">
          <h3>Các địa điểm</h3>
          <div className="alternatives-list">
            {alternatives.map((alternative, index) => (
              <div key={index} className="alternative-item">
                <span>{alternative}</span>
                <button 
                  type="button" 
                  className="remove-button"
                  onClick={() => handleRemoveAlternative(index)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          
          {availableAlternatives.length > 0 && (
            <div className="select-alternative">
              <label>Chọn từ các địa điểm có sẵn:</label>
              <div className="select-alternative-controls">
                <select
                  value={selectedAlternative}
                  onChange={(e) => setSelectedAlternative(e.target.value)}
                >
                  <option value="">-- Chọn một địa điểm --</option>
                  {availableAlternatives.map((alternative, index) => (
                    <option key={index} value={alternative.name}>
                      {alternative.name}
                    </option>
                  ))}
                </select>
                <button 
                  type="button" 
                  onClick={handleSelectAlternative}
                  className="add-button"
                  disabled={!selectedAlternative}
                >
                  Thêm
                </button>
              </div>
            </div>
          )}
          
          <div className="add-item">
            <input
              type="text"
              value={newAlternative}
              onChange={(e) => setNewAlternative(e.target.value)}
              placeholder="Địa điểm mới"
            />
            <button 
              type="button" 
              onClick={handleAddAlternative}
              className="add-button"
            >
              Thêm địa điểm mới
            </button>
          </div>
        </div>
        
        <button type="submit" className="submit-button">
          Tiếp tục tới So sánh tiêu chí
        </button>
      </form>
    </div>
  );
};

export default DecisionSetup;
