// Helper pour extraire le message d'une erreur inconnue
export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);