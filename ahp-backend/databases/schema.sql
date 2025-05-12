-- Database Schema for AHP Decision Support System

-- Drop tables if they exist (for clean recreation)
IF OBJECT_ID('dbo.alternative_scores', 'U') IS NOT NULL DROP TABLE dbo.alternative_scores;
IF OBJECT_ID('dbo.criteria_weights', 'U') IS NOT NULL DROP TABLE dbo.criteria_weights;
IF OBJECT_ID('dbo.alternative_comparisons', 'U') IS NOT NULL DROP TABLE dbo.alternative_comparisons;
IF OBJECT_ID('dbo.criteria_comparisons', 'U') IS NOT NULL DROP TABLE dbo.criteria_comparisons;
IF OBJECT_ID('dbo.decision_criteria', 'U') IS NOT NULL DROP TABLE dbo.decision_criteria;
IF OBJECT_ID('dbo.decision_alternatives', 'U') IS NOT NULL DROP TABLE dbo.decision_alternatives;
IF OBJECT_ID('dbo.decision_problems', 'U') IS NOT NULL DROP TABLE dbo.decision_problems;
IF OBJECT_ID('dbo.alternatives', 'U') IS NOT NULL DROP TABLE dbo.alternatives;
IF OBJECT_ID('dbo.criteria', 'U') IS NOT NULL DROP TABLE dbo.criteria;

