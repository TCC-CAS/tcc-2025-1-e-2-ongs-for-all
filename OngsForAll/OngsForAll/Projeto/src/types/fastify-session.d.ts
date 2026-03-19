// src/types/fastify-session.d.ts
import '@fastify/session'

declare module "fastify" {
  interface Session {
    user?: {
      id: number;
      nome: string;
      email: string;
      tipo: "usuario" | "ong";
      ong_id?: number; // opcional
    };
  }

  interface FastifyRequest {
    session: Session
  }
}
