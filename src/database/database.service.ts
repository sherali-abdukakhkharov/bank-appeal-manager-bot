import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import knex, { Knex } from "knex";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private knexInstance: Knex;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const config = this.configService.get("database");

    this.knexInstance = knex({
      client: "pg",
      connection: {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.name,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
      },
      pool: {
        min: 2,
        max: 10,
      },
      migrations: {
        directory: "./src/database/migrations",
        extension: "ts",
      },
      seeds: {
        directory: "./src/database/seeds",
        extension: "ts",
      },
    });

    console.log("Database connection established");
  }

  async onModuleDestroy() {
    await this.knexInstance.destroy();
    console.log("Database connection closed");
  }

  get knex(): Knex {
    return this.knexInstance;
  }
}
