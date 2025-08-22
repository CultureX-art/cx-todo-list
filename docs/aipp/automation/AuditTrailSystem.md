# AIPP Audit Trail System

## Overview
The AIPP Audit Trail System provides comprehensive tracking and versioning of all AI-assisted development activities, ensuring transparency, reproducibility, and accountability in the development process.

## Core Components

### 1. Prompt Versioning System

#### Prompt Template Storage
```typescript
// src/audit/prompt-versioning.ts
export interface PromptVersion {
  id: string;
  version: string;
  template: string;
  parameters: Record<string, any>;
  stage: 'prd' | 'thought-experiment' | 'interface' | 'unit-test' | 'implementation' | 'integration' | 'optimization';
  createdAt: Date;
  createdBy: string;
  hash: string;
}

export class PromptVersionManager {
  private versions: Map<string, PromptVersion[]> = new Map();

  savePromptVersion(
    templateName: string,
    template: string,
    parameters: Record<string, any>,
    stage: string,
    author: string
  ): PromptVersion {
    const version = this.generateVersion(templateName);
    const hash = this.generateHash(template, parameters);
    
    const promptVersion: PromptVersion = {
      id: `${templateName}-${version}`,
      version,
      template,
      parameters,
      stage: stage as any,
      createdAt: new Date(),
      createdBy: author,
      hash
    };

    if (!this.versions.has(templateName)) {
      this.versions.set(templateName, []);
    }
    
    this.versions.get(templateName)!.push(promptVersion);
    this.persistVersion(promptVersion);
    
    return promptVersion;
  }

  getPromptHistory(templateName: string): PromptVersion[] {
    return this.versions.get(templateName) || [];
  }

  getPromptByHash(hash: string): PromptVersion | undefined {
    for (const versions of this.versions.values()) {
      const found = versions.find(v => v.hash === hash);
      if (found) return found;
    }
    return undefined;
  }

  private generateVersion(templateName: string): string {
    const existing = this.versions.get(templateName) || [];
    return `v${existing.length + 1}.0.0`;
  }

  private generateHash(template: string, parameters: Record<string, any>): string {
    const crypto = require('crypto');
    const content = JSON.stringify({ template, parameters });
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private persistVersion(version: PromptVersion): void {
    const fs = require('fs');
    const path = `./audit/prompts/${version.id}.json`;
    fs.writeFileSync(path, JSON.stringify(version, null, 2));
  }
}
```

#### AI Model Response Tracking
```typescript
// src/audit/ai-response-tracker.ts
export interface AIResponse {
  id: string;
  promptHash: string;
  model: string;
  modelVersion: string;
  temperature: number;
  maxTokens: number;
  requestTimestamp: Date;
  responseTimestamp: Date;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  response: string;
  stage: string;
  correlationId: string;
  metadata: Record<string, any>;
}

export class AIResponseTracker {
  private responses: AIResponse[] = [];

  async trackRequest(
    promptHash: string,
    model: string,
    prompt: string,
    config: any,
    stage: string,
    correlationId: string
  ): Promise<string> {
    const requestId = this.generateRequestId();
    
    const response: Partial<AIResponse> = {
      id: requestId,
      promptHash,
      model,
      modelVersion: config.modelVersion || 'unknown',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 1000,
      requestTimestamp: new Date(),
      stage,
      correlationId,
      metadata: {
        promptLength: prompt.length,
        userAgent: process.env.USER_AGENT || 'aipp-system'
      }
    };

    this.responses.push(response as AIResponse);
    return requestId;
  }

  completeRequest(
    requestId: string,
    response: string,
    tokenUsage: any
  ): void {
    const index = this.responses.findIndex(r => r.id === requestId);
    if (index !== -1) {
      this.responses[index] = {
        ...this.responses[index],
        response,
        tokenUsage,
        responseTimestamp: new Date()
      };
      
      this.persistResponse(this.responses[index]);
    }
  }

  getResponsesByStage(stage: string): AIResponse[] {
    return this.responses.filter(r => r.stage === stage);
  }

  getResponsesByCorrelation(correlationId: string): AIResponse[] {
    return this.responses.filter(r => r.correlationId === correlationId);
  }

  generateUsageReport(timeRange: { start: Date; end: Date }): UsageReport {
    const relevantResponses = this.responses.filter(r => 
      r.requestTimestamp >= timeRange.start && 
      r.requestTimestamp <= timeRange.end
    );

    return {
      totalRequests: relevantResponses.length,
      totalTokens: relevantResponses.reduce((sum, r) => sum + r.tokenUsage.totalTokens, 0),
      averageResponseTime: this.calculateAverageResponseTime(relevantResponses),
      stageBreakdown: this.generateStageBreakdown(relevantResponses),
      modelBreakdown: this.generateModelBreakdown(relevantResponses)
    };
  }

  private generateRequestId(): string {
    return `ai-req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private persistResponse(response: AIResponse): void {
    const fs = require('fs');
    const path = `./audit/ai-responses/${response.id}.json`;
    fs.writeFileSync(path, JSON.stringify(response, null, 2));
  }

  private calculateAverageResponseTime(responses: AIResponse[]): number {
    if (responses.length === 0) return 0;
    
    const totalTime = responses.reduce((sum, r) => {
      if (r.responseTimestamp && r.requestTimestamp) {
        return sum + (r.responseTimestamp.getTime() - r.requestTimestamp.getTime());
      }
      return sum;
    }, 0);
    
    return totalTime / responses.length;
  }

  private generateStageBreakdown(responses: AIResponse[]): Record<string, number> {
    return responses.reduce((breakdown, r) => {
      breakdown[r.stage] = (breakdown[r.stage] || 0) + 1;
      return breakdown;
    }, {} as Record<string, number>);
  }

  private generateModelBreakdown(responses: AIResponse[]): Record<string, number> {
    return responses.reduce((breakdown, r) => {
      const key = `${r.model}-${r.modelVersion}`;
      breakdown[key] = (breakdown[key] || 0) + 1;
      return breakdown;
    }, {} as Record<string, number>);
  }
}

