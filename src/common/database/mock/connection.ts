/**
 * Mock Database Connection for Testing
 *
 * In-memory database implementation for integration tests.
 */

import { IDatabaseConnection } from "../connection.js";
import {
  TaskRow,
  TaskRowWithCount,
  CountResult,
  StatusCountResult,
  UserRow,
  QueryResult,
} from "../types.js";

interface MockTable {
  [key: string]: Record<string, string | number | boolean | null | Date>[];
}

export class MockDatabaseConnection implements IDatabaseConnection {
  private tables: MockTable = {};
  private transactionActive = false;
  private transactionData: MockTable = {};
  private connected = false;
  private idCounters: { [tableName: string]: number } = {};

  async connect(): Promise<void> {
    this.connected = true;
    // Initialize tables and ID counters
    this.tables = {
      user: [],
      task: [],
    };
    this.idCounters = {
      user: 0,
      task: 0,
    };
  }

  async queryTasks(
    sql: string,
    params: (string | number | boolean | null)[] = [],
  ): Promise<[TaskRow[], QueryResult]> {
    const [rows, fields] = await this.query(sql, params);
    // Transform generic records to TaskRow format
    const taskRows: TaskRow[] = rows.map((row) => ({
      id: Number(row["id"]),
      user_id: Number(row["user_id"]),
      title: String(row["title"]),
      description:
        row["description"] !== null && row["description"] !== undefined
          ? String(row["description"])
          : null,
      due_date:
        row["due_date"] !== null && row["due_date"] !== undefined
          ? String(row["due_date"])
          : null,
      status: String(row["status"]) as "not-started" | "in-progress" | "done",
      labels: String(row["labels"] ?? "[]"),
      created_at:
        row["created_at"] !== null && row["created_at"] !== undefined
          ? String(row["created_at"])
          : new Date().toISOString(),
      updated_at:
        row["updated_at"] !== null && row["updated_at"] !== undefined
          ? String(row["updated_at"])
          : new Date().toISOString(),
      deleted_at:
        row["deleted_at"] !== null && row["deleted_at"] !== undefined
          ? String(row["deleted_at"])
          : null,
    }));
    return [taskRows, fields];
  }

  async queryTasksWithCount(
    sql: string,
    params: (string | number | boolean | null)[] = [],
  ): Promise<[TaskRowWithCount[], QueryResult]> {
    const [rows, fields] = await this.query(sql, params);
    // Transform generic records to TaskRowWithCount format
    const taskRows: TaskRowWithCount[] = rows.map((row) => {
      const baseTask = {
        id: Number(row["id"]),
        user_id: Number(row["user_id"]),
        title: String(row["title"]),
        description:
          row["description"] !== null && row["description"] !== undefined
            ? String(row["description"])
            : null,
        due_date:
          row["due_date"] !== null && row["due_date"] !== undefined
            ? String(row["due_date"])
            : null,
        status: String(row["status"]) as "not-started" | "in-progress" | "done",
        labels: String(row["labels"] ?? "[]"),
        created_at:
          row["created_at"] !== null && row["created_at"] !== undefined
            ? String(row["created_at"])
            : new Date().toISOString(),
        updated_at:
          row["updated_at"] !== null && row["updated_at"] !== undefined
            ? String(row["updated_at"])
            : new Date().toISOString(),
        deleted_at:
          row["deleted_at"] !== null && row["deleted_at"] !== undefined
            ? String(row["deleted_at"])
            : null,
      };
      const result: TaskRowWithCount = { ...baseTask };
      if (row["total_count"] !== undefined && row["total_count"] !== null) {
        result.total_count = Number(row["total_count"]);
      }
      return result;
    });
    return [taskRows, fields];
  }

  async queryTaskCount(
    sql: string,
    params: (string | number | boolean | null)[] = [],
  ): Promise<[CountResult[], QueryResult]> {
    const [rows, fields] = await this.query(sql, params);
    // Transform generic records to CountResult format
    const countResults: CountResult[] = rows.map((row) => ({
      count: Number(row["count"] ?? 0),
    }));
    return [countResults, fields];
  }

