import React, { useRef, useEffect, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './AHPReport.css';

/**
 * Component to render a comprehensive AHP report with export functionality
 * @param {Object} props - Component props
 * @param {Array} props.data - Results data array
 * @param {Object} props.criteriaData - Criteria calculation data
 * @param {Object} props.consistencyData - Consistency check data by criteria
 */
const AHPReport = ({ data, criteriaData, consistencyData }) => {
  const reportRef = useRef(null);
  const chartRefs = useRef({
    barChart: null,
    pieChart: null
  });
  
  // State for data management
  const [normalizedWeights, setNormalizedWeights] = useState([]);
  const [normalizedMatrix, setNormalizedMatrix] = useState([]);
  const [originalMatrix, setOriginalMatrix] = useState([]);
  const [criteriaNames, setCriteriaNames] = useState([]);
  const [criteriaWeights, setCriteriaWeights] = useState([]);
  const [isMatrixComplete, setIsMatrixComplete] = useState(false);
  
  // Sample data to use when real data is missing or incomplete
  const sampleCriteriaNames = ['Chi phí', 'Chất lượng', 'Thời gian'];
  const sampleMatrix = [
    [1, 3, 5],
    [1/3, 1, 3],
    [1/5, 1/3, 1]
  ];
  const sampleWeights = [0.63, 0.26, 0.11];

  // Initialize data from props or use sample data
  useEffect(() => {
    // First, check if criteriaData exists and has required properties
    const hasValidCriteriaData = criteriaData && 
                                criteriaData.criteria_names && 
                                criteriaData.criteria_names.length > 0 &&
                                criteriaData.original_matrix && 
                                criteriaData.original_matrix.length > 0;
    
    // Use real data from props if available, otherwise use sample data
    const displayCriteriaNames = hasValidCriteriaData ? criteriaData.criteria_names : sampleCriteriaNames;
    const displayMatrix = hasValidCriteriaData ? criteriaData.original_matrix : sampleMatrix;
    const displayWeights = (hasValidCriteriaData && criteriaData.weights && criteriaData.weights.length > 0) 
                          ? criteriaData.weights : sampleWeights;
    
    // Update state with the appropriate data
    setCriteriaNames(displayCriteriaNames);
    setOriginalMatrix(displayMatrix);
    setCriteriaWeights(displayWeights);
    
    // Check if matrix dimensions match criteria names
    const isComplete = displayMatrix.length === displayCriteriaNames.length &&
                       displayMatrix.every(row => row.length === displayCriteriaNames.length);
    setIsMatrixComplete(isComplete);
    
    // Calculate normalized matrix and weights
    calculateNormalizedMatrixAndWeights(displayMatrix);
  }, [criteriaData]);

  // Calculate normalized matrix and weights from original matrix
  const calculateNormalizedMatrixAndWeights = (matrix) => {
    if (!matrix || matrix.length === 0 || matrix[0].length === 0) {
      console.warn("Cannot calculate normalized matrix: Invalid or empty matrix");
      return;
    }
    
    try {
      // Validate matrix is square (equal rows and columns)
      const rowCount = matrix.length;
      const allRowsHaveSameLength = matrix.every(row => row.length === rowCount);
      
      if (!allRowsHaveSameLength) {
        console.warn("Matrix is not square, calculations may be inaccurate");
      }
      
      // Calculate column sums
      const colSums = Array(matrix[0].length).fill(0);
      for (let col = 0; col < matrix[0].length; col++) {
        for (let row = 0; row < matrix.length; row++) {
          // Fix: Handle non-numeric values safely
          const cellValue = matrix[row][col];
          if (typeof cellValue === 'number' && !isNaN(cellValue)) {
            colSums[col] += cellValue;
          } else {
            console.warn(`Non-numeric value found at position [${row}][${col}], using 0`);
          }
        }
        // Ensure no division by zero
        if (colSums[col] === 0) colSums[col] = 1;
      }
      
      // Calculate normalized matrix with safer approach
      const normalizedMat = matrix.map(row => 
        row.map((cell, colIdx) => {
          // Fix: Handle non-numeric values and division by zero
          if (typeof cell === 'number' && !isNaN(cell) && colSums[colIdx] !== 0) {
            return cell / colSums[colIdx];
          }
          return 0; // Default for non-numeric or division by zero
        })
      );
      setNormalizedMatrix(normalizedMat);
      
      // Calculate row averages (weights)
      const weights = normalizedMat.map(row => {
        // Fix: Filter out invalid values before calculating average
        const validValues = row.filter(val => typeof val === 'number' && !isNaN(val));
        if (validValues.length === 0) return 0;
        return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
      });
      setNormalizedWeights(weights);
      
      // Fix: Check if matrix dimensions match criteria names
      setIsMatrixComplete(matrix.length === criteriaNames.length && 
                       matrix.every(row => row.length === criteriaNames.length));
    
    } catch (error) {
      console.error("Error calculating normalized matrix and weights:", error);
      // Set fallback values
      setNormalizedMatrix([]);
      setNormalizedWeights([]);
      setIsMatrixComplete(false);
    }
  };

  // Early return should come after all hooks
  if (!data || data.length === 0) {
    return <div>Không có dữ liệu để hiển thị</div>;
  }

  // Extract data for the report
  const alternatives = data.map(result => result.alternative);
  const scores = data.map(result => result.weight);

  // Prepare chart configuration for bar chart
  const barChartData = {
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

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: 'Biểu đồ trọng số địa điểm',
        font: { size: 16 }
      },
      tooltip: {
        callbacks: {
          label: (context) => `Trọng số: ${(Math.round(context.raw * 100) / 100).toFixed(2)}`
        }
      }
    },
    scales: { y: { beginAtZero: true } }
  };

  // Prepare chart configuration for pie chart
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
        labels: { font: { size: 12 } }
      },
      title: {
        display: true,
        text: 'Phân bố trọng số địa điểm',
        font: { size: 16 }
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
      }
    }
  };

  /**
   * Export the AHP report to Excel
   */
  const exportToExcel = () => {
    try {
      // Create workbook and worksheets
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: Pairwise Comparison Matrix
      const matrixData = [
        ['Ma trận so sánh cặp'],
        [''],
        ['Tiêu chí', ...criteriaNames]
      ];
      
      // Fix: originalMatrix and criteriaNames are now defined as state variables
      originalMatrix.forEach((row, rowIdx) => {
        matrixData.push([
          criteriaNames[rowIdx], 
          ...row.map(cell => typeof cell === 'number' ? Number(cell.toFixed(2)) : cell)
        ]);
      });
      
      // Add explanation of values
      matrixData.push(
        [''],
        ['Ý nghĩa các giá trị:'],
        ['1: Hai tiêu chí có tầm quan trọng ngang nhau'],
        ['3: Tiêu chí A quan trọng hơn tiêu chí B một chút'],
        ['5: Tiêu chí A quan trọng hơn tiêu chí B đáng kể'],
        ['7: Tiêu chí A quan trọng hơn tiêu chí B rất nhiều'],
        ['9: Tiêu chí A quan trọng hơn tiêu chí B cực kỳ nhiều']
      );
      
      const matrixWS = XLSX.utils.aoa_to_sheet(matrixData);
      
      // Sheet 2: Weight Calculation
      const weightData = [
        ['Bảng trọng số tiêu chí'],
        [''],
        ['Tiêu chí', 'Trọng số ban đầu', 'Phần trăm (%)']
      ];
      
      // Fix: criteriaNames and criteriaWeights are now defined as state variables
      criteriaNames.forEach((name, idx) => {
        const weight = criteriaWeights[idx] || 0;
        weightData.push([
          name,
          Number(weight.toFixed(2)),
          Number((weight * 100).toFixed(2))
        ]);
      });
      
      const weightWS = XLSX.utils.aoa_to_sheet(weightData);
      
      // Sheet 3: Consistency Check
      const consistencyData = [
        ['Độ nhất quán'],
        [''],
        ['Tiêu chí', 'CR', 'Đánh giá']
      ];
      
      if (criteriaData?.consistency_check) {
        const { cr, is_consistent } = criteriaData.consistency_check;
        consistencyData.push([
          'Các tiêu chí', 
          Number(cr.toFixed(4)), 
          is_consistent ? 'Nhất quán (CR < 0.1)' : 'Không nhất quán (CR >= 0.1)'
        ]);
      }
      
      // Add consistency data for each criterion if available
      if (data[0]?.consistency_checks) {
        Object.entries(data[0].consistency_checks).forEach(([criterion, check]) => {
          consistencyData.push([
            criterion,
            Number(check.cr.toFixed(4)),
            check.is_consistent ? 'Nhất quán (CR < 0.1)' : 'Không nhất quán (CR >= 0.1)'
          ]);
        });
      }
      
      const consistencyWS = XLSX.utils.aoa_to_sheet(consistencyData);
      
      // Sheet 4: Final Results
      const resultsData = [
        ['Kết quả cuối cùng'],
        [''],
        ['Thứ hạng', 'Địa điểm', 'Trọng số', 'Phần trăm (%)']
      ];
      
      data.forEach((result, idx) => {
        resultsData.push([
          idx + 1,
          result.alternative,
          Number(result.weight.toFixed(2)),
          Number((result.weight * 100).toFixed(2))
        ]);
      });
      
      // Add local weights if available
      if (data[0]?.local_weights) {
        resultsData.push([''], ['Trọng số cục bộ theo từng tiêu chí'], ['']);
        
        // Header row with criteria names
        const headerRow = ['Địa điểm'];
        Object.keys(data[0].local_weights).forEach(criterion => {
          headerRow.push(criterion);
        });
        resultsData.push(headerRow);
        
        // Data rows with local weights
        data.forEach(result => {
          const row = [result.alternative];
          Object.values(result.local_weights).forEach(weight => {
            row.push(Number(weight.toFixed(2)));
          });
          resultsData.push(row);
        });
      }
      
      const resultsWS = XLSX.utils.aoa_to_sheet(resultsData);
      
      // Apply styles (limited styling options in XLSX)
      // Set column widths
      const setCellStyle = (worksheet, cell, style) => {
        if (!worksheet['!cols']) worksheet['!cols'] = [];
        if (!worksheet['!rows']) worksheet['!rows'] = [];
        
        // Example style: { font: { bold: true }, alignment: { horizontal: 'center' } }
        if (!worksheet[cell]) worksheet[cell] = {};
        worksheet[cell].s = style;
      };
      
      // Add title styling for each sheet
      setCellStyle(matrixWS, 'A1', { font: { bold: true, sz: 14 } });
      setCellStyle(weightWS, 'A1', { font: { bold: true, sz: 14 } });
      setCellStyle(consistencyWS, 'A1', { font: { bold: true, sz: 14 } });
      setCellStyle(resultsWS, 'A1', { font: { bold: true, sz: 14 } });
      
      // Add the sheets to workbook
      XLSX.utils.book_append_sheet(wb, matrixWS, "Ma trận so sánh cặp");
      XLSX.utils.book_append_sheet(wb, weightWS, "Trọng số");
      XLSX.utils.book_append_sheet(wb, consistencyWS, "Độ nhất quán");
      XLSX.utils.book_append_sheet(wb, resultsWS, "Kết quả cuối cùng");
      
      // Generate Excel file and save
      XLSX.writeFile(wb, "Báo_cáo_AHP.xlsx");
      
    } catch (error) {
      console.error("Lỗi khi xuất file Excel:", error);
      alert("Có lỗi xảy ra khi tạo file Excel. Vui lòng thử lại sau.");
    }
  };

  /**
   * Export the AHP report to PDF with Vietnamese font support and proper margins
   */
  const exportToPDF = async () => {
    if (!reportRef.current) return;
    
    try {
      const report = reportRef.current;
      
      // Create new PDF document with Vietnamese font support
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true,
        floatPrecision: 16 // For better text positioning precision
      });
      
      // Add Vietnamese font support using a hosted font
      // FIX: Use a font with Vietnamese character support
      try {
        // Load Noto Sans Vietnamese font for proper character support
        pdf.addFont('https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-vietnamese@4.5.0/files/noto-sans-vietnamese-vietnamese-400-normal.woff', 
                    'NotoSansVietnamese', 'normal');
        pdf.setFont('NotoSansVietnamese');
        
        // Fallback to standard font if Vietnamese font fails
      } catch (fontError) {
        console.warn("Failed to load Vietnamese font, falling back to standard font:", fontError);
        pdf.setFont("helvetica", "normal");
      }
      
      // PDF document properties
      pdf.setProperties({
        title: 'Báo cáo Kết quả AHP',
        subject: 'Phân tích quyết định đa tiêu chí',
        author: 'Hệ thống hỗ trợ quyết định',
        creator: 'AHP Tool'
      });
      
      // FIX: Define strict page dimensions and margins (in mm)
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 25; // 2.5cm margins on all sides
      const contentWidth = pageWidth - (2 * margin);
      const contentHeight = pageHeight - (2 * margin);
      
      // Set consistent font and line settings
      pdf.setFontSize(12);
      let yPos = margin; // Start at top margin
      const lineHeight = 7; // roughly 1.5 line spacing
      
      // Title
      pdf.setFontSize(18);
      pdf.setFont(pdf.getFont().fontName, 'bold');
      // FIX: Center title with explicit alignment and proper positioning
      pdf.text('BÁO CÁO KẾT QUẢ AHP', pageWidth / 2, yPos + 10, { align: 'center' });
      pdf.setFontSize(12);
      pdf.setFont(pdf.getFont().fontName, 'normal');
      yPos += 20; // Adjust position after title
    
      // Helper function to safely add a section title with validation and boundary checks
      const addSectionTitle = (title) => {
        if (typeof title !== 'string' || !title.trim()) {
          console.warn("Invalid section title, skipping...");
          return;
        }
        
        try {
          // FIX: Check if we need a new page
          if (yPos > pageHeight - (2 * margin)) {
            pdf.addPage();
            yPos = margin;
          }
          
          pdf.setFont(pdf.getFont().fontName, 'bold');
          pdf.setFontSize(14);
          pdf.text(title, margin, yPos);
          pdf.setFont(pdf.getFont().fontName, 'normal');
          pdf.setFontSize(12);
          yPos += lineHeight;
        } catch (err) {
          console.error(`Error adding section title "${title}":`, err);
        }
      };
      
      // Helper function to safely add text with proper validation, wrapping and boundary checks
      const addText = (text, indent = 0) => {
        if (typeof text !== 'string' || !text.trim()) {
          console.warn("Invalid text content, skipping...");
          return;
        }
        
        try {
          // Validate indent is a number
          const safeIndent = typeof indent === 'number' ? indent : 0;
          
          // FIX: Ensure text fits within margins by using splitTextToSize
          // Calculate available width considering indentation
          const availableWidth = contentWidth - safeIndent;
          const textLines = pdf.splitTextToSize(text, availableWidth);
          
          // Process each line
          textLines.forEach(line => {
            // FIX: Check if we need a new page before adding each line
            if (yPos > pageHeight - margin) {
              pdf.addPage();
              yPos = margin;
            }
            
            // Add text at the proper position with indentation
            pdf.text(line, margin + safeIndent, yPos);
            yPos += lineHeight;
          });
        } catch (err) {
          console.error(`Error adding text "${text.substring(0, 20)}...":`, err);
          // Try simpler approach as fallback
          try {
            pdf.text("[Text rendering error]", margin, yPos);
            yPos += lineHeight;
          } catch (fallbackErr) {
            console.error("Even fallback text rendering failed:", fallbackErr);
          }
        }
      };
      
      // FIX: Improve table drawing to ensure content fits within margins
      const drawTable = (headers, rows, columnWidths) => {
        try {
          // Calculate total table width to ensure it fits within margins
          const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
          const tableX = margin;
          const availableWidth = contentWidth;
          
          // Scale column widths if table is wider than available space
          let widthScale = 1;
          if (totalWidth > availableWidth) {
            widthScale = availableWidth / totalWidth;
            columnWidths = columnWidths.map(width => width * widthScale);
          }
          
          // Draw header row
          let currentX = tableX;
          pdf.setFont(pdf.getFont().fontName, 'bold');
          
          // FIX: Check if we need a new page before drawing the header
          if (yPos + 10 > pageHeight - margin) {
            pdf.addPage();
            yPos = margin;
          }
          
          headers.forEach((header, idx) => {
            // Draw cell background
            pdf.setFillColor(240, 240, 240);
            pdf.rect(currentX, yPos - 5, columnWidths[idx], 8, 'F');
            
            // Draw cell text with proper truncation if needed
            const headerText = String(header || '');
            const truncatedHeader = headerText.length > 15 ? 
              headerText.substring(0, 12) + '...' : headerText;
            
            pdf.text(truncatedHeader, currentX + 2, yPos);
            currentX += columnWidths[idx];
          });
          pdf.setFont(pdf.getFont().fontName, 'normal');
          yPos += 8;
          
          // Draw data rows
          rows.forEach(row => {
            // FIX: Check if we need a new page
            if (yPos + 10 > pageHeight - margin) {
              pdf.addPage();
              yPos = margin;
              
              // Redraw headers on new page
              currentX = tableX;
              pdf.setFont(pdf.getFont().fontName, 'bold');
              headers.forEach((header, idx) => {
                pdf.setFillColor(240, 240, 240);
                pdf.rect(currentX, yPos - 5, columnWidths[idx], 8, 'F');
                const headerText = String(header || '');
                const truncatedHeader = headerText.length > 15 ? 
                  headerText.substring(0, 12) + '...' : headerText;
                pdf.text(truncatedHeader, currentX + 2, yPos);
                currentX += columnWidths[idx];
              });
              yPos += 8;
              pdf.setFont(pdf.getFont().fontName, 'normal');
            }
            
            currentX = tableX;
            row.forEach((cell, idx) => {
              // Convert cell to string and handle long content
              const cellText = String(cell || '');
              const truncatedCell = cellText.length > 20 ? 
                cellText.substring(0, 17) + '...' : cellText;
              
              pdf.text(truncatedCell, currentX + 2, yPos);
              currentX += columnWidths[idx];
            });
            yPos += 8;
          });
          
          yPos += 5; // Add padding after table
        } catch (err) {
          console.error("Error drawing table:", err);
          addText("[Không thể hiển thị bảng. Lỗi kỹ thuật.]");
        }
      };
      
      // FIX: Improved chart rendering with better positioning and error handling
      const addChart = async (chartRef, title, width = 120) => {
        if (!chartRef) {
          console.warn(`Chart reference for "${title}" is null or undefined, skipping...`);
          return;
        }
        
        try {
          // Check if we need a new page for the chart
          const estimatedChartHeight = 80; // Rough height estimate in mm
          if (yPos + estimatedChartHeight > pageHeight - margin) {
            pdf.addPage();
            yPos = margin;
          }
          
          // Add chart title
          if (title) {
            pdf.setFont(pdf.getFont().fontName, 'bold');
            pdf.text(title, margin, yPos);
            pdf.setFont(pdf.getFont().fontName, 'normal');
            yPos += 7;
          }
          
          // Capture chart as image
          const canvas = await html2canvas(chartRef, { 
            scale: 2, // Higher resolution
            logging: false,
            useCORS: true
          });
          const imgData = canvas.toDataURL('image/png');
          
          // FIX: Calculate proportional height based on width, ensuring it fits within margins
          const imgWidth = Math.min(width, contentWidth);
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // FIX: If the image is too tall, scale it down further
          const maxHeight = contentHeight * 0.6; // Max 60% of content height
          let finalWidth = imgWidth;
          let finalHeight = imgHeight;
          
          if (imgHeight > maxHeight) {
            finalHeight = maxHeight;
            finalWidth = (canvas.width * finalHeight) / canvas.height;
          }
          
          // Center the chart horizontally
          const chartX = margin + (contentWidth - finalWidth) / 2;
          
          // Add chart
          pdf.addImage(imgData, 'PNG', chartX, yPos, finalWidth, finalHeight);
          yPos += finalHeight + 10;
        } catch (err) {
          console.error(`Error capturing chart "${title}":`, err);
          addText(`[Không thể tạo biểu đồ: ${title || 'không xác định'}]`);
          yPos += 20;
        }
      };
      
      // 1. Introduction section
      addSectionTitle('1. Giới thiệu');
      addText('Phương pháp phân tích thứ bậc (AHP - Analytic Hierarchy Process) là một kỹ thuật có cấu trúc để tổ chức và phân tích các quyết định phức tạp, dựa trên toán học và tâm lý học. AHP giúp người ra quyết định tìm ra lựa chọn phù hợp nhất với mục tiêu và hiểu biết của họ về vấn đề.');
      addText('Báo cáo này trình bày kết quả phân tích AHP cho việc lựa chọn địa điểm du lịch dựa trên nhiều tiêu chí khác nhau như chi phí, chất lượng, và nhiều yếu tố khác.');
      
      // 2. Matrix Input section - FIX: Improved matrix rendering with header validation
      addSectionTitle('2. Ma trận so sánh cặp');
      addText('Ma trận so sánh cặp thể hiện mức độ ưu tiên giữa các tiêu chí với nhau. Mỗi ô trong ma trận thể hiện tầm quan trọng tương đối của tiêu chí hàng so với tiêu chí cột.');
      
      // FIX: Validate matrix dimensions match criteria names before rendering
      const isMatrixValid = originalMatrix.length === criteriaNames.length && 
                         originalMatrix.every(row => row.length === criteriaNames.length);
      
      if (isMatrixValid && criteriaNames.length > 0) {
        // Prepare headers and rows for the matrix table
        const matrixHeaders = ['Tiêu chí', ...criteriaNames];
        
        const matrixRows = originalMatrix.map((row, rowIdx) => {
          return [
            criteriaNames[rowIdx], 
            ...row.map(cell => typeof cell === 'number' ? cell.toFixed(2) : (cell || ''))
          ];
        });
        
        // Draw the matrix table with adjusted column widths based on criteria count
        const baseColumnWidth = 25;
        const columnWidths = [40, ...Array(criteriaNames.length).fill(baseColumnWidth)];
        drawTable(matrixHeaders, matrixRows, columnWidths);
      } else {
        addText("[Ma trận không đầy đủ hoặc kích thước không khớp với số tiêu chí]");
      }
      
      yPos += 5;
      addText('Ý nghĩa các giá trị:', 5);
      addText('1: Hai tiêu chí có tầm quan trọng ngang nhau', 10);
      addText('3: Tiêu chí hàng quan trọng hơn tiêu chí B một chút', 10);
      addText('5: Tiêu chí hàng quan trọng hơn tiêu chí B đáng kể', 10);
      addText('7: Tiêu chí hàng quan trọng hơn tiêu chí B rất nhiều', 10);
      addText('9: Tiêu chí hàng quan trọng hơn tiêu chí B cực kỳ nhiều', 10);
      
      // 3. Weight Calculation section - FIX: Improved weight table display
      addSectionTitle('3. Tính toán trọng số');
      addText('Trọng số của mỗi tiêu chí được tính bằng cách chuẩn hóa ma trận so sánh cặp, sau đó tính trung bình các giá trị theo hàng. Các bước tính toán trọng số như sau:');
      addText('1. Chuẩn hóa ma trận: Chia mỗi phần tử cho tổng cột tương ứng', 5);
      addText('2. Tính trọng số: Lấy trung bình các giá trị theo hàng của ma trận đã chuẩn hóa', 5);
      
      yPos += 5;
      
      // FIX: Ensure all criteria are displayed with weights, handling incomplete data
      if (criteriaNames.length > 0) {
        // Create weights data with either normalized weights or criteria weights
        const weightsData = criteriaNames.map((name, idx) => {
          // Use normalized weights if available, otherwise use criteria weights or 0
          const weight = (normalizedWeights[idx] !== undefined) ? 
                         normalizedWeights[idx] : 
                         (criteriaWeights[idx] !== undefined ? criteriaWeights[idx] : 0);
          
          return {
            name,
            weight,
            percentage: `${(weight * 100).toFixed(2)}%`,
            rank: idx + 1 // Initial rank
          };
        });
        
        // Sort by weight in descending order
        weightsData.sort((a, b) => b.weight - a.weight);
        
        // Update ranks after sorting
        weightsData.forEach((item, index) => {
          item.rank = index + 1;
        });
        
        // Format for table display
        const weightHeaders = ['Xếp hạng', 'Tiêu chí', 'Trọng số', 'Phần trăm'];
        const weightRows = weightsData.map(item => [
          item.rank.toString(),
          item.name,
          item.weight.toFixed(2),
          item.percentage
        ]);
        
        // Draw the weights table
        const weightColumnWidths = [20, 60, 30, 30];
        drawTable(weightHeaders, weightRows, weightColumnWidths);
      } else {
        addText("[Không có dữ liệu tiêu chí]");
      }
      
      yPos += 10;
      
      // FIX: Properly display normalized matrix
      if (normalizedMatrix.length > 0 && criteriaNames.length > 0) {
        addText('Ma trận chuẩn hóa:', 0);
        yPos += 5;
        
        const normMatrixHeaders = ['Tiêu chí', ...criteriaNames, 'Trọng số'];
        
        const normMatrixRows = normalizedMatrix.map((row, rowIdx) => {
          return [
            criteriaNames[rowIdx], 
            ...row.map(cell => typeof cell === 'number' ? cell.toFixed(3) : '0.000'),
            (normalizedWeights[rowIdx] || 0).toFixed(3)
          ];
        });
        
        // Calculate adjusted column widths based on criteria count
        const normBaseWidth = 20;
        const normColumnWidths = [
          40, 
          ...Array(criteriaNames.length).fill(normBaseWidth),
          30 // Extra width for weights column
        ];
        
        // Draw the normalized matrix table
        drawTable(normMatrixHeaders, normMatrixRows, normColumnWidths);
        
        addText('Ma trận chuẩn hóa được tính bằng cách chia mỗi phần tử của ma trận gốc cho tổng cột tương ứng. Trọng số của mỗi tiêu chí là trung bình cộng của các giá trị trong hàng tương ứng của ma trận chuẩn hóa.', 5);
      }
      
      // 4. Consistency Check section
      addSectionTitle('4. Kiểm tra tính nhất quán');
      addText('Kiểm tra tính nhất quán đảm bảo rằng các đánh giá so sánh cặp là hợp lý và không mâu thuẫn với nhau. Tỷ số nhất quán (CR) được tính bằng chỉ số nhất quán (CI) chia cho chỉ số ngẫu nhiên (RI).');
      
      if (criteriaData && criteriaData.consistency_check) {
        try {
          const { cr, ci, ri, lambda_max, is_consistent } = criteriaData.consistency_check;
          
          if (typeof lambda_max === 'number') {
            addText(`λmax = ${lambda_max.toFixed(4)}`, 5);
          }
          
          if (typeof ci === 'number') {
            addText(`CI = (λmax - n) / (n - 1) = ${ci.toFixed(4)}`, 5);
          }
          
          if (typeof ci === 'number' && typeof ri === 'number' && typeof cr === 'number') {
            addText(`CR = CI / RI = ${ci.toFixed(4)} / ${ri.toFixed(2)} = ${cr.toFixed(4)}`, 5);
          }
          
          if (typeof is_consistent === 'boolean') {
            addText(`Đánh giá: ${is_consistent ? 'Nhất quán (CR < 0.1)' : 'Không nhất quán (CR >= 0.1)'}`, 5);
          }
        } catch (err) {
          console.error("Error rendering consistency check:", err);
          addText("[Không thể hiển thị dữ liệu kiểm tra tính nhất quán]");
        }
      } else {
        addText("[Không có dữ liệu kiểm tra tính nhất quán]");
      }
      
      // 5. Final Results section
      addSectionTitle('5. Kết quả cuối cùng');
      addText('Kết quả cuối cùng là trọng số tổng hợp của mỗi lựa chọn, được tính bằng cách tổng hợp trọng số của các tiêu chí và trọng số của mỗi lựa chọn theo từng tiêu chí.');
      
      // Draw results table
      if (data && data.length > 0) {
        const resultHeaders = ['Thứ hạng', 'Địa điểm', 'Trọng số', 'Phần trăm'];
        const resultRows = data.map((result, idx) => [
          (idx + 1).toString(),
          result.alternative || "Không tên",
          (typeof result.weight === 'number' ? result.weight.toFixed(2) : '0.00'),
          (typeof result.weight === 'number' ? `${(result.weight * 100).toFixed(2)}%` : '0.00%')
        ]);
        
        const resultColumnWidths = [20, 60, 30, 30];
        drawTable(resultHeaders, resultRows, resultColumnWidths);
      } else {
        addText("[Không có dữ liệu kết quả]");
      }
      
      // Add charts with improved error handling
      addText('Biểu đồ kết quả:', 0);
      
      // Add bar chart with proper sizing
      if (chartRefs.current.barChart) {
        await addChart(chartRefs.current.barChart, 'Biểu đồ trọng số địa điểm', contentWidth * 0.8);
      }
      
      // Add pie chart with proper sizing
      if (chartRefs.current.pieChart) {
        await addChart(chartRefs.current.pieChart, 'Phân bố tỷ trọng địa điểm', contentWidth * 0.8);
      }
      
      // Save the PDF
      pdf.save('Báo_cáo_AHP.pdf');
      
    } catch (error) {
      console.error("Lỗi khi xuất file PDF:", error);
      alert("Có lỗi xảy ra khi tạo file PDF. Vui lòng thử lại sau.");
    }
  };

  return (
    <div className="ahp-report" ref={reportRef}>
      <div className="report-header">
        <h2>BÁO CÁO KẾT QUẢ AHP</h2>
        <div className="export-buttons">
          <button className="export-button excel" onClick={exportToExcel}>
            Xuất Excel
          </button>
          <button className="export-button pdf" onClick={exportToPDF}>
            Xuất PDF
          </button>
        </div>
      </div>

      {/* Introduction section */}
      <div className="report-section">
        <h3>1. Giới thiệu</h3>
        <p>
          Phương pháp phân tích thứ bậc (AHP - Analytic Hierarchy Process) là một kỹ thuật có cấu trúc để tổ chức 
          và phân tích các quyết định phức tạp, dựa trên toán học và tâm lý học. AHP giúp người ra quyết định tìm ra 
          lựa chọn phù hợp nhất với mục tiêu và hiểu biết của họ về vấn đề.
        </p>
        <p>
          Báo cáo này trình bày kết quả phân tích AHP cho việc lựa chọn địa điểm du lịch dựa trên nhiều tiêu chí 
          khác nhau như chi phí, chất lượng, và nhiều yếu tố khác.
        </p>
      </div>

      {/* Matrix comparison section - FIXED to ensure all criteria are displayed */}
      <div className="report-section">
        <h3>2. Ma trận so sánh cặp</h3>
        <p>
          Ma trận so sánh cặp thể hiện mức độ ưu tiên giữa các tiêu chí với nhau. Mỗi ô trong ma trận thể hiện tầm 
          quan trọng tương đối của tiêu chí hàng so với tiêu chí cột. Giá trị 1 có nghĩa là hai tiêu chí có tầm quan 
          trọng ngang nhau, trong khi giá trị cao hơn (như 9) thể hiện sự ưu tiên cực kỳ mạnh.
        </p>
        
        {isMatrixComplete ? (
          <div className="matrix-table-container">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th>Tiêu chí</th>
                  {criteriaNames.map((name, idx) => (
                    <th key={idx}>{name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {originalMatrix.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className="criteria-name">{criteriaNames[rowIdx]}</td>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx}>
                        {typeof cell === 'number' ? (Math.round(cell * 100) / 100).toFixed(2) : (cell || '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="matrix-error">
            <p>Ma trận không đầy đủ hoặc kích thước không khớp với số tiêu chí.</p>
          </div>
        )}
        
        <div className="scale-explanation">
          <h4>Ý nghĩa các giá trị:</h4>
          <ul>
            <li>1: Hai tiêu chí có tầm quan trọng ngang nhau</li>
            <li>3: Tiêu chí hàng quan trọng hơn tiêu chí B một chút</li>
            <li>5: Tiêu chí hàng quan trọng hơn tiêu chí B đáng kể</li>
            <li>7: Tiêu chí hàng quan trọng hơn tiêu chí B rất nhiều</li>
            <li>9: Tiêu chí hàng quan trọng hơn tiêu chí B cực kỳ nhiều</li>
          </ul>
        </div>
      </div>

      {/* Weight calculation section - FIXED to show all criteria weights */}
      <div className="report-section">
        <h3>3. Tính toán trọng số</h3>
        <p>
          Trọng số của mỗi tiêu chí được tính bằng cách chuẩn hóa ma trận so sánh cặp, sau đó tính trung bình các giá trị 
          theo hàng. Quá trình tính toán bao gồm hai bước chính:
        </p>
        
        <ol className="calculation-steps">
          <li>Chuẩn hóa ma trận: Chia mỗi phần tử cho tổng cột tương ứng</li>
          <li>Tính trọng số: Lấy trung bình các giá trị theo hàng của ma trận đã chuẩn hóa</li>
        </ol>
        
        {/* Enhanced weights table with sorting and ranking */}
        <div className="weights-section">
          <h4>Bảng trọng số tiêu chí đã sắp xếp:</h4>
          <div className="weights-table-container">
            <table className="weights-table">
              <thead>
                <tr>
                  <th>Xếp hạng</th>
                  <th>Tiêu chí</th>
                  <th>Trọng số</th>
                  <th>Phần trăm</th>
                </tr>
              </thead>
              <tbody>
                {criteriaNames.map((name, idx) => {
                  // Use either calculated normalized weights or provided criteriaWeights
                  const weight = (normalizedWeights.length > 0 ? normalizedWeights[idx] : criteriaWeights[idx]) || 0;
                  return { name, weight, idx };
                })
                .sort((a, b) => b.weight - a.weight)
                .map((item, rank) => (
                  <tr key={item.idx}>
                    <td>{rank + 1}</td>
                    <td>{item.name}</td>
                    <td>{item.weight.toFixed(2)}</td>
                    <td>{(item.weight * 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Add normalized matrix display */}
        {normalizedMatrix.length > 0 && (
          <div className="matrix-calculation">
            <h4>Ma trận chuẩn hóa:</h4>
            <div className="matrix-table-container">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th>Tiêu chí</th>
                    {criteriaNames.map((name, idx) => (
                      <th key={idx}>{name}</th>
                    ))}
                    <th>Trung bình hàng<br/>(Trọng số)</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedMatrix.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      <td className="criteria-name">{criteriaNames[rowIdx]}</td>
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx}>
                          {typeof cell === 'number' ? cell.toFixed(3) : '-'
                          }
                        </td>
                      ))}
                      <td className="weight-result">
                        <strong>{normalizedWeights[rowIdx]?.toFixed(3) || "—"}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="matrix-explanation">
              Ma trận chuẩn hóa được tính bằng cách chia mỗi phần tử của ma trận gốc cho tổng cột tương ứng.
              Trọng số của mỗi tiêu chí là trung bình cộng của các giá trị trong hàng tương ứng của ma trận chuẩn hóa.
            </p>
          </div>
        )}
      </div>

      {/* 4. Consistency Check section */}
      <div className="report-section">
        <h3>4. Kiểm tra tính nhất quán</h3>
        <p>
          Kiểm tra tính nhất quán đảm bảo rằng các đánh giá so sánh cặp là hợp lý và không mâu thuẫn với nhau. 
          Tỷ số nhất quán (CR) được tính bằng chỉ số nhất quán (CI) chia cho chỉ số ngẫu nhiên (RI).
        </p>
        
        {criteriaData?.consistency_check && (
          <div className="consistency-check">
            <p>
              <strong>λ<sub>max</sub>:</strong> {criteriaData.consistency_check.lambda_max.toFixed(4)}
            </p>
            <p>
              <strong>CI:</strong> {criteriaData.consistency_check.ci.toFixed(4)}
            </p>
            <p>
              <strong>RI:</strong> {criteriaData.consistency_check.ri.toFixed(2)}
            </p>
            <p>
              <strong>CR:</strong> {criteriaData.consistency_check.cr.toFixed(4)}
            </p>
            <p className={criteriaData.consistency_check.is_consistent ? "consistent-status" : "inconsistent-status"}>
              <strong>Đánh giá:</strong> {
                criteriaData.consistency_check.is_consistent ? 
                'Nhất quán (CR < 0.1)' : 
                'Không nhất quán (CR >= 0.1)'
              }
            </p>
          </div>
        )}
        
        {data[0]?.consistency_checks && (
          <div className="criteria-consistency">
            <h4>Tính nhất quán theo tiêu chí:</h4>
            <table className="consistency-table">
              <thead>
                <tr>
                  <th>Tiêu chí</th>
                  <th>CR</th>
                  <th>Đánh giá</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data[0].consistency_checks).map(([criterion, check], idx) => (
                  <tr key={idx}>
                    <td>{criterion}</td>
                    <td>{check.cr.toFixed(4)}</td>
                    <td className={check.is_consistent ? "consistent-status" : "inconsistent-status"}>
                      {check.is_consistent ? 'Nhất quán (CR < 0.1)' : 'Không nhất quán (CR >= 0.1)'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Final Results section */}
      <div className="report-section">
        <h3>5. Kết quả cuối cùng</h3>
        <p>
          Kết quả cuối cùng là trọng số tổng hợp của mỗi lựa chọn, được tính bằng cách tổng hợp trọng số của các tiêu chí 
          và trọng số của mỗi lựa chọn theo từng tiêu chí.
        </p>
        
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
        
        {data[0]?.local_weights && (
          <div className="local-weights-section">
            <h4>Trọng số cục bộ theo từng tiêu chí:</h4>
            <table className="local-weights-table">
              <thead>
                <tr>
                  <th>Địa điểm</th>
                  {Object.keys(data[0].local_weights).map((criterion, idx) => (
                    <th key={idx}>{criterion}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((result, idx) => (
                  <tr key={idx}>
                    <td>{result.alternative}</td>
                    {Object.values(result.local_weights).map((weight, wIdx) => (
                      <td key={wIdx}>{(Math.round(weight * 100) / 100).toFixed(2)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="charts-section">
          <div className="chart-container">
            <div className="chart-wrapper" ref={el => chartRefs.current.barChart = el}>
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          </div>
          
          <div className="chart-container">
            <div className="chart-wrapper" ref={el => chartRefs.current.pieChart = el}>
              <Pie data={pieChartData} options={pieChartOptions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AHPReport;
