import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, index, serial } from "drizzle-orm/pg-core";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";

// ===== 系统表（必须保留，禁止删除，否则迁移报错） =====
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// ===== 业务表 1：采集的资讯条目（数据资产情报数据库核心表） =====
export const newsItems = pgTable(
  "news_items",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 500 }).notNull(),
    summary: text("summary"),
    content: text("content"),
    source_name: varchar("source_name", { length: 128 }),
    source_url: text("source_url"),
    publish_time: timestamp("publish_time", { withTimezone: true }),
    // 六维度分类：政府行动 / 企业行动 / 数商行动 / 金融行动 / 研学行动 / 联盟行动
    category: varchar("category", { length: 32 }),
    keywords: jsonb("keywords"),
    // 留档溯源
    crawl_time: timestamp("crawl_time", { withTimezone: true }).defaultNow().notNull(),
    original_title: text("original_title"),
    original_summary: text("original_summary"),
    // 状态流转：pending 待处理 / classified 已分类 / archived 已归档 / adopted 已采用
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    issue_number: integer("issue_number"),
    is_filtered: boolean("is_filtered").default(false).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("news_items_source_url_idx").on(table.source_url),
    index("news_items_category_idx").on(table.category),
    index("news_items_publish_time_idx").on(table.publish_time),
    index("news_items_status_idx").on(table.status),
  ]
);

// ===== 业务表 2：生成的周讯文稿期数 =====
export const newsletters = pgTable(
  "newsletters",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    issue_number: integer("issue_number").notNull(),
    issue_title: varchar("issue_title", { length: 256 }).notNull(),
    editor_note: text("editor_note"),
    // 六维度正文（JSON：{政府行动: "...", 企业行动: "..."}）
    sections: jsonb("sections"),
    content: text("content"),
    generated_at: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
    start_date: timestamp("start_date", { withTimezone: true }),
    end_date: timestamp("end_date", { withTimezone: true }),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("newsletters_issue_number_idx").on(table.issue_number),
    index("newsletters_generated_at_idx").on(table.generated_at),
  ]
);

// ===== 业务表 3：网页自助管理的信息源（采集信源库） =====
export const sources = pgTable(
  "sources",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 128 }).notNull(),
    url: text("url").notNull(),
    // 采集方式：rss / json / html（对齐 crawler 的 SourceConfig.type）
    type: varchar("type", { length: 16 }).notNull().default("html"),
    // 六维度分类提示：政府行动 / 企业行动 / 数商行动 / 金融行动 / 研学行动 / 联盟行动
    category: varchar("category", { length: 32 }),
    // 是否启用采集
    enabled: boolean("enabled").notNull().default(true),
    note: text("note"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("sources_enabled_idx").on(table.enabled),
    index("sources_category_idx").on(table.category),
  ]
);

const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({ coerce: { date: true } });

export const insertNewsItemSchema = createCoercedInsertSchema(newsItems);
export type NewsItem = typeof newsItems.$inferSelect;
export type InsertNewsItem = z.infer<typeof insertNewsItemSchema>;

export const insertNewsletterSchema = createCoercedInsertSchema(newsletters);
export type Newsletter = typeof newsletters.$inferSelect;
export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;

export const insertSourceSchema = createCoercedInsertSchema(sources);
export type Source = typeof sources.$inferSelect;
export type InsertSource = z.infer<typeof insertSourceSchema>;