  async queryTaskStatusCounts(
    sql: string,
    params: (string | number | boolean | null)[] = [],
  ): Promise<[StatusCountResult[], QueryResult]> {
    const [rows, fields] = await this.query(sql, params);
    // Transform generic records to StatusCountResult format
    const statusCountResults: StatusCountResult[] = rows.map((row) => ({
      status: String(row["status"]),
      count: Number(row["count"] ?? 0),
    }));
    return [statusCountResults, fields];
  }

  async queryUsers(
    sql: string,
    params: (string | number | boolean | null)[] = [],
  ): Promise<[UserRow[], QueryResult]> {
    const [rows, fields] = await this.query(sql, params);
    // Transform generic records to UserRow format
    const userRows: UserRow[] = rows.map((row) => ({
      id: Number(row["id"]),
      email: String(row["email"]),
      password_hash: String(row["password_hash"]),
      first_name:
        row["first_name"] !== null && row["first_name"] !== undefined
          ? String(row["first_name"])
          : null,
      last_name:
        row["last_name"] !== null && row["last_name"] !== undefined
          ? String(row["last_name"])
          : null,
      is_active: Boolean(row["is_active"]),
      last_login_at:
        row["last_login_at"] !== null && row["last_login_at"] !== undefined
          ? String(row["last_login_at"])
          : null,
      created_at:
        row["created_at"] !== null && row["created_at"] !== undefined
          ? String(row["created_at"])
          : new Date().toISOString(),
      updated_at:
        row["updated_at"] !== null && row["updated_at"] !== undefined
          ? String(row["updated_at"])
          : new Date().toISOString(),
      deleted_at:
        row["deleted_at"] !== null && row["deleted_at"] !== undefined
          ? String(row["deleted_at"])
          : null,
    }));
    return [userRows, fields];
  }

  private async query(
    sql: string,
    params: (string | number | boolean | null)[] = [],
  ): Promise<
    [Record<string, string | number | boolean | null | Date>[], QueryResult]
  > {
    if (!this.connected) {
      throw new Error("Database not connected");
    }

    // Simple SQL parser for basic operations
    const sqlLower = sql.toLowerCase().trim();

    if (sqlLower.includes("create table")) {
      // Table creation - just acknowledge
      const result: QueryResult = {
        affectedRows: 0,
        changedRows: 0,
        warningCount: 0,
        message: "",
        protocol41: true,
      };
      return [[], result];
    }

    if (sqlLower.startsWith("insert into")) {
      return this.handleInsert(sql, params);
    }

    if (sqlLower.startsWith("select")) {
      return this.handleSelect(sql, params);
    }

    if (sqlLower.startsWith("update")) {
      return this.handleUpdate(sql, params);
    }

    if (sqlLower.startsWith("delete")) {
      return this.handleDelete(sql, params);
    }

    // Default response for unsupported queries
    const defaultResult: QueryResult = {
      affectedRows: 0,
      changedRows: 0,
      warningCount: 0,
      message: "",
      protocol41: true,
    };
    return [[], defaultResult];
  }

  async execute(
    sql: string,
    params: (string | number | boolean | null)[] = [],
  ): Promise<[QueryResult[], QueryResult]> {
    const [rows, fields] = await this.query(sql, params);

    // For execute operations, we typically return the result metadata, not the rows
    if (
      sql.toLowerCase().trim().startsWith("insert") ||
      sql.toLowerCase().trim().startsWith("update") ||
      sql.toLowerCase().trim().startsWith("delete")
    ) {
      return [[], fields]; // Return empty array for rows, result metadata in fields
    }

    return [rows as QueryResult[], fields];
  }

  async beginTransaction(): Promise<void> {
    this.transactionActive = true;
    // Copy current state for rollback
    this.transactionData = JSON.parse(JSON.stringify(this.tables));
  }

  async commit(): Promise<void> {
    this.transactionActive = false;
    this.transactionData = {};
  }

  async rollback(): Promise<void> {
    if (this.transactionActive) {
      this.tables = this.transactionData;
      this.transactionActive = false;
      this.transactionData = {};
    }
  }

  async ping(): Promise<{ responseTimeMs: number }> {
    return { responseTimeMs: 1 };
  }

  async end(): Promise<void> {
    this.connected = false;
    this.tables = {};
  }

  getStats(): { active: number; idle: number; max: number } {
    return { active: 1, idle: 0, max: 1 };
  }

  isConnected(): boolean {
    return this.connected;
  }

