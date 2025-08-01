import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, jsonb, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const floorPlans = pgTable("floor_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  fileType: text("file_type").notNull(), // 'dxf', 'dwg', 'pdf', 'image'
  fileContent: text("file_content").notNull(),
  processingStatus: text("processing_status").notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  geometryData: jsonb("geometry_data"), // Parsed CAD geometry
  spaceAnalysis: jsonb("space_analysis"), // Area calculations and metrics
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ilotLayouts = pgTable("ilot_layouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  floorPlanId: varchar("floor_plan_id").notNull(),
  name: text("name").notNull(),
  densityProfile: integer("density_profile").notNull(), // 10, 25, 30, 35
  corridorWidth: real("corridor_width").notNull().default(120), // in cm
  minClearance: real("min_clearance").notNull().default(80), // in cm
  algorithm: text("algorithm").notNull().default('intelligent'), // 'intelligent', 'grid', 'genetic', 'annealing'
  ilots: jsonb("ilots").notNull(), // Array of ilot objects
  corridors: jsonb("corridors").notNull(), // Array of corridor objects
  analytics: jsonb("analytics"), // Performance metrics
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectExports = pgTable("project_exports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  layoutId: varchar("layout_id").notNull(),
  exportType: text("export_type").notNull(), // 'pdf', 'dxf', 'png', 'svg'
  exportData: text("export_data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertFloorPlanSchema = createInsertSchema(floorPlans).pick({
  name: true,
  originalFileName: true,
  fileType: true,
  fileContent: true,
});

export const insertIlotLayoutSchema = createInsertSchema(ilotLayouts).pick({
  floorPlanId: true,
  name: true,
  densityProfile: true,
  corridorWidth: true,
  minClearance: true,
  algorithm: true,
  ilots: true,
  corridors: true,
  analytics: true,
});

export const insertProjectExportSchema = createInsertSchema(projectExports).pick({
  layoutId: true,
  exportType: true,
  exportData: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertFloorPlan = z.infer<typeof insertFloorPlanSchema>;
export type FloorPlan = typeof floorPlans.$inferSelect;

export type InsertIlotLayout = z.infer<typeof insertIlotLayoutSchema>;
export type IlotLayout = typeof ilotLayouts.$inferSelect;

export type InsertProjectExport = z.infer<typeof insertProjectExportSchema>;
export type ProjectExport = typeof projectExports.$inferSelect;

// Geometry types
export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  type: 'wall';
  points: [Point, Point];
  thickness: number;
  layer?: string;
}

export interface Door {
  id: string;
  type: 'door';
  center: Point;
  radius: number;
  layer?: string;
}

export interface Window {
  id: string;
  type: 'window';
  bounds: Rectangle;
  layer?: string;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RestrictedArea {
  id: string;
  type: 'restricted';
  bounds: Rectangle;
  layer?: string;
}

export interface Ilot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number; // in m²
  type: 'small' | 'medium' | 'large' | 'xlarge';
}

export interface Corridor {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  type: 'horizontal' | 'vertical';
}

export interface ProcessedFloorPlan {
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  restrictedAreas: RestrictedArea[];
  spaceAnalysis: SpaceAnalysis;
  bounds: Bounds;
}

export interface SpaceAnalysis {
  totalArea: number; // m²
  usableArea: number; // m²
  wallArea: number; // m²
  efficiency: number; // percentage
  bounds: Bounds;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface LayoutAnalytics {
  totalIlots: number;
  totalArea: number;
  avgIlotSize: number;
  corridorLength: number;
  spaceEfficiency: number;
  densityAchieved: number;
  algorithm?: string;
}
