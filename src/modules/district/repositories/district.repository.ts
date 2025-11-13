import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../database/database.service";
import {
  District,
  GovernmentOrganization,
  MFONumber,
} from "../interfaces/district.interface";

@Injectable()
export class DistrictRepository {
  constructor(private databaseService: DatabaseService) {}

  get db() {
    return this.databaseService.knex;
  }

  async getAllDistricts(): Promise<District[]> {
    return await this.db("districts").select("*").orderBy("name_uz", "asc");
  }

  async findDistrictById(id: number): Promise<District | null> {
    const district = await this.db("districts").where("id", id).first();
    return district || null;
  }

  async getCentralDistrict(): Promise<District | null> {
    const district = await this.db("districts")
      .where("is_central", true)
      .first();
    return district || null;
  }

  async getCentralDistrictOnly(): Promise<District[]> {
    return await this.db("districts")
      .where("is_central", true)
      .select("*")
      .orderBy("name_uz", "asc");
  }

  async getNonCentralDistricts(): Promise<District[]> {
    return await this.db("districts")
      .where("is_central", false)
      .select("*")
      .orderBy("name_uz", "asc");
  }

  async getAllGovernmentOrganizations(): Promise<GovernmentOrganization[]> {
    return await this.db("government_organizations")
      .select("*")
      .orderBy("name_uz", "asc");
  }

  async findGovOrgById(id: number): Promise<GovernmentOrganization | null> {
    const org = await this.db("government_organizations")
      .where("id", id)
      .first();
    return org || null;
  }

  async validateMFO(mfoCode: string, districtId: number): Promise<boolean> {
    const mfo = await this.db("mfo_numbers")
      .where("mfo_code", mfoCode)
      .where("district_id", districtId)
      .first();

    return !!mfo;
  }
}
