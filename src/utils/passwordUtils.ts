import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hash(plainPassword: string): Promise<string> {
  if (!plainPassword) {
    throw new Error('Password is required');
  }

  try {
    return await bcrypt.hash(plainPassword, SALT_ROUNDS);
  } catch (error) {
    throw new Error('Failed to hash password');
  }
}

export async function verify(plainPassword: string, hashedPassword: string): Promise<boolean> {
  if (!plainPassword || !hashedPassword) {
    return false;
  }

  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    return false;
  }
}