export interface WordPressUserService {
    getMe(token: string): Promise<any>;
}
  