"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import NextError from "next/error";

// App Router's top-level error boundary — replaces the entire root layout
// (including <html>/<body>) when an error escapes every nested error.tsx, so
// it must render its own document shell. This is the one place Sentry's
// Next.js SDK can't auto-instrument, hence the manual captureException call.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
