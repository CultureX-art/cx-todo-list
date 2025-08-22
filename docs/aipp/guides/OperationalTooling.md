# Operational Tooling for AIPP

## Overview
Operational tooling ensures safe deployment, monitoring, and rollback of AI-generated code changes, especially when involving database schema modifications.

## Feature Flag Integration

### Core Principles
1. **Progressive Rollout**: Deploy changes to small user segments first
2. **Instant Rollback**: Ability to disable features without code deployment
3. **Data Safety**: Never corrupt existing data during feature toggles
4. **Observability**: Monitor feature performance and adoption

### Implementation Strategy

#### 1. Feature Flag Service Integration
```typescript
// Feature flag interface
export interface FeatureFlagService {
  isEnabled(flagKey: string, userId?: string): Promise<boolean>;
  getVariant(flagKey: string, userId?: string): Promise<string>;
  track(flagKey: string, userId: string, event: string): Promise<void>;
}

// Example implementation with LaunchDarkly
export class LaunchDarklyService implements FeatureFlagService {
  constructor(private client: LDClient) {}
  
  async isEnabled(flagKey: string, userId?: string): Promise<boolean> {
    const user = userId ? { key: userId } : { key: 'anonymous' };
    return await this.client.variation(flagKey, user, false);
  }
}
```

#### 2. Database Schema Evolution Patterns

##### Pattern A: Additive Changes (Recommended)
```sql
-- Stage 1: Add new columns as nullable
ALTER TABLE users ADD COLUMN preferences JSON NULL;
ALTER TABLE users ADD COLUMN settings_v2 JSON NULL;

-- Stage 2: Populate data gradually with feature flag
-- No schema rollback needed - just ignore columns
```

##### Pattern B: Parallel Schema Strategy
```sql
-- Create shadow tables for major restructuring
CREATE TABLE users_v2 (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  profile JSON NOT NULL, -- New structure
  created_at TIMESTAMP DEFAULT NOW()
);

-- Dual-write pattern during transition
-- Feature flag determines read source
```

##### Pattern C: Column Transformation
```sql
-- Phase 1: Add new column alongside old
ALTER TABLE orders ADD COLUMN amount_cents BIGINT NULL;

-- Phase 2: Populate new format (background job)
UPDATE orders SET amount_cents = ROUND(amount_dollars * 100) 
WHERE amount_cents IS NULL;

-- Phase 3: Feature flag switches to new column
-- Phase 4: Drop old column after validation
ALTER TABLE orders DROP COLUMN amount_dollars;
```

### 3. Service Layer Integration
```typescript
export class UserService {
  constructor(
    private featureFlags: FeatureFlagService,
    private userRepo: UserRepository,
    private userRepoV2: UserRepositoryV2
  ) {}

  async getUser(userId: string): Promise<User> {
    const useNewSchema = await this.featureFlags.isEnabled('user-schema-v2', userId);
    
    if (useNewSchema) {
      // Track usage for metrics
      await this.featureFlags.track('user-schema-v2', userId, 'read');
      return this.userRepoV2.findById(userId);
    }
    
    return this.userRepo.findById(userId);
  }

  async updateUser(userId: string, data: UserUpdateData): Promise<User> {
    const useNewSchema = await this.featureFlags.isEnabled('user-schema-v2', userId);
    
    if (useNewSchema) {
      // Dual write during transition period
      const result = await this.userRepoV2.update(userId, data);
      // Background sync to legacy schema for safety
      await this.syncToLegacySchema(userId, result);
      return result;
    }
    
    return this.userRepo.update(userId, data);
  }
}
```

## Rollback Procedures

### 1. Application-Level Rollback
```bash
# Instant rollback via feature flag
curl -X PATCH "https://api.launchdarkly.com/api/v2/flags/PROJECT/FEATURE_KEY" \
  -H "Authorization: api-key" \
  -d '{"op": "replace", "path": "/environments/production/on", "value": false}'
```

### 2. Database Migration Rollback Strategy
```sql
-- migrations/up/001_add_user_preferences.sql
ALTER TABLE users ADD COLUMN preferences JSON NULL;

-- migrations/down/001_add_user_preferences.sql  
ALTER TABLE users DROP COLUMN preferences;

-- Rollback command
npm run migrate:rollback -- --step=1
```

