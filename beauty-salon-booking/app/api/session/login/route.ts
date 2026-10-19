import { startSession } from '@/lib/server/auth-route';

export const POST = (req: Request) => startSession(req, '/auth/login');
