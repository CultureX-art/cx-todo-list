-- Todo API Database Schema
-- MySQL 8.0+ compatible schema with performance optimizations

-- Enable foreign key checks and set charset
SET FOREIGN_KEY_CHECKS = 1;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Users table for authentication and user management
CREATE TABLE user (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    -- Constraints
    CONSTRAINT chk_user_email_format CHECK (email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_user_password_hash CHECK (LENGTH(password_hash) >= 60)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tasks table for todo item management
CREATE TABLE task (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    status ENUM('not-started', 'in-progress', 'done') NOT NULL DEFAULT 'not-started',
    due_date TIMESTAMP NULL,
    labels JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    -- Foreign key relationship
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_task_title_length CHECK (LENGTH(TRIM(title)) >= 1),
    CONSTRAINT chk_task_description_length CHECK (description IS NULL OR LENGTH(description) <= 1000),
    CONSTRAINT chk_task_labels_array CHECK (
        labels IS NULL OR 
        (JSON_VALID(labels) AND JSON_TYPE(labels) = 'ARRAY' AND JSON_LENGTH(labels) <= 10)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Performance indexes for user table
CREATE INDEX idx_user_email ON user(email);
CREATE INDEX idx_user_created_at ON user(created_at);
CREATE INDEX idx_user_deleted_at ON user(deleted_at);

-- Performance indexes for task table
-- Primary access patterns: user_id filtering, status filtering, date sorting
CREATE INDEX idx_task_user_id ON task(user_id);
CREATE INDEX idx_task_status ON task(status);
CREATE INDEX idx_task_due_date ON task(due_date);
CREATE INDEX idx_task_created_at ON task(created_at);
CREATE INDEX idx_task_updated_at ON task(updated_at);
CREATE INDEX idx_task_deleted_at ON task(deleted_at);

-- Composite indexes for common query patterns
CREATE INDEX idx_task_user_status ON task(user_id, status);
CREATE INDEX idx_task_user_created ON task(user_id, created_at DESC);
CREATE INDEX idx_task_user_due_date ON task(user_id, due_date ASC);
CREATE INDEX idx_task_user_deleted ON task(user_id, deleted_at);

-- Full-text search index for task titles
CREATE FULLTEXT INDEX idx_task_title_search ON task(title);

-- Optional: Full-text search for both title and description
CREATE FULLTEXT INDEX idx_task_content_search ON task(title, description);

-- Audit trail table for tracking changes (optional, for compliance)
CREATE TABLE audit_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    table_name VARCHAR(64) NOT NULL,
    record_id BIGINT NOT NULL,
    action ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    user_id BIGINT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for audit queries
    INDEX idx_audit_table_record (table_name, record_id),
    INDEX idx_audit_user_id (user_id),
    INDEX idx_audit_created_at (created_at),
    
    -- Foreign key for user tracking
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Session blacklist table for JWT token revocation (optional)
CREATE TABLE token_blacklist (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    token_jti VARCHAR(255) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_blacklist_jti (token_jti),
    INDEX idx_blacklist_user_id (user_id),
    INDEX idx_blacklist_expires_at (expires_at),
    
    -- Foreign key
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Database configuration optimizations
-- These should be set in MySQL configuration file (my.cnf)

-- Example configuration for optimal performance:
-- innodb_buffer_pool_size = 70% of available RAM
-- innodb_log_file_size = 256M
-- innodb_flush_log_at_trx_commit = 2
-- query_cache_type = 1
-- query_cache_size = 256M

-- Sample data for development and testing
-- This section can be removed for production deployments

-- Sample users (passwords are hashed versions of 'password123')
INSERT INTO user (email, password_hash) VALUES 
('admin@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye7VfJvGZ/6QGdqgUfL/1Vng8.rZaUROu'),
('user1@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye7VfJvGZ/6QGdqgUfL/1Vng8.rZaUROu'),
('user2@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye7VfJvGZ/6QGdqgUfL/1Vng8.rZaUROu');

-- Sample tasks for testing
INSERT INTO task (user_id, title, description, status, due_date, labels) VALUES 
(1, 'Set up development environment', 'Install Node.js, MySQL, and configure local development setup', 'done', '2024-01-20 17:00:00', '["setup", "development"]'),
(1, 'Write API documentation', 'Create comprehensive OpenAPI specification for all endpoints', 'in-progress', '2024-01-25 17:00:00', '["documentation", "api"]'),
(1, 'Implement authentication', 'Build JWT-based authentication system', 'not-started', '2024-01-30 17:00:00', '["auth", "security"]'),
(2, 'Review code changes', 'Review pull request for new features', 'not-started', NULL, '["review", "code"]'),
(2, 'Update dependencies', 'Upgrade project dependencies to latest versions', 'done', '2024-01-18 10:00:00', '["maintenance", "dependencies"]'),
(3, 'Plan sprint goals', 'Define objectives and deliverables for next sprint', 'in-progress', '2024-01-22 15:00:00', '["planning", "management"]');

-- Views for common queries (optional)

-- Active tasks view (excludes soft-deleted tasks)
CREATE VIEW active_tasks AS
SELECT 
    id,
    user_id,
    title,
    description,
    status,
    due_date,
    labels,
    created_at,
    updated_at
FROM task 
WHERE deleted_at IS NULL;

-- Task summary view for analytics
CREATE VIEW task_summary AS
SELECT 
    u.id as user_id,
    u.email,
    COUNT(t.id) as total_tasks,
    SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as completed_tasks,
    SUM(CASE WHEN t.status = 'in-progress' THEN 1 ELSE 0 END) as in_progress_tasks,
    SUM(CASE WHEN t.status = 'not-started' THEN 1 ELSE 0 END) as not_started_tasks,
    SUM(CASE WHEN t.due_date < NOW() AND t.status != 'done' THEN 1 ELSE 0 END) as overdue_tasks
FROM user u
LEFT JOIN task t ON u.id = t.user_id AND t.deleted_at IS NULL
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.email;

-- Triggers for audit logging (optional)

DELIMITER //

-- Trigger for user table changes
CREATE TRIGGER user_audit_insert AFTER INSERT ON user
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, new_values)
    VALUES ('user', NEW.id, 'INSERT', JSON_OBJECT(
        'id', NEW.id,
        'email', NEW.email,
        'created_at', NEW.created_at
    ));
END//

CREATE TRIGGER user_audit_update AFTER UPDATE ON user
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_values, new_values)
    VALUES ('user', NEW.id, 'UPDATE', 
        JSON_OBJECT('email', OLD.email, 'updated_at', OLD.updated_at),
        JSON_OBJECT('email', NEW.email, 'updated_at', NEW.updated_at)
    );
END//

-- Trigger for task table changes
CREATE TRIGGER task_audit_insert AFTER INSERT ON task
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, new_values, user_id)
    VALUES ('task', NEW.id, 'INSERT', JSON_OBJECT(
        'id', NEW.id,
        'user_id', NEW.user_id,
        'title', NEW.title,
        'status', NEW.status,
        'created_at', NEW.created_at
    ), NEW.user_id);
END//

CREATE TRIGGER task_audit_update AFTER UPDATE ON task
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, user_id)
    VALUES ('task', NEW.id, 'UPDATE',
        JSON_OBJECT(
            'title', OLD.title,
            'description', OLD.description,
            'status', OLD.status,
            'due_date', OLD.due_date,
            'labels', OLD.labels,
            'updated_at', OLD.updated_at
        ),
        JSON_OBJECT(
            'title', NEW.title,
            'description', NEW.description,
            'status', NEW.status,
            'due_date', NEW.due_date,
            'labels', NEW.labels,
            'updated_at', NEW.updated_at
        ),
        NEW.user_id
    );
END//

DELIMITER ;

-- Cleanup procedures for maintenance

DELIMITER //

-- Procedure to clean up expired tokens from blacklist
CREATE PROCEDURE CleanupExpiredTokens()
BEGIN
    DELETE FROM token_blacklist 
    WHERE expires_at < NOW();
    
    SELECT ROW_COUNT() as deleted_tokens;
END//

-- Procedure to clean up old audit logs (keep last 90 days)
CREATE PROCEDURE CleanupAuditLogs()
BEGIN
    DELETE FROM audit_log 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    SELECT ROW_COUNT() as deleted_audit_records;
END//

-- Procedure to get database statistics
CREATE PROCEDURE GetDatabaseStats()
BEGIN
    SELECT 
        'users' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_records
    FROM user
    
    UNION ALL
    
    SELECT 
        'tasks' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_records
    FROM task
    
    UNION ALL
    
    SELECT 
        'audit_log' as table_name,
        COUNT(*) as total_records,
        COUNT(*) as active_records
    FROM audit_log;
END//

DELIMITER ;

-- Create database user with limited privileges (for application connection)
-- This should be run separately with appropriate privileges

/*
-- Application database user
CREATE USER 'todo_app'@'localhost' IDENTIFIED BY 'secure_password_here';

-- Grant only necessary privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON todo_db.user TO 'todo_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON todo_db.task TO 'todo_app'@'localhost';
GRANT INSERT ON todo_db.audit_log TO 'todo_app'@'localhost';
GRANT SELECT, INSERT, DELETE ON todo_db.token_blacklist TO 'todo_app'@'localhost';

-- Grant execute privileges on cleanup procedures
GRANT EXECUTE ON PROCEDURE todo_db.CleanupExpiredTokens TO 'todo_app'@'localhost';
GRANT EXECUTE ON PROCEDURE todo_db.GetDatabaseStats TO 'todo_app'@'localhost';

FLUSH PRIVILEGES;
*/