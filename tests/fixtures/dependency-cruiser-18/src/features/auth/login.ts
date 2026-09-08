import { normalizeUser } from './utils';
import { get } from '../../shared/http';

export const login = (name: string): string => get(normalizeUser(name));
