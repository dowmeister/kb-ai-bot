export class ApiService {
  private baseUrl = '/api'; // Adjust to match your API server

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      // Mock response for demo - remove in production
      return {
        data: [] as T,
        message: 'Mock data loaded',
        success: true
      };
    }
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      return {
        data: null as T,
        message: 'Error occurred',
        success: false
      };
    }
  }
}

export const apiService = new ApiService();