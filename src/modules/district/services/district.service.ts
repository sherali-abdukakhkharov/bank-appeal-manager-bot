import { Injectable } from "@nestjs/common";
import { DistrictRepository } from "../repositories/district.repository";
import {
  District,
  GovernmentOrganization,
} from "../interfaces/district.interface";

@Injectable()
export class DistrictService {
  constructor(private districtRepository: DistrictRepository) {}

  async getAllDistricts(): Promise<District[]> {
    return await this.districtRepository.getAllDistricts();
  }

  async findDistrictById(id: number): Promise<District | null> {
    return await this.districtRepository.findDistrictById(id);
  }

  async getCentralDistrict(): Promise<District | null> {
    return await this.districtRepository.getCentralDistrict();
  }

  async getAllGovernmentOrganizations(): Promise<GovernmentOrganization[]> {
    return await this.districtRepository.getAllGovernmentOrganizations();
  }

  async findGovOrgById(id: number): Promise<GovernmentOrganization | null> {
    return await this.districtRepository.findGovOrgById(id);
  }

  async validateMFO(mfoCode: string, districtId: number): Promise<boolean> {
    return await this.districtRepository.validateMFO(mfoCode, districtId);
  }
}
