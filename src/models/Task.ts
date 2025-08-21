import { DataTypes, Model, Optional, Op } from 'sequelize';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskAttributes {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  labels: string[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskCreationAttributes extends Optional<TaskAttributes, 'id' | 'status' | 'priority' | 'labels' | 'isDeleted' | 'createdAt' | 'updatedAt'> {}

export class Task extends Model<TaskAttributes, TaskCreationAttributes> implements TaskAttributes {
  public id!: string;
  public userId!: string;
  public title!: string;
  public description?: string;
  public status!: TaskStatus;
  public priority!: TaskPriority;
  public dueDate?: Date;
  public labels!: string[];
  public isDeleted!: boolean;
  public deletedAt?: Date;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public isOverdue(): boolean {
    if (!this.dueDate) return false;
    return new Date() > this.dueDate && this.status !== 'completed';
  }

  public markCompleted(): void {
    this.status = 'completed';
  }
}

export const taskSchema: any = {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
    defaultValue: 'pending',
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium',
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  labels: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isValidLabels(value: string[]) {
        if (!Array.isArray(value)) {
          throw new Error('Labels must be an array');
        }
        if (value.length > 10) {
          throw new Error('Maximum 10 labels allowed');
        }
      },
    },
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
};

export const taskConfig: any = {
  tableName: 'tasks',
  timestamps: true,
  paranoid: true,
  deletedAt: 'deletedAt',
  indexes: [
    {
      fields: ['userId'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['dueDate'],
    },
  ],
  scopes: {
    active: {
      where: {
        isDeleted: false,
      },
    },
    byStatus: (status: TaskStatus) => ({
      where: {
        status,
      },
    }),
    overdue: {
      where: {
        dueDate: {
          [Op.lt]: new Date(),
        },
        status: {
          [Op.ne]: 'completed',
        },
      },
    },
  },
};