interface UsageReport {
  totalRequests: number;
  totalTokens: number;
  averageResponseTime: number;
  stageBreakdown: Record<string, number>;
  modelBreakdown: Record<string, number>;
}
```

### 2. Decision Log Database

#### Decision Record Schema
```sql
-- audit/schema/decisions.sql
CREATE TABLE IF NOT EXISTS decision_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_type VARCHAR(50) NOT NULL, -- 'architecture', 'technical', 'process'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    rationale TEXT NOT NULL,
    alternatives TEXT[], -- Array of alternative options considered
    consequences TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'proposed', -- 'proposed', 'accepted', 'superseded'
    stage INTEGER NOT NULL, -- AIPP stage (1-8)
    feature_id VARCHAR(100), -- Links to feature/story ID
    decision_date TIMESTAMP NOT NULL DEFAULT NOW(),
    superseded_by UUID REFERENCES decision_log(id),
    decided_by VARCHAR(100) NOT NULL,
    stakeholders TEXT[], -- Array of stakeholders involved
    tags TEXT[], -- Array of tags for categorization
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_decision_log_stage ON decision_log(stage);
CREATE INDEX idx_decision_log_feature ON decision_log(feature_id);
CREATE INDEX idx_decision_log_type ON decision_log(decision_type);
CREATE INDEX idx_decision_log_status ON decision_log(status);

-- Archive old decisions
CREATE TABLE decision_log_archive (LIKE decision_log INCLUDING ALL);
```

#### Decision Logger Implementation
```typescript
// src/audit/decision-logger.ts
export interface DecisionRecord {
  id?: string;
  decisionType: 'architecture' | 'technical' | 'process';
  title: string;
  description: string;
  rationale: string;
  alternatives: string[];
  consequences: string;
  status: 'proposed' | 'accepted' | 'superseded';
  stage: number;
  featureId?: string;
  decisionDate: Date;
  supersededBy?: string;
  decidedBy: string;
  stakeholders: string[];
  tags: string[];
  metadata?: Record<string, any>;
}

export class DecisionLogger {
  constructor(private db: Pool) {}