### 3. Data Recovery Procedures
```typescript
// Automated data consistency checker
export class DataIntegrityChecker {
  async validateUserData(userId: string): Promise<ValidationResult> {
    const legacyUser = await this.legacyRepo.findById(userId);
    const newUser = await this.newRepo.findById(userId);
    
    return {
      consistent: this.compareUsers(legacyUser, newUser),
      differences: this.findDifferences(legacyUser, newUser),
      recommendations: this.getRecoverySteps(legacyUser, newUser)
    };
  }
  
  async repairInconsistentData(userId: string): Promise<void> {
    const validation = await this.validateUserData(userId);
    if (!validation.consistent) {
      await this.executeRecoveryPlan(userId, validation.recommendations);
    }
  }
}
```

## Monitoring & Observability

### 1. Feature Flag Metrics
```typescript
// Track feature usage and performance
export class FeatureFlagMetrics {
  async recordFeatureUsage(flagKey: string, userId: string, latency: number) {
    await this.metrics.increment(`feature.${flagKey}.usage`);
    await this.metrics.timing(`feature.${flagKey}.latency`, latency);
    
    // Track user experience
    await this.metrics.increment(`feature.${flagKey}.user_count`);
  }
  
  async recordFeatureError(flagKey: string, error: Error) {
    await this.metrics.increment(`feature.${flagKey}.errors`);
    await this.logger.error('Feature flag error', {
      flagKey,
      error: error.message,
      stack: error.stack
    });
  }
}
```

### 2. Database Performance Monitoring
```typescript
// Monitor dual-write performance
export class DualWriteMonitor {
  async executeWithMonitoring<T>(
    operation: string,
    primaryWrite: () => Promise<T>,
    secondaryWrite: () => Promise<void>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Primary write (critical path)
      const result = await primaryWrite();
      
      // Secondary write (best effort)
      await secondaryWrite().catch(error => {
        this.logger.warn('Secondary write failed', { operation, error });
        this.metrics.increment(`dual_write.${operation}.secondary_failures`);
      });
      
      this.metrics.timing(`dual_write.${operation}.duration`, Date.now() - startTime);
      return result;
    } catch (error) {
      this.metrics.increment(`dual_write.${operation}.primary_failures`);
      throw error;
    }
  }
}
```

## Canary Deployment Strategy

### 1. Progressive Rollout Plan
```yaml
# Feature flag configuration
feature_rollout:
  user-schema-v2:
    stages:
      - name: "internal_users"
        percentage: 100
        criteria: { userType: "internal" }
      - name: "beta_users" 
        percentage: 100
        criteria: { betaProgram: true }
      - name: "canary"
        percentage: 5
        criteria: { random: true }
      - name: "full_rollout"
        percentage: 100
        criteria: {}
    
    success_criteria:
      error_rate: "<1%"
      latency_p95: "<200ms"
      user_satisfaction: ">4.5"
```

### 2. Automated Rollback Triggers
```typescript
export class AutomaticRollbackService {
  async monitorFeatureHealth(flagKey: string) {
    const metrics = await this.getFeatureMetrics(flagKey);
    
    const shouldRollback = 
      metrics.errorRate > 0.01 || // >1% error rate
      metrics.latencyP95 > 500 ||  // >500ms latency
      metrics.userComplaints > 10; // >10 user complaints
    
    if (shouldRollback) {
      await this.emergencyRollback(flagKey);
      await this.notifyTeam('Emergency rollback executed', { flagKey, metrics });
    }
  }
  
  async emergencyRollback(flagKey: string) {
    await this.featureFlags.disableFlag(flagKey);
    await this.logger.error('Emergency rollback triggered', { flagKey });
    await this.metrics.increment(`rollback.emergency.${flagKey}`);
  }
}
```

## Integration with AIPP Workflow

### Stage 8 Enhancement: Production Hardening
When AI suggests changes involving data models:

1. **Risk Assessment**: Classify changes as additive/breaking/major restructuring
2. **Migration Strategy**: Choose appropriate schema evolution pattern  
3. **Feature Flag Design**: Plan progressive rollout with monitoring
4. **Rollback Plan**: Document recovery procedures
5. **Monitoring Setup**: Configure alerts and success metrics

### Template Updates Required
- Update `PRD.template.md` to include operational requirements
- Enhance `ADR.template.md` with rollback planning section
- Add operational checklist to `ReviewerChecklist.md`

This operational framework ensures AI-generated changes can be deployed safely with confidence, even when involving complex data model modifications.