  private handleInsert(
    sql: string,
    params: (string | number | boolean | null)[],
  ): Promise<[Record<string, never>[], QueryResult]> {
    // Extract table name
    const tableMatch = sql.match(/insert into (\w+)/i);
    if (tableMatch?.[1] === undefined) {
      throw new Error("Invalid INSERT statement");
    }

    const tableName = tableMatch[1];
    if (!this.tables[tableName]) {
      this.tables[tableName] = [];
    }

    // Simple insert - generate ID and add record
    const table = this.tables[tableName];
    if (table === undefined) {
      throw new Error("Table not found");
    }

    // Use counter for consistent ID generation
    this.idCounters[tableName] = (this.idCounters[tableName] ?? 0) + 1;
    const id = this.idCounters[tableName];
    const record = { id, ...this.buildRecordFromParams(sql, params) };

    table.push(record);

    const result: QueryResult = {
      insertId: id,
      affectedRows: 1,
      warningCount: 0,
      message: "",
      protocol41: true,
      changedRows: 0,
    };

    return Promise.resolve([[], result]);
  }

  private handleSelect(
    sql: string,
    params: (string | number | boolean | null)[],
  ): Promise<
    [Record<string, string | number | boolean | null | Date>[], QueryResult]
  > {
    // Handle COUNT queries
    if (sql.toLowerCase().includes("count(")) {
      return this.handleCountQuery(sql, params).then(([countRows, result]) => {
        // Transform count results to generic record format for compatibility
        const records: Record<
          string,
          string | number | boolean | null | Date
        >[] = countRows.map((countRow) => ({
          count: countRow.count,
        }));
        return [records, result];
      });
    }

    // Extract table name
    const tableMatch = sql.match(/from (\w+)/i);
    if (tableMatch?.[1] === undefined) {
      const defaultResult: QueryResult = {
        affectedRows: 0,
        changedRows: 0,
        warningCount: 0,
        message: "",
        protocol41: true,
      };
      return Promise.resolve([[], defaultResult]);
    }

    const tableName = tableMatch[1];
    const table = this.tables[tableName];
    if (table === undefined) {
      const defaultResult: QueryResult = {
        affectedRows: 0,
        changedRows: 0,
        warningCount: 0,
        message: "",
        protocol41: true,
      };
      return Promise.resolve([[], defaultResult]);
    }

    let results = [...table];

    // Apply WHERE conditions
    if (sql.toLowerCase().includes("where")) {
      results = this.applyWhereConditions(results, sql, params);
    }

    // Apply ORDER BY
    const orderMatch = sql.match(/order by (\w+)(?:\s+(asc|desc))?/i);
    if (orderMatch?.[1] !== undefined) {
      const orderField = this.camelToSnakeCase(orderMatch[1]);
      const orderDir = orderMatch[2]?.toLowerCase() ?? "asc";

      results.sort((a, b) => {
        const aVal = a[orderField] ?? "";
        const bVal = b[orderField] ?? "";

        if (orderDir === "desc") {
          return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
        } else {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        }
      });
    }

    // Apply OFFSET and LIMIT for pagination
    const offsetMatch = sql.match(/offset (\d+)/i);
    const limitMatch = sql.match(/limit (\d+)/i);

    let offset = 0;
    let limit = results.length;

    if (offsetMatch?.[1] !== undefined) {
      offset = parseInt(offsetMatch[1]);
    }

    if (limitMatch?.[1] !== undefined) {
      limit = parseInt(limitMatch[1]);
    }

    results = results.slice(offset, offset + limit);

    const defaultResult: QueryResult = {
      affectedRows: 0,
      changedRows: 0,
      warningCount: 0,
      message: "",
      protocol41: true,
    };
    return Promise.resolve([results, defaultResult]);
  }

  private handleCountQuery(
    sql: string,
    params: (string | number | boolean | null)[],
  ): Promise<[CountResult[], QueryResult]> {
    // Extract table name
    const tableMatch = sql.match(/from (\w+)/i);
    if (tableMatch?.[1] === undefined) {
      const defaultResult: QueryResult = {
        affectedRows: 0,
        changedRows: 0,
        warningCount: 0,
        message: "",
        protocol41: true,
      };
      return Promise.resolve([[{ count: 0 }], defaultResult]);
    }

    const tableName = tableMatch[1];
    const table = this.tables[tableName];
    if (table === undefined) {
      const defaultResult: QueryResult = {
        affectedRows: 0,
        changedRows: 0,
        warningCount: 0,
        message: "",
        protocol41: true,
      };
      return Promise.resolve([[{ count: 0 }], defaultResult]);
    }

    let results = [...table];

    // Apply WHERE conditions
    if (sql.toLowerCase().includes("where")) {
      results = this.applyWhereConditions(results, sql, params);
    }

    const count = results.length;
    const defaultResult: QueryResult = {
      affectedRows: 0,
      changedRows: 0,
      warningCount: 0,
      message: "",
      protocol41: true,
    };
    return Promise.resolve([[{ count }], defaultResult]);
  }

  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  private handleUpdate(
    sql: string,
    params: (string | number | boolean | null)[],
  ): Promise<[Record<string, never>[], QueryResult]> {
    const tableMatch = sql.match(/update (\w+)/i);
    if (tableMatch?.[1] === undefined) {
      throw new Error("Invalid UPDATE statement");
    }

    const tableName = tableMatch[1];
    const table = this.tables[tableName];
    if (table === undefined) {
      const result: QueryResult = {
        affectedRows: 0,
        changedRows: 0,
        warningCount: 0,
        message: "",
        protocol41: true,
      };
      return Promise.resolve([[], result]);
    }

    // Simple update implementation
    let affectedRows = 0;
    const records = table;

    // Apply WHERE conditions to find records to update
    if (sql.toLowerCase().includes("where")) {
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        if (record && this.matchesWhereCondition(record, sql, params)) {
          // Update the record
          const updates = this.extractSetValues(sql, params);
          Object.assign(record, updates);
          affectedRows++;
        }
      }
    }