  async logDecision(decision: Omit<DecisionRecord, 'id'>): Promise<string> {
    const result = await this.db.query(`
      INSERT INTO decision_log 
      (decision_type, title, description, rationale, alternatives, consequences, 
       status, stage, feature_id, decided_by, stakeholders, tags, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [
      decision.decisionType,
      decision.title,
      decision.description,
      decision.rationale,
      decision.alternatives,
      decision.consequences,
      decision.status,
      decision.stage,
      decision.featureId,
      decision.decidedBy,
      decision.stakeholders,
      decision.tags,
      decision.metadata ? JSON.stringify(decision.metadata) : null
    ]);

    return result.rows[0].id;
  }

  async updateDecisionStatus(
    decisionId: string, 
    status: 'accepted' | 'superseded',
    supersededBy?: string
  ): Promise<void> {
    await this.db.query(`
      UPDATE decision_log 
      SET status = $1, superseded_by = $2, updated_at = NOW()
      WHERE id = $3
    `, [status, supersededBy, decisionId]);
  }

  async getDecisionsByStage(stage: number): Promise<DecisionRecord[]> {
    const result = await this.db.query(`
      SELECT * FROM decision_log 
      WHERE stage = $1 AND status != 'superseded'
      ORDER BY decision_date DESC
    `, [stage]);

    return result.rows;
  }

  async getDecisionsByFeature(featureId: string): Promise<DecisionRecord[]> {
    const result = await this.db.query(`
      SELECT * FROM decision_log 
      WHERE feature_id = $1 
      ORDER BY decision_date DESC
    `, [featureId]);

    return result.rows;
  }

  async generateDecisionReport(featureId?: string): Promise<string> {
    let query = `
      SELECT decision_type, COUNT(*) as count, 
             COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted
      FROM decision_log 
    `;
    
    const params: any[] = [];
    if (featureId) {
      query += ' WHERE feature_id = $1';
      params.push(featureId);
    }
    
    query += ' GROUP BY decision_type ORDER BY count DESC';

    const result = await this.db.query(query, params);
    
    return this.formatDecisionReport(result.rows, featureId);
  }

  private formatDecisionReport(data: any[], featureId?: string): string {
    const header = featureId ? 
      `# Decision Report for Feature: ${featureId}` : 
      '# Overall Decision Report';

    const breakdown = data.map(row => 
      `- **${row.decision_type}**: ${row.count} total (${row.accepted} accepted)`
    ).join('\n');

    return `${header}\n\n## Decision Breakdown\n${breakdown}`;
  }
}
```

### 3. Activity Timeline Tracking

#### Development Timeline Schema
```typescript
// src/audit/timeline-tracker.ts
export interface TimelineEvent {
  id: string;
  eventType: 'stage_start' | 'stage_complete' | 'decision_made' | 'code_generated' | 'test_created' | 'review_completed';
  stage: number;
  timestamp: Date;
  actor: 'human' | 'ai' | 'system';
  description: string;
  artifactType?: 'code' | 'test' | 'documentation' | 'configuration';
  artifactPath?: string;
  metadata: {
    correlationId: string;
    featureId: string;
    aiModel?: string;
    promptHash?: string;
    reviewerId?: string;
    linesOfCode?: number;
    testCount?: number;
  };
  relatedEvents: string[]; // IDs of related events
}

export class TimelineTracker {
  private events: TimelineEvent[] = [];

  logEvent(event: Omit<TimelineEvent, 'id' | 'timestamp' | 'relatedEvents'>): string {
    const eventId = this.generateEventId();
    
    const timelineEvent: TimelineEvent = {
      ...event,
      id: eventId,
      timestamp: new Date(),
      relatedEvents: []
    };

    this.events.push(timelineEvent);
    this.persistEvent(timelineEvent);
    
    return eventId;
  }

  linkEvents(eventId1: string, eventId2: string): void {
    const event1 = this.events.find(e => e.id === eventId1);
    const event2 = this.events.find(e => e.id === eventId2);
    
    if (event1 && event2) {
      event1.relatedEvents.push(eventId2);
      event2.relatedEvents.push(eventId1);
    }
  }

