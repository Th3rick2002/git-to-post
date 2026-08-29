export function ownerFromIdentity(
  identity: { tokenIdentifier: string } | null,
  ownerTokenIdentifier?: string,
): string | undefined {
  return identity?.tokenIdentifier || ownerTokenIdentifier;
}
