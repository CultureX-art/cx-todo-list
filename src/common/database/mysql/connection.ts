import { IDatabaseConnection } from "../connection";
import {
  CountResult,
  DatabaseQueryResult,
  QueryParameters,
  QueryResult,
  StatusCountResult,
  TaskRow,
  TaskRowWithCount,
  UserRow,
} from "../types";
import { Connection, createConnection } from "mysql2/promise";

export class MySQLConnection implements IDatabaseConnection {
  private connection: Connection;
  private connected: boolean = false;

  constructor(
    private readonly config: {
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
    },
  ) {}

  async connect(): Promise<void> {
    try {
      this.connection = await createConnection({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        connectTimeout: 60000,
      });
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  async queryTasks(
    sql: string,
    params?: QueryParameters,
  ): Promise<DatabaseQueryResult<TaskRow>> {
    if (this.connection === undefined) {
      throw new Error("Database not connected");
    }
    const [rows, fields] = await this.connection.execute(sql, params);
    return [rows as TaskRow[], fields as QueryResult];
  }

  async queryTasksWithCount(
    sql: string,
    params?: QueryParameters,
  ): Promise<DatabaseQueryResult<TaskRowWithCount>> {
    if (this.connection === undefined) {
      throw new Error("Database not connected");
    }
    const [rows, fields] = await this.connection.execute(sql, params);
    return [rows as TaskRowWithCount[], fields as QueryResult];
  }

  async queryTaskCount(
    sql: string,
    params?: QueryParameters,
  ): Promise<DatabaseQueryResult<CountResult>> {
    if (this.connection === undefined) {
      throw new Error("Database not connected");
    }
    const [rows, fields] = await this.connection.execute(sql, params);
    return [rows as CountResult[], fields as QueryResult];
  }

  async queryTaskStatusCounts(
    sql: string,
    params?: QueryParameters,
  ): Promise<DatabaseQueryResult<StatusCountResult>> {
    if (this.connection === undefined) {
      throw new Error("Database not connected");
    }
    const [rows, fields] = await this.connection.execute(sql, params);
    return [rows as StatusCountResult[], fields as QueryResult];
  }

  async queryUsers(
    sql: string,
    params?: QueryParameters,
  ): Promise<DatabaseQueryResult<UserRow>> {
    if (this.connection === undefined) {
      throw new Error("Database not connected");
    }
    const [rows, fields] = await this.connection.execute(sql, params);
    return [rows as UserRow[], fields as QueryResult];
  }

  async execute(
    sql: string,
    params?: QueryParameters,
  ): Promise<[QueryResult[], QueryResult]> {
    if (this.connection === undefined) {
      throw new Error("Database not connected");
    }
    const [rows, fields] = await this.connection.execute(sql, params);
    return [rows as QueryResult[], fields as QueryResult];
  }

  async beginTransaction(): Promise<void> {
    if (this.connection === undefined) {
      throw new Error("Database not connected");
    }
    await this.connection.beginTransaction();
  }

  async commit(): Promise<void> {
    if (this.connection === undefined) {
      throw new Error("Database not connected");
    }
    await this.connection.commit();
  }

  async rollback(): Promise<void> {
    if (this.connection === undefined) {
      throw new Error("Database not connected");
    }
    await this.connection.rollback();
  }

  async ping(): Promise<{ responseTimeMs: number }> {
    if (this.connection === undefined) {
      throw new Error("Database not connected");
    }
    const startTime = Date.now();
    await this.connection.ping();
    const responseTimeMs = Date.now() - startTime;
    return { responseTimeMs };
  }

  async end(): Promise<void> {
    if (this.connection !== undefined) {
      await this.connection.end();
      this.connected = false;
    }
  }

  getStats(): { active: number; idle: number; max: number } {
    // Mock implementation for now
    return { active: 5, idle: 10, max: 20 };
  }

  isConnected(): boolean {
    return this.connected;
  }
}
