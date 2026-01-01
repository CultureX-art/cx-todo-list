export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'archived';

export interface Task {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: Date | null;
  labels: string[];
  createdAt: Date;
  updatedAt: Date;
}