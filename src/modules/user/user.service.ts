// =============================================================================
// src/modules/user/user.service.ts
// SERVICE UTILISATEURS — Logique métier
// =============================================================================
//
// Responsabilités :
//   - CRUD des utilisateurs (création, lecture, mise à jour)
//   - Recherche par id, username, email, ou identifiant mixte
//   - Hashage des mots de passe (bcrypt)
//   - Vérification d'unicité (username + email)
// =============================================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../../common/types/role.enum';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ---------------------------------------------------------------------------
  // Lecture
  // ---------------------------------------------------------------------------

  async findAll(): Promise<User[]> {
    return this.userRepo.find({
      select: [
        'id',
        'username',
        'email',
        'role',
        'phone',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { id },
      select: [
        'id',
        'username',
        'email',
        'role',
        'phone',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { username },
      select: ['id', 'username', 'email', 'password', 'role', 'isActive'],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { email },
      select: ['id', 'username', 'email', 'role', 'isActive'],
    });
  }

  /**
   * Recherche un utilisateur par username OU par email.
   * Utilisé par AuthService.login() pour permettre la connexion
   * avec l'un ou l'autre identifiant.
   * Inclut le password (nécessaire pour la vérification bcrypt).
   */
  async findByIdentifier(identifier: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: [{ username: identifier }, { email: identifier }],
      select: ['id', 'username', 'email', 'password', 'role', 'isActive'],
    });
  }

  // ---------------------------------------------------------------------------
  // Création
  // ---------------------------------------------------------------------------

  async create(dto: CreateUserDto): Promise<Partial<User>> {
    // Vérifier l'unicité
    const existing = await this.userRepo.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });

    if (existing) {
      throw new ConflictException('Username ou email déjà utilisé');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
      role: dto.role || Role.ADMIN,
      phone: dto.phone || null,
      isActive: true,
    });

    const savedUser = await this.userRepo.save(user);

    // Retourner sans le mot de passe
    return {
      id: savedUser.id,
      username: savedUser.username,
      email: savedUser.email,
      role: savedUser.role,
      phone: savedUser.phone,
      isActive: savedUser.isActive,
      createdAt: savedUser.createdAt,
      updatedAt: savedUser.updatedAt,
    };
  }

  // ---------------------------------------------------------------------------
  // Mise à jour
  // ---------------------------------------------------------------------------

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    Object.assign(user, dto);
    return this.userRepo.save(user);
  }
}
