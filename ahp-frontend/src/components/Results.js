import React, { useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';
import AHPReport from './AHPReport';
import './Results.css';

/**
 * Component to display ranking results with table and chart
 * @param {Object} props - Component props
 * @param {Array} props.data - Results data array
 * @param {Function} props.onNavigateBack - Function to handle back navigation
 * @param {Object} props.criteriaData - Criteria calculation data
 */
const Results = ({ data, onNavigateBack, criteriaData }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showReport, setShowReport] = useState(false);
  
  // Don't render anything if no data is available
  if (!data || data.length === 0) {
    return null;
  }

  // Extract data for the chart
  const alternatives = data.map(result => result.alternative);
  const scores = data.map(result => result.weight);

  // Prepare chart configuration
  const chartData = {
    labels: alternatives,
    datasets: [
      {
        label: 'Trọng số địa điểm',
        data: scores,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: (context) => `Trọng số: ${(Math.round(context.raw * 100) / 100).toFixed(2)}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  // Prepare pie chart configuration
  const pieChartData = {
    labels: alternatives,
    datasets: [
      {
        data: scores,
        backgroundColor: [
          'rgba(75, 192, 192, 0.7)',  // Teal
          'rgba(255, 159, 64, 0.7)',  // Orange
          'rgba(153, 102, 255, 0.7)', // Purple
          'rgba(255, 99, 132, 0.7)',  // Pink
          'rgba(54, 162, 235, 0.7)',  // Blue
          'rgba(255, 206, 86, 0.7)'   // Yellow
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const percentage = (Math.round(value * 10000) / 100).toFixed(2);
            return `${label}: ${percentage}%`;
          }
        }
      },
      title: {
        display: true,
        text: 'Phân bố trọng số địa điểm',
        font: {
          size: 16
        }
      }
    }
  };

  // Check if we have local weights and consistency data
  const hasDetailedData = data[0]?.local_weights && data[0]?.consistency_checks;

  // Handle show/hide report
  const toggleReport = () => {
    setShowReport(!showReport);
  };

  return (
    <div className="results-container">
      {showReport ? (
        <>
          <button 
            className="back-to-results-button"
            onClick={toggleReport}
          >
            Quay lại kết quả
          </button>
          <AHPReport 
            data={data} 
            criteriaData={criteriaData} 
            consistencyData={data[0]?.consistency_checks}
          />
        </>
      ) : (
        <>
          <div className="results-header">
            <h3 className="results-title">Kết quả xếp hạng địa điểm:</h3>
            <button 
              className="view-report-button"
              onClick={toggleReport}
            >
              Xem báo cáo đầy đủ
            </button>
          </div>
          
          <div className="results-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Thứ hạng</th>
                  <th>Địa điểm</th>
                  <th>Trọng số</th>
                  <th>Phần trăm</th>
                </tr>
              </thead>
              <tbody>
                {data.map((result, index) => (
                  <tr key={index} className={index === 0 ? 'top-rank' : ''}>
                    <td>{index + 1}</td>
                    <td>{result.alternative}</td>
                    <td>{(Math.round(result.weight * 100) / 100).toFixed(2)}</td>
                    <td>{(Math.round(result.weight * 10000) / 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="charts-section">
            <div className="chart-column">
              <h3 className="chart-title">Biểu đồ trọng số địa điểm</h3>
              <div className="chart-container">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>
            
            <div className="chart-column">
              <h3 className="chart-title">Phân bố tỷ trọng địa điểm</h3>
              <div className="chart-container pie-container">
                <Pie data={pieChartData} options={pieChartOptions} />
              </div>
            </div>
          </div>
          
          {hasDetailedData && (
            <div className="ahp-details">
              <button 
                className="details-toggle-button"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Ẩn chi tiết AHP' : 'Hiển thị chi tiết AHP'}
              </button>
              
              {showDetails && (
                <div className="ahp-calculation-details">
                  <h4>Chi tiết tính toán theo phương pháp AHP</h4>
                  
                  <div className="criteria-weights-section">
                    <h5>Trọng số của từng tiêu chí theo địa điểm</h5>
                    {Object.keys(data[0].local_weights).map(criterion => (
                      <div key={criterion} className="criterion-detail">
                        <h6>{criterion}</h6>
                        <p>Tỉ lệ nhất quán (CR): {(Math.round(data[0].consistency_checks[criterion].cr * 100) / 100).toFixed(2)}</p>
                        <p>Đạt tiêu chuẩn nhất quán: 
                          <span className={data[0].consistency_checks[criterion].is_consistent ? 'consistent' : 'inconsistent'}>
                            {data[0].consistency_checks[criterion].is_consistent ? ' Có' : ' Không'}
                          </span>
                        </p>
                        
                        <table className="local-weights-table">
                          <thead>
                            <tr>
                              <th>Địa điểm</th>
                              <th>Trọng số cục bộ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.map((result, idx) => (
                              <tr key={idx}>
                                <td>{result.alternative}</td>
                                <td>{(Math.round(result.local_weights[criterion] * 100) / 100).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                  
                  <div className="methodology-notes">
                    <h5>Ghi chú về phương pháp AHP</h5>
                    <p>Phương pháp AHP (Analytic Hierarchy Process) được sử dụng để phân tích quyết định đa tiêu chí.</p>
                    <p>Các bước chính:</p>
                    <ol>
                      <li>So sánh cặp các tiêu chí để xác định trọng số</li>
                      <li>So sánh cặp các phương án theo từng tiêu chí</li>
                      <li>Tính tỉ lệ nhất quán (CR) để đảm bảo kết quả đáng tin cậy (CR &lt; 0.1)</li>
                      <li>Tổng hợp kết quả để xác định phương án tối ưu</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="navigation-buttons">
            <button
              className="back-button"
              onClick={onNavigateBack}
            >
              Quay lại so sánh địa điểm
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Results;
