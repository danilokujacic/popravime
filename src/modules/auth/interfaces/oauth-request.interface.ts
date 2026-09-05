import { Request } from 'express';
import { OAuthProfile } from '../../users/users.types';

export interface OAuthRequest extends Request {
  user: OAuthProfile;
}