    const result: QueryResult = {
      affectedRows,
      changedRows: affectedRows,
      warningCount: 0,
      message: "",
      protocol41: true,
    };
    return Promise.resolve([[], result]);
  }

  private handleDelete(
    sql: string,
    params: (string | number | boolean | null)[],
  ): Promise<[Record<string, never>[], QueryResult]> {
    const tableMatch = sql.match(/from (\w+)/i);
    if (tableMatch?.[1] === undefined) {
      throw new Error("Invalid DELETE statement");
    }

    const tableName = tableMatch[1];
    const table = this.tables[tableName];
    if (table === undefined) {
      const result: QueryResult = {
        affectedRows: 0,
        changedRows: 0,
        warningCount: 0,
        message: "",
        protocol41: true,
      };
      return Promise.resolve([[], result]);
    }

    let affectedRows = 0;

    // Handle DELETE WHERE 1=1 (clear all)
    if (sql.includes("WHERE 1=1")) {
      affectedRows = table.length;
      this.tables[tableName] = [];
      this.idCounters[tableName] = 0; // Reset counter
    }
    // Simple delete - usually soft delete by setting deleted_at
    else if (sql.toLowerCase().includes("where")) {
      for (let i = 0; i < table.length; i++) {
        const record = table[i];
        if (record && this.matchesWhereCondition(record, sql, params)) {
          // Soft delete
          record["deleted_at"] = new Date().toISOString();
          affectedRows++;
        }
      }
    }

    const result: QueryResult = {
      affectedRows,
      changedRows: 0,
      warningCount: 0,
      message: "",
      protocol41: true,
    };
    return Promise.resolve([[], result]);
  }

  private buildRecordFromParams(
    sql: string,
    params: (string | number | boolean | null)[],
  ): Record<string, string | number | boolean | null | Date> {
    // Simple implementation - assumes parameterized query with positional parameters
    const record: Record<string, string | number | boolean | null | Date> = {};

    // Extract column names from INSERT statement
    const columnsMatch = sql.match(/\((.*?)\)/);
    if (columnsMatch?.[1] !== undefined) {
      const columns = columnsMatch[1].split(",").map((c) => c.trim());
      columns.forEach((col, index) => {
        if (params[index] !== undefined) {
          const cleanCol = col.replace(/[`'"]/g, "");
          record[cleanCol] = params[index];
        }
      });
    }

    // Add default timestamps
    record["created_at"] = new Date().toISOString();
    record["updated_at"] = new Date().toISOString();
    record["deleted_at"] = null;

    return record;
  }

  private applyWhereConditions(
    results: Record<string, string | number | boolean | null | Date>[],
    sql: string,
    params: (string | number | boolean | null)[],
  ): Record<string, string | number | boolean | null | Date>[] {
    return results.filter((record) =>
      this.matchesWhereCondition(record, sql, params),
    );
  }

  private matchesWhereCondition(
    record: Record<string, string | number | boolean | null | Date>,
    sql: string,
    params: (string | number | boolean | null)[],
  ): boolean {
    // Handle deleted_at IS NULL (active records) - most important filter
    if (sql.includes("deleted_at IS NULL") && record["deleted_at"] !== null) {
      return false;
    }

    // Parse the WHERE clause more carefully
    const lowerSql = sql.toLowerCase();
    let paramIndex = 0;

    // Extract conditions in order
    const conditions = [];
    if (lowerSql.includes("user_id = ?")) {
      conditions.push({
        type: "user_id",
        operator: "=",
        paramIndex: paramIndex++,
      });
    }
    if (lowerSql.includes("status = ?")) {
      conditions.push({
        type: "status",
        operator: "=",
        paramIndex: paramIndex++,
      });
    }
    if (lowerSql.includes("id = ?")) {
      conditions.push({ type: "id", operator: "=", paramIndex: paramIndex++ });
    }

    // Check each condition
    for (const condition of conditions) {
      if (condition.paramIndex >= params.length) continue;

      const paramValue = params[condition.paramIndex];
      const recordValue = record[condition.type];

      if (condition.operator === "=" && recordValue !== paramValue) {
        return false;
      }
    }

    // Handle MATCH/LIKE searches for title and description
    if (
      lowerSql.includes("match(") ||
      lowerSql.includes("title like ?") ||
      lowerSql.includes("description like ?")
    ) {
      // Find search terms (both direct and LIKE patterns)
      const searchTerms = params.filter((p) => typeof p === "string");
      let hasMatch = false;

      for (const term of searchTerms) {
        const searchValue = term.includes("%") ? term.replace(/%/g, "") : term;
        const searchLower = searchValue.toLowerCase();

        const titleValue = record["title"] as string | undefined;
        const descValue = record["description"] as string | undefined;
        const titleMatch = titleValue?.toLowerCase().includes(searchLower);
        const descMatch = descValue?.toLowerCase().includes(searchLower);

        if (titleMatch === true || descMatch === true) {
          hasMatch = true;
          break;
        }
      }

      // If this is an OR condition with MATCH/LIKE and we found no match, fail
      if (searchTerms.length > 0 && !hasMatch) {
        return false;
      }
    }

    // Handle label searches (JSON_CONTAINS equivalent)
    if (lowerSql.includes("json_contains")) {
      const labelParam = params.find(
        (p) => typeof p === "string" && p.startsWith("["),
      );
      if (labelParam !== undefined) {
        const searchLabels = JSON.parse(labelParam as string);
        const labelsValue = record["labels"];
        const recordLabels = Array.isArray(labelsValue)
          ? labelsValue
          : typeof labelsValue === "string"
            ? JSON.parse(labelsValue)
            : [];
        const hasLabel = searchLabels.some((label: string) =>
          recordLabels.includes(label),
        );
        if (hasLabel === false) return false;
      }
    }

    return true;
  }

  private extractSetValues(
    sql: string,
    params: (string | number | boolean | null)[],
  ): Record<string, string | number | boolean | null | Date> {
    // Simple SET extraction for UPDATE statements
    const updates: Record<string, string | number | boolean | null | Date> = {};

    // Extract SET clause
    const setMatch = sql.match(/set\s+(.*?)\s+where/i);
    if (setMatch?.[1] !== undefined) {
      const setPart = setMatch[1];
      const assignments = setPart.split(",");

      let paramIndex = 0;
      assignments.forEach((assignment) => {
        const [column] = assignment.split("=").map((s) => s.trim());
        if (column !== undefined && column !== "") {
          const cleanColumn = column.replace(/[`'"]/g, "");
          if (params[paramIndex] !== undefined) {
            const paramValue = params[paramIndex];
            if (paramValue !== undefined) {
              updates[cleanColumn] = paramValue;
            }
            paramIndex++;
          }
        }
      });
    }

    // Update timestamp
    updates["updated_at"] = new Date().toISOString();

    return updates;
  }
}
