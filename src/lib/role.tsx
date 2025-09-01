// src/lib/role.tsx
'use client';

import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useEffect, useState } from 'react';

/** All the roles your app supports (plus ‘anon’ for a visitor) */
export type AppRole =
  | 'anon'
  | 'client'        // CL-
  | 'trainer'       // ST-
  | 'va-training'   // VA-T- (in academy)
  | 'va'            // VA-A- (active)
  | 'coach'         // CS-
  | 'ptsi-intern'   // PTSI-INT-
  | 'owner'         // MG-
  | 'admin'        // PTSI-
  | 'closer'        // CL- (sales)
  | 'front-desk';  // FD-

/**
 * Hook that fetches the current user's role & badge from your profiles table.
 */
export function useRole() {
  const session  = useSession();
  const supabase = useSupabaseClient();

  const [role,    setRole]    = useState<AppRole>('anon');
  const [badge,   setBadge]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role,badge_id')
          .or(`id.eq.${session.user.id},email.eq.${session.user.email}`)
          .maybeSingle();
        if (!error && data && data.role) {
          setRole(data.role as AppRole);
          setBadge(data.badge_id);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [session, supabase]);

  return { loading, role, badge };
}

/**
 * Renders children only when the current role is in `allow`.
 */
export function Show({
  allow,
  children,
}: {
  allow: AppRole[];
  children: React.ReactNode;
}) {
  const { loading, role } = useRole();
  if (loading) return null;
  return allow.includes(role) ? <>{children}</> : null;
}
