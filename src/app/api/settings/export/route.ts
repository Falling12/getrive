import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await requireSession();
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) {
    return new Response("Missing projectId", { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { id: projectId, userId: session.user.id },
    include: {
      sources: {
        include: { signals: true },
      },
      trackedLinks: true,
      signups: true,
    },
  });
  if (!product) {
    return new Response("Not found", { status: 404 });
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    account: { email: session.user.email },
    product,
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="getrive-export-${Date.now()}.json"`,
    },
  });
}
