import jwt from "jsonwebtoken";

export function authRequired(req, res, next) {
  try {
    console.log('🔐 [AUTH] Headers recebidos:', {
      authorization: req.headers["authorization"],
      Authorization: req.headers["Authorization"],
      allHeaders: Object.keys(req.headers)
    });
    
    const header = req.headers["authorization"] || req.headers["Authorization"];
    console.log('🔐 [AUTH] Header authorization:', header);
    
    const bearer = header && header.startsWith("Bearer ") ? header.slice(7) : null;
    console.log('🔐 [AUTH] Token extraído:', bearer ? bearer.substring(0, 20) + '...' : 'null');
    
    const token = bearer || req.cookies?.token;

    if (!token) {
      console.log('❌ [AUTH] Token não encontrado');
      return res.status(401).json({ error: "unauthorized" });
    }

    const secret = process.env.JWT_SECRET || "dev_secret_change_me";
    const payload = jwt.verify(token, secret);
    
    console.log('✅ [AUTH] Token válido para usuário:', payload.email);

    // Only expose minimal identity
    req.user = { _id: payload._id, email: payload.email, plan: payload.plan };
    next();
  } catch (err) {
    console.log('❌ [AUTH] Erro ao validar token:', err.message);
    return res.status(401).json({ error: "invalid_token" });
  }
}