-- Create tables
-- 1. Main reference tables
CREATE TABLE dbo.criteria (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(255) NULL,
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE dbo.alternatives (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(255) NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- 2. Decision problem tracking
CREATE TABLE dbo.decision_problems (
    id INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX) NULL,
    user_id INT NULL, -- For future user authentication
    status NVARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, archived
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

-- 3. Junction tables for many-to-many relationships
CREATE TABLE dbo.decision_criteria (
    id INT IDENTITY(1,1) PRIMARY KEY,
    decision_id INT NOT NULL,
    criteria_id INT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    CONSTRAINT FK_decision_criteria_decision FOREIGN KEY (decision_id) REFERENCES dbo.decision_problems (id),
    CONSTRAINT FK_decision_criteria_criteria FOREIGN KEY (criteria_id) REFERENCES dbo.criteria (id),
    CONSTRAINT UQ_decision_criteria UNIQUE (decision_id, criteria_id)
);

CREATE TABLE dbo.decision_alternatives (
    id INT IDENTITY(1,1) PRIMARY KEY,
    decision_id INT NOT NULL,
    alternative_id INT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    CONSTRAINT FK_decision_alternatives_decision FOREIGN KEY (decision_id) REFERENCES dbo.decision_problems (id),
    CONSTRAINT FK_decision_alternatives_alternative FOREIGN KEY (alternative_id) REFERENCES dbo.alternatives (id),
    CONSTRAINT UQ_decision_alternatives UNIQUE (decision_id, alternative_id)
);

-- 4. Pairwise comparison matrices
CREATE TABLE dbo.criteria_comparisons (
    id INT IDENTITY(1,1) PRIMARY KEY,
    decision_id INT NOT NULL,
    row_criteria_id INT NOT NULL,
    column_criteria_id INT NOT NULL,
    value FLOAT NOT NULL,
    CONSTRAINT FK_criteria_comparisons_decision FOREIGN KEY (decision_id) REFERENCES dbo.decision_problems (id),
    CONSTRAINT FK_criteria_comparisons_row FOREIGN KEY (row_criteria_id) REFERENCES dbo.criteria (id),
    CONSTRAINT FK_criteria_comparisons_column FOREIGN KEY (column_criteria_id) REFERENCES dbo.criteria (id),
    CONSTRAINT UQ_criteria_comparisons UNIQUE (decision_id, row_criteria_id, column_criteria_id)
);

CREATE TABLE dbo.alternative_comparisons (
    id INT IDENTITY(1,1) PRIMARY KEY,
    decision_id INT NOT NULL,
    criteria_id INT NOT NULL,
    row_alternative_id INT NOT NULL,
    column_alternative_id INT NOT NULL,
    value FLOAT NOT NULL,
    CONSTRAINT FK_alternative_comparisons_decision FOREIGN KEY (decision_id) REFERENCES dbo.decision_problems (id),
    CONSTRAINT FK_alternative_comparisons_criteria FOREIGN KEY (criteria_id) REFERENCES dbo.criteria (id),
    CONSTRAINT FK_alternative_comparisons_row FOREIGN KEY (row_alternative_id) REFERENCES dbo.alternatives (id),
    CONSTRAINT FK_alternative_comparisons_column FOREIGN KEY (column_alternative_id) REFERENCES dbo.alternatives (id),
    CONSTRAINT UQ_alternative_comparisons UNIQUE (decision_id, criteria_id, row_alternative_id, column_alternative_id)
);

-- 5. Results tables
CREATE TABLE dbo.criteria_weights (
    id INT IDENTITY(1,1) PRIMARY KEY,
    decision_id INT NOT NULL,
    criteria_id INT NOT NULL,
    weight FLOAT NOT NULL,
    CONSTRAINT FK_criteria_weights_decision FOREIGN KEY (decision_id) REFERENCES dbo.decision_problems (id),
    CONSTRAINT FK_criteria_weights_criteria FOREIGN KEY (criteria_id) REFERENCES dbo.criteria (id),
    CONSTRAINT UQ_criteria_weights UNIQUE (decision_id, criteria_id)
);

CREATE TABLE dbo.alternative_scores (
    id INT IDENTITY(1,1) PRIMARY KEY,
    decision_id INT NOT NULL,
    alternative_id INT NOT NULL,
    criteria_id INT NULL, -- NULL for global scores
    score FLOAT NOT NULL,
    is_final_score BIT NOT NULL DEFAULT 0, -- 1 for final aggregate scores
    rank_order INT NULL, -- For storing the final rank
    CONSTRAINT FK_alternative_scores_decision FOREIGN KEY (decision_id) REFERENCES dbo.decision_problems (id),
    CONSTRAINT FK_alternative_scores_alternative FOREIGN KEY (alternative_id) REFERENCES dbo.alternatives (id),
    CONSTRAINT FK_alternative_scores_criteria FOREIGN KEY (criteria_id) REFERENCES dbo.criteria (id),
    CONSTRAINT UQ_alternative_scores UNIQUE (decision_id, alternative_id, criteria_id, is_final_score)
);

-- Add consistency ratio table for both criteria and alternative comparisons
CREATE TABLE dbo.consistency_checks (
    id INT IDENTITY(1,1) PRIMARY KEY,
    decision_id INT NOT NULL,
    criteria_id INT NULL, -- NULL for criteria matrix consistency
    lambda_max FLOAT NOT NULL,
    consistency_index FLOAT NOT NULL,
    consistency_ratio FLOAT NOT NULL,
    is_consistent BIT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_consistency_checks_decision FOREIGN KEY (decision_id) REFERENCES dbo.decision_problems (id),
    CONSTRAINT FK_consistency_checks_criteria FOREIGN KEY (criteria_id) REFERENCES dbo.criteria (id),
    CONSTRAINT UQ_consistency_checks UNIQUE (decision_id, criteria_id)
);

INSERT INTO dbo.criteria (name, description) VALUES 
(N'Chi phí/ngày', 'Cost per day for the destination'),
(N'Độ an toàn', 'Safety level of the destination'),
(N'Trải nghiệm văn hóa', 'Cultural experiences available'),
(N'Đánh giá KH', 'Customer ratings'),
(N'Khoảng cách', 'Distance from starting point'),
(N'Phương Tiện', 'Transportation options available');

INSERT INTO dbo.alternatives (name, description) VALUES 
(N'Hội An', 'Ancient town in central Vietnam'),
(N'Đà Lạt', 'Mountain resort city in southern Vietnam'),
(N'Hạ Long', 'Bay with limestone islands in northern Vietnam'),
(N'Nha Trang', 'Coastal city in central Vietnam'),
(N'Phú Quốc', 'Island in southern Vietnam');
