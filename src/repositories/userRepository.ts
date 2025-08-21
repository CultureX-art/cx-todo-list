import { User, UserAttributes, UserCreationAttributes } from '../models/User';

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await User.findOne({
        where: { email }
      });
      return user;
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error}`);
    }
  }

  async findById(userId: string): Promise<User | null> {
    try {
      const user = await User.findByPk(userId);
      return user;
    } catch (error) {
      throw new Error(`Failed to find user by ID: ${error}`);
    }
  }

  async create(userData: UserCreationAttributes): Promise<User> {
    try {
      const user = await User.create(userData);
      return user;
    } catch (error) {
      throw new Error(`Failed to create user: ${error}`);
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    try {
      await User.update(
        { lastLoginAt: new Date() },
        { where: { id: userId } }
      );
    } catch (error) {
      throw new Error(`Failed to update last login: ${error}`);
    }
  }
}

export const userRepository = new UserRepository();