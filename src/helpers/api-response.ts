export default class ApiResponse<T> {
  data: T | null;
  message?: string;
  success: boolean;

  constructor(data: T | null, success: boolean = true, message?: string) {
    this.data = data;
    this.message = message;
    this.success = success;
  }
}
