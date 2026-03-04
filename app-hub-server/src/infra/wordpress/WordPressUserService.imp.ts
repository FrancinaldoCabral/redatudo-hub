import { WordPressUserService } from '../../domain/services/WordPressUserService';
import { getMe } from '../../services/wordpress.service'; // seu código atual

export class WordPressUserServiceImp implements WordPressUserService {
  async getMe(token: string): Promise<any> {
    return getMe(token);
  }
}
