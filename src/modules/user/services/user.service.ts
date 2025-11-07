import { Injectable } from "@nestjs/common";
import { UserRepository } from "../repositories/user.repository";
import {
  User,
  CreateUserDto,
  UserBusinessInfo,
  UserGovernmentInfo,
} from "../interfaces/user.interface";

@Injectable()
export class UserService {
  constructor(private userRepository: UserRepository) {}

  async findByTelegramId(telegramId: number): Promise<User | null> {
    return await this.userRepository.findByTelegramId(telegramId);
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    return await this.userRepository.create(dto);
  }

  async updateUser(userId: number, dto: Partial<CreateUserDto>): Promise<User> {
    return await this.userRepository.update(userId, dto);
  }

  async createBusinessUser(
    userDto: CreateUserDto,
    businessInfo: Omit<UserBusinessInfo, "user_id">,
  ): Promise<User> {
    const user = await this.userRepository.create(userDto);

    await this.userRepository.createBusinessInfo({
      user_id: user.id,
      ...businessInfo,
    });

    return user;
  }

  async updateBusinessUser(
    userId: number,
    userDto: Partial<CreateUserDto>,
    businessInfo: Omit<UserBusinessInfo, "user_id">,
  ): Promise<User> {
    const user = await this.userRepository.update(userId, userDto);

    await this.userRepository.upsertBusinessInfo({
      user_id: userId,
      ...businessInfo,
    });

    return user;
  }

  async createGovernmentUser(
    userDto: CreateUserDto,
    govInfo: Omit<UserGovernmentInfo, "user_id">,
  ): Promise<User> {
    const user = await this.userRepository.create(userDto);

    await this.userRepository.createGovernmentInfo({
      user_id: user.id,
      ...govInfo,
    });

    return user;
  }

  async updateGovernmentUser(
    userId: number,
    userDto: Partial<CreateUserDto>,
    govInfo: Omit<UserGovernmentInfo, "user_id">,
  ): Promise<User> {
    const user = await this.userRepository.update(userId, userDto);

    await this.userRepository.upsertGovernmentInfo({
      user_id: userId,
      ...govInfo,
    });

    return user;
  }

  async findModeratorsByDistrict(districtId: number): Promise<User[]> {
    return await this.userRepository.findModeratorsByDistrict(districtId);
  }

  async getModeratorsByDistrict(districtId: number): Promise<User[]> {
    return await this.userRepository.findModeratorsByDistrict(districtId);
  }

  async findById(id: number): Promise<User | null> {
    return await this.userRepository.findById(id);
  }

  async getBusinessInfo(userId: number): Promise<UserBusinessInfo | null> {
    return await this.userRepository.getBusinessInfo(userId);
  }

  async resetUserRole(userId: number): Promise<void> {
    return await this.userRepository.resetUserRole(userId);
  }
}
