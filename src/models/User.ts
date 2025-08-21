import { DataTypes, Model, Optional } from 'sequelize';

export interface UserAttributes {
  id: string;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'isActive' | 'createdAt' | 'updatedAt'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public passwordHash!: string;
  public firstName?: string;
  public lastName?: string;
  public isActive!: boolean;
  public lastLoginAt?: Date;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getFullName(): string {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }

  public toJSON(): Omit<UserAttributes, 'passwordHash'> {
    const values = Object.assign({}, this.get()) as any;
    delete values.passwordHash;
    return values;
  }
}

export const userSchema: any = {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
};

export const userConfig = {
  tableName: 'users',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['email'],
    },
  ],
};