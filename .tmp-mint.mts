import { encode } from "next-auth/jwt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });
const user = await p.user.findUniqueOrThrow({ where: { email: "senkcsani@gmail.com" } });
// Pick this user's project with the most signals so the feed has content.
const products = await p.product.findMany({
  where: { userId: user.id, archivedAt: null, sources: { some: { selected: true } } },
  select: { id: true, name: true, sources: { select: { _count: { select: { signals: true } } } } },
});
const ranked = products
  .map((pr) => ({ id: pr.id, name: pr.name, signals: pr.sources.reduce((s, x) => s + x._count.signals, 0) }))
  .sort((a, b) => b.signals - a.signals);
const cookieName = "authjs.session-token";
const token = await encode({
  token: { sub: user.id, id: user.id, email: user.email, name: user.name ?? undefined },
  secret: process.env.AUTH_SECRET!,
  salt: cookieName,
});
console.log(JSON.stringify({ token, projects: ranked.slice(0, 3) }));
await p.$disconnect();
