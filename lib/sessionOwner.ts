type SessionUser = {
  id?: string;
  email?: string | null;
};

export function ownerTokenFromSession(
  session: { user?: SessionUser } | null | undefined,
): string | undefined {
  return session?.user?.id || session?.user?.email || undefined;
}
