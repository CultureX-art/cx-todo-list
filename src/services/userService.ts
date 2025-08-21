import { userRepository } from '../repositories/userRepository';
import { taskRepository } from '../repositories/taskRepository';

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  taskStats?: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    overdueTasks: number;
  };
}

export class UserService {
  async getCurrentUser(userId: string): Promise<UserProfile> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get task statistics
    const taskStats = await taskRepository.getTaskStats(userId);

    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.getFullName(),
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      taskStats: {
        totalTasks: taskStats.total,
        completedTasks: taskStats.completed,
        pendingTasks: taskStats.pending + taskStats.inProgress,
        overdueTasks: taskStats.overdue,
      },
    };

    return userProfile;
  }
}

export const userService = new UserService();