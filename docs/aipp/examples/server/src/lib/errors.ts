export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}
export class SystemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SystemError";
  }
}
