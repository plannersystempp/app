export function ehPlanoEnterprise(nomePlano?: string | null): boolean {
  return (nomePlano || '').toLowerCase().includes('enterprise');
}