  getFeatureTimeline(featureId: string): TimelineEvent[] {
    return this.events
      .filter(e => e.metadata.featureId === featureId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  getStageTimeline(stage: number): TimelineEvent[] {
    return this.events
      .filter(e => e.stage === stage)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  generateVelocityReport(timeRange: { start: Date; end: Date }): VelocityReport {
    const relevantEvents = this.events.filter(e =>
      e.timestamp >= timeRange.start && 
      e.timestamp <= timeRange.end
    );

    return {
      totalEvents: relevantEvents.length,
      stageCompletions: this.countStageCompletions(relevantEvents),
      averageStageTime: this.calculateAverageStageTime(relevantEvents),
      aiVsHumanActivity: this.calculateActivityBreakdown(relevantEvents),
      featuresCompleted: this.countCompletedFeatures(relevantEvents)
    };
  }

  private generateEventId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private persistEvent(event: TimelineEvent): void {
    const fs = require('fs');
    const path = `./audit/timeline/${event.id}.json`;
    fs.writeFileSync(path, JSON.stringify(event, null, 2));
  }

  private countStageCompletions(events: TimelineEvent[]): Record<number, number> {
    return events
      .filter(e => e.eventType === 'stage_complete')
      .reduce((acc, e) => {
        acc[e.stage] = (acc[e.stage] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
  }

  private calculateAverageStageTime(events: TimelineEvent[]): Record<number, number> {
    const stageTimes: Record<number, number[]> = {};
    
    for (let stage = 1; stage <= 8; stage++) {
      const stageEvents = events.filter(e => e.stage === stage);
      const startEvents = stageEvents.filter(e => e.eventType === 'stage_start');
      const endEvents = stageEvents.filter(e => e.eventType === 'stage_complete');
      
      const times: number[] = [];
      for (const start of startEvents) {
        const correspondingEnd = endEvents.find(e => 
          e.metadata.featureId === start.metadata.featureId &&
          e.timestamp > start.timestamp
        );
        
        if (correspondingEnd) {
          times.push(correspondingEnd.timestamp.getTime() - start.timestamp.getTime());
        }
      }
      
      stageTimes[stage] = times;
    }

    // Convert to average hours
    const averages: Record<number, number> = {};
    for (const [stage, times] of Object.entries(stageTimes)) {
      if (times.length > 0) {
        const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
        averages[parseInt(stage)] = avgMs / (1000 * 60 * 60); // Convert to hours
      }
    }

    return averages;
  }

  private calculateActivityBreakdown(events: TimelineEvent[]): { ai: number; human: number; system: number } {
    return events.reduce((acc, e) => {
      acc[e.actor]++;
      return acc;
    }, { ai: 0, human: 0, system: 0 });
  }

  private countCompletedFeatures(events: TimelineEvent[]): number {
    const completedFeatures = new Set(
      events
        .filter(e => e.eventType === 'stage_complete' && e.stage === 8)
        .map(e => e.metadata.featureId)
    );
    
    return completedFeatures.size;
  }
}

interface VelocityReport {
  totalEvents: number;
  stageCompletions: Record<number, number>;
  averageStageTime: Record<number, number>;
  aiVsHumanActivity: { ai: number; human: number; system: number };
  featuresCompleted: number;
}
```

## Audit Dashboard Implementation

### Dashboard API
```typescript
// src/audit/dashboard-api.ts
export class AuditDashboard {
  constructor(
    private promptManager: PromptVersionManager,
    private responseTracker: AIResponseTracker,
    private decisionLogger: DecisionLogger,
    private timelineTracker: TimelineTracker
  ) {}

  async getDashboardData(featureId?: string): Promise<DashboardData> {
    const timeRange = this.getDefaultTimeRange();
    
    return {
      overview: await this.getOverviewStats(featureId, timeRange),
      aiUsage: this.responseTracker.generateUsageReport(timeRange),
      decisions: await this.decisionLogger.generateDecisionReport(featureId),
      velocity: this.timelineTracker.generateVelocityReport(timeRange),
      recentActivity: this.getRecentActivity(featureId),
      qualityMetrics: await this.getQualityMetrics(featureId)
    };
  }

  private async getOverviewStats(featureId?: string, timeRange: { start: Date; end: Date }) {
    const timeline = featureId ? 
      this.timelineTracker.getFeatureTimeline(featureId) :
      this.timelineTracker.getStageTimeline(1); // Get all stage 1 events as proxy for features

    return {
      totalFeatures: featureId ? 1 : this.countUniqueFeatures(timeline),
      completedStages: this.countCompletedStages(timeline),
      activeFeatures: this.countActiveFeatures(timeline),
      totalAiRequests: this.responseTracker.getResponsesByCorrelation('').length
    };
  }

  private getRecentActivity(featureId?: string): TimelineEvent[] {
    const allEvents = featureId ?
      this.timelineTracker.getFeatureTimeline(featureId) :
      this.timelineTracker.getStageTimeline(0); // Get all events

    return allEvents
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);
  }

  private async getQualityMetrics(featureId?: string) {
    // This would integrate with your testing and code quality tools
    return {
      testCoverage: 85.5,
      codeQuality: 'A',
      securityScore: 92,
      performanceScore: 88
    };
  }

  private getDefaultTimeRange(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30); // Last 30 days
    
    return { start, end };
  }

  private countUniqueFeatures(events: TimelineEvent[]): number {
    const features = new Set(events.map(e => e.metadata.featureId));
    return features.size;
  }

  private countCompletedStages(events: TimelineEvent[]): number {
    return events.filter(e => e.eventType === 'stage_complete').length;
  }

  private countActiveFeatures(events: TimelineEvent[]): number {
    const recentEvents = events.filter(e => {
      const daysSince = (Date.now() - e.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7; // Active in last 7 days
    });
    
    const activeFeatures = new Set(recentEvents.map(e => e.metadata.featureId));
    return activeFeatures.size;
  }
}

interface DashboardData {
  overview: {
    totalFeatures: number;
    completedStages: number;
    activeFeatures: number;
    totalAiRequests: number;
  };
  aiUsage: UsageReport;
  decisions: string;
  velocity: VelocityReport;
  recentActivity: TimelineEvent[];
  qualityMetrics: {
    testCoverage: number;
    codeQuality: string;
    securityScore: number;
    performanceScore: number;
  };
}
```

## CLI Commands for Audit Management

### Package.json Scripts
```json
{
  "scripts": {
    "audit:init": "node scripts/audit/init-audit-system.js",
    "audit:dashboard": "node scripts/audit/generate-dashboard.js",
    "audit:export": "node scripts/audit/export-audit-data.js",
    "audit:cleanup": "node scripts/audit/cleanup-old-records.js",
    "audit:report": "node scripts/audit/generate-report.js",
    "audit:validate": "node scripts/audit/validate-audit-integrity.js"
  }
}
```

### Report Generation Script
```typescript
// scripts/audit/generate-report.ts
import { AuditDashboard } from '../../src/audit/dashboard-api';

export async function generateAuditReport(featureId?: string, format: 'json' | 'html' | 'pdf' = 'html') {
  const dashboard = new AuditDashboard(
    new PromptVersionManager(),
    new AIResponseTracker(),
    new DecisionLogger(db),
    new TimelineTracker()
  );

  const data = await dashboard.getDashboardData(featureId);
  
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2);
    
    case 'html':
      return generateHtmlReport(data, featureId);
    
    case 'pdf':
      return await generatePdfReport(data, featureId);
  }
}

function generateHtmlReport(data: DashboardData, featureId?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>AIPP Audit Report ${featureId ? `- ${featureId}` : ''}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .timeline { border-left: 3px solid #007cba; padding-left: 20px; }
        .ai-event { color: #007cba; }
        .human-event { color: #28a745; }
        .system-event { color: #6c757d; }
    </style>
</head>
<body>
    <h1>AIPP Audit Report</h1>
    ${featureId ? `<h2>Feature: ${featureId}</h2>` : ''}
    
    <div class="metric">
        <h3>Overview</h3>
        <p>Total Features: ${data.overview.totalFeatures}</p>
        <p>Completed Stages: ${data.overview.completedStages}</p>
        <p>Active Features: ${data.overview.activeFeatures}</p>
        <p>AI Requests: ${data.overview.totalAiRequests}</p>
    </div>

    <div class="metric">
        <h3>AI Usage</h3>
        <p>Total Requests: ${data.aiUsage.totalRequests}</p>
        <p>Total Tokens: ${data.aiUsage.totalTokens.toLocaleString()}</p>
        <p>Avg Response Time: ${data.aiUsage.averageResponseTime.toFixed(2)}ms</p>
    </div>

    <div class="metric">
        <h3>Quality Metrics</h3>
        <p>Test Coverage: ${data.qualityMetrics.testCoverage}%</p>
        <p>Code Quality: ${data.qualityMetrics.codeQuality}</p>
        <p>Security Score: ${data.qualityMetrics.securityScore}</p>
        <p>Performance Score: ${data.qualityMetrics.performanceScore}</p>
    </div>

    <div class="metric timeline">
        <h3>Recent Activity</h3>
        ${data.recentActivity.map(event => `
            <div class="${event.actor}-event">
                <strong>${event.timestamp.toLocaleString()}</strong> - 
                Stage ${event.stage}: ${event.description}
                (${event.actor})
            </div>
        `).join('')}
    </div>
</body>
</html>
  `;
}

// CLI usage
if (require.main === module) {
  const featureId = process.argv[2];
  const format = process.argv[3] as 'json' | 'html' | 'pdf' || 'html';
  
  generateAuditReport(featureId, format)
    .then(report => {
      if (format === 'json') {
        console.log(report);
      } else {
        const fs = require('fs');
        const filename = `audit-report-${Date.now()}.${format}`;
        fs.writeFileSync(filename, report);
        console.log(`Report generated: ${filename}`);
      }
    })
    .catch(console.error);
}
```

This comprehensive audit trail system provides full transparency and accountability for AI-assisted development activities while enabling data-driven insights into the effectiveness of the AIPP process.