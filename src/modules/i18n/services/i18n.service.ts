import { Injectable, OnModuleInit } from "@nestjs/common";
import * as fs from "fs/promises";
import * as path from "path";

@Injectable()
export class I18nService implements OnModuleInit {
  private translations: Record<string, any> = {};

  async onModuleInit() {
    await this.loadTranslations();
  }

  private async loadTranslations() {
    const localesDir = path.join(process.cwd(), "locales");
    const languages = ["uz", "ru"];

    for (const lang of languages) {
      try {
        const filePath = path.join(localesDir, `${lang}.json`);
        const content = await fs.readFile(filePath, "utf-8");
        this.translations[lang] = JSON.parse(content);
      } catch (error) {
        console.warn(`Failed to load ${lang} translations:`, error.message);
        this.translations[lang] = {};
      }
    }

    console.log("Translations loaded");
  }

  t(key: string, lang: string = "uz", params?: Record<string, any>): string {
    const keys = key.split(".");
    let value = this.translations[lang];

    for (const k of keys) {
      if (value && typeof value === "object") {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    if (typeof value !== "string") {
      return key;
    }

    // Replace placeholders like {{name}}
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? params[paramKey] : match;
      });
    }

    return value;
  }
}
