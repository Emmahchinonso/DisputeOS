'use client';

import Link from 'next/link';
import { Button } from '@/app/dashboard/components/ui/ui';

// Shown when PayPal can't be reached or rejects the request while loading the dispute.
export default function DisputeError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-lg p-8 text-center font-paypal">
      <div className="rounded-lg border border-pp-border bg-pp-surface p-8">
        <h1 className="text-2xl font-semibold text-pp-navy">We couldn&apos;t load this dispute</h1>
        <p className="mt-2 text-[15px] text-pp-muted">PayPal didn&apos;t return it. Check the dispute ID and the API credentials.</p>
        {/* Production builds replace error.message with a generic React text; the digest matches the server log. */}
        {error.digest && <p className="mt-4 font-mono text-xs text-pp-muted">Reference: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/dashboard" className="inline-flex h-10 items-center px-5 font-semibold text-pp-blue">
            ← Back to dashboard
          </Link>
          <Button variant="primary" onClick={retry}>
            Try again
          </Button>
        </div>
      </div>
    </main>
  );
}
