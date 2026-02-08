import jwt from 'jsonwebtoken';

// Remove fallback de desenvolvimento para garantir segurança em produção
const JWT_SECRET = process.env.JWT_SECRET;

export const signToken = (payload: object) => {
  if (!JWT_SECRET) {
      throw new Error("CRÍTICO: JWT_SECRET não configurado nas variáveis de ambiente do Netlify.");
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
};

export const verifyToken = (authHeader?: string) => {
  if (!authHeader || !JWT_SECRET) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    // Token inválido ou expirado
    return null;
  }
};
