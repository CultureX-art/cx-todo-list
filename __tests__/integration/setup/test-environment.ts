/**
 * Integration Test Environment Setup
 *
 * Provides isolated test environment with database transactions and app initialization.
 */

import { IDatabaseConnection } from "../../../src/common/database/connection";
import { MockDatabaseConnection } from "../../../src/common/database/mock/connection";
import { MySQLConnection } from "../../../src/common/database/mysql/connection";
import { ITaskRepository } from "../../../src/task/repositories/task.repository";
import { MySQLTaskRepository } from "../../../src/task/repositories/task.repository.impl";
import { TaskService } from "../../../src/task/services/task.service";

export class IntegrationTestEnvironment {
  private static instance: IntegrationTestEnvironment;
  private database: IDatabaseConnection | null = null;
  private taskRepository: ITaskRepository | null = null;
  private taskService: TaskService | null = null;
  private transactionInProgress = false;

  /**
   * Initialize test environment with isolated database
   */
  public static async setup(): Promise<IntegrationTestEnvironment> {
    if (IntegrationTestEnvironment.instance === null) {
      IntegrationTestEnvironment.instance = new IntegrationTestEnvironment();
      await IntegrationTestEnvironment.instance.initialize();
    }
    return IntegrationTestEnvironment.instance;
  }

  private async initialize(): Promise<void> {
    // Use mock database for integration tests (no real DB needed)
    if (process.env["USE_REAL_DB"] === "true") {
      this.database = new MySQLConnection({
        host: process.env["TEST_DB_HOST"] ?? "localhost",
        port: parseInt(process.env["TEST_DB_PORT"] ?? "3306"),
        database: process.env["TEST_DB_NAME"] ?? "todo_test",
        username: process.env["TEST_DB_USER"] ?? "test",
        password: process.env["TEST_DB_PASSWORD"] ?? "test",
      });
    } else {
      // Use in-memory mock database for testing
      this.database = new MockDatabaseConnection();
    }

    // Connect to database
    await this.database.connect();

    // Initialize repositories and services
    this.taskRepository = new MySQLTaskRepository(this.database);
    this.taskService = new TaskService(this.taskRepository);

    // Create schema if needed
    await this.createSchema();
  }

  private async createSchema(): Promise<void> {
    if (!this.database) return;

    // Create tables if they don't exist
    const createUserTable = `
      CREATE TABLE IF NOT EXISTS user (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_email (email),
        INDEX idx_deleted (deleted_at)
      )
    `;

    const createTaskTable = `
      CREATE TABLE IF NOT EXISTS task (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status ENUM('not-started', 'in-progress', 'done') DEFAULT 'not-started',
        due_date TIMESTAMP NULL,
        labels JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES user(id),
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_due_date (due_date),
        INDEX idx_deleted (deleted_at),
        FULLTEXT(title, description)
      )
    `;

    await this.database.execute(createUserTable);
    await this.database.execute(createTaskTable);
  }

  /**
   * Start database transaction for test isolation
   */
  public async beginTransaction(): Promise<void> {
    if (!this.database) throw new Error("Database not initialized");
    await this.database.beginTransaction();
    this.transactionInProgress = true;
  }

  /**
   * Rollback transaction to clean up test data
   */
  public async rollbackTransaction(): Promise<void> {
    if (!this.database) throw new Error("Database not initialized");
    if (this.transactionInProgress) {
      await this.database.rollback();
      this.transactionInProgress = false;
    }
  }

  /**
   * Commit transaction (for tests that need to verify committed state)
   */
  public async commitTransaction(): Promise<void> {
    if (!this.database) throw new Error("Database not initialized");
    if (this.transactionInProgress) {
      await this.database.commit();
      this.transactionInProgress = false;
    }
  }

  /**
   * Get database connection
   */
  public getDatabase(): IDatabaseConnection {
    if (!this.database) throw new Error("Database not initialized");
    return this.database;
  }

  /**
   * Get task repository
   */
  public getTaskRepository(): ITaskRepository {
    if (!this.taskRepository)
      throw new Error("Task repository not initialized");
    return this.taskRepository;
  }

  /**
   * Get task service
   */
  public getTaskService(): TaskService {
    if (!this.taskService) throw new Error("Task service not initialized");
    return this.taskService;
  }

  /**
   * Clean up test data
   */
  public async cleanupTestData(): Promise<void> {
    if (!this.database) return;

    // Delete all test data
    await this.database.execute("DELETE FROM task WHERE 1=1");
    await this.database.execute("DELETE FROM user WHERE 1=1");
  }

  /**
   * Create test user
   */
  public async createTestUser(
    email: string = "test@example.com",
  ): Promise<{ id: number; email: string }> {
    if (!this.database) throw new Error("Database not initialized");

    const [, result] = await this.database.execute(
      "INSERT INTO user (email, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=id",
      [email, "$2b$12$mockPasswordHash"],
    );

    const userId = result.insertId ?? 1;

    return { id: userId, email };
  }

  /**
   * Create test task
   */
  public async createTestTask(
    userId: number,
    title: string = "Test Task",
  ): Promise<number> {
    if (!this.database) throw new Error("Database not initialized");

    const [, result] = await this.database.execute(
      "INSERT INTO task (user_id, title, description, status) VALUES (?, ?, ?, ?)",
      [userId, title, "Test description", "not-started"],
    );

    return result.insertId ?? 1;
  }

  /**
   * Get auth service mock
   */
  public getAuthService(): any {
    return {
      validateToken: async (token: string) => {
        // Mock JWT validation - extract user info from test token
        try {
          const parts = token.split(".");
          if (parts.length !== 3 || !parts[1]) {
            throw new Error("Invalid token format");
          }
          const payload = JSON.parse(
            Buffer.from(parts[1], "base64").toString(),
          );
          return payload;
        } catch {
          throw new Error("Invalid token");
        }
      },

      generateToken: async (userId: number, email: string) => {
        const payload = { userId, email, exp: Date.now() + 3600000 };
        const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
        return `header.${encoded}.signature`;
      },
    };
  }

  /**
   * Generate auth token for test user
   */
  public async generateAuthToken(
    userId: number,
    email: string,
  ): Promise<string> {
    const authService = this.getAuthService();
    return await authService.generateToken(userId, email);
  }

  /**
   * Clean up test environment
   */
  public async teardown(): Promise<void> {
    if (this.transactionInProgress) {
      await this.rollbackTransaction();
    }

    if (this.database) {
      await this.database.end();
    }

    IntegrationTestEnvironment.instance = null as any;
  }
}
