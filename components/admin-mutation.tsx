'use client';

import { useActionState } from 'react';
import type { AdminResult } from '@/lib/admin-actions';

export function AdminMutation({action, children, className}: {
  action: (state: AdminResult, data: FormData) => Promise<AdminResult>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, submit, pending] = useActionState(action, {});
  return <form action={submit} className={className}>
    <fieldset className="admin-mutation-fields" disabled={pending} aria-busy={pending}>{children}</fieldset>
    {pending && <p className="admin-feedback" role="status">Zapisywanie…</p>}
    {!pending && state.error && <p className="admin-feedback admin-feedback-error" role="alert">{state.error}</p>}
    {!pending && state.success && <p className="admin-feedback admin-feedback-success" role="status">{state.success}</p>}
  </form>;
}
