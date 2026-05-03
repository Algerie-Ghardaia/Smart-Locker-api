// =============================================================================
// src/types/express.d.ts
// AUGMENTATION EXPRESS — Types globaux pour Express
// =============================================================================
//
// Ce fichier étend l'interface Request d'Express pour y ajouter
// la propriété 'user' (utilisateur authentifié).
// =============================================================================

import { User as UserEntity } from '../modules/user/entities/user.entity';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User {
      /** Identifiant unique de l'utilisateur */
      id: string;
      
      /** Nom d'utilisateur */
      username: string;
      
      /** Rôle (admin, user, manager, etc.) */
      role: string;
    }

    interface Request {
      /** Utilisateur authentifié (ajouté par JwtAuthGuard) */
      user?: User;
    }
  }
}