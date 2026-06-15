import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { login } from '../services/auth.js';
import { Role } from '../types/index.js';

const router = Router();

const loginSchema = z.object({
  role: z.enum(['resident', 'doctor', 'admin']),
  identifier: z.string().min(1, '请输入账号'),
  password: z.string().min(1, '请输入密码'),
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await login(body.role as Role, body.identifier, body.password);
    if (!result) {
      return res.json({ code: 401, message: '账号或密码错误，或角色不匹配' });
    }
    res.json({ code: 0, message: '登录成功', data: result });
  } catch (e) {
    res.status(400).json({ code: 400, message: (e as Error).message });
  }
});

router.post('/demo-login', (req: Request, res: Response) => {
  const { role } = req.body || {};
  const demos: Record<string, { identifier: string; password: string; name: string }> = {
    resident: { identifier: '110101198001011234', password: 'password', name: '张三' },
    doctor: { identifier: 'EMP001', password: 'password', name: '张医生' },
    admin: { identifier: 'admin', password: 'password', name: '系统管理员' },
  };
  const d = demos[role as string] || demos.admin;
  res.json({ code: 0, message: '演示账号', data: { ...d, role } });
});

export default router;
