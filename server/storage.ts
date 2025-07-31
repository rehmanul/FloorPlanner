import { 
  type User, 
  type InsertUser,
  type FloorPlan,
  type InsertFloorPlan,
  type IlotLayout,
  type InsertIlotLayout,
  type ProjectExport,
  type InsertProjectExport,
  ProcessedFloorPlan
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Floor plan operations
  createFloorPlan(floorPlan: InsertFloorPlan): Promise<FloorPlan>;
  getFloorPlan(id: string): Promise<FloorPlan | undefined>;
  listFloorPlans(): Promise<FloorPlan[]>;
  updateFloorPlanStatus(
    id: string, 
    status: string, 
    geometryData?: any, 
    spaceAnalysis?: any
  ): Promise<FloorPlan | undefined>;
  
  // Îlot layout operations
  createIlotLayout(layout: InsertIlotLayout): Promise<IlotLayout>;
  getIlotLayout(id: string): Promise<IlotLayout | undefined>;
  listIlotLayoutsForFloorPlan(floorPlanId: string): Promise<IlotLayout[]>;
  updateIlotLayout(id: string, layout: InsertIlotLayout): Promise<IlotLayout | undefined>;
  deleteIlotLayout(id: string): Promise<boolean>;
  
  // Export operations
  createProjectExport(exportData: InsertProjectExport): Promise<ProjectExport>;
  getProjectExport(id: string): Promise<ProjectExport | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private floorPlans: Map<string, FloorPlan>;
  private ilotLayouts: Map<string, IlotLayout>;
  private projectExports: Map<string, ProjectExport>;

  constructor() {
    this.users = new Map();
    this.floorPlans = new Map();
    this.ilotLayouts = new Map();
    this.projectExports = new Map();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Floor plan operations
  async createFloorPlan(insertFloorPlan: InsertFloorPlan): Promise<FloorPlan> {
    const id = randomUUID();
    const now = new Date();
    const floorPlan: FloorPlan = {
      ...insertFloorPlan,
      id,
      userId: 'anonymous', // For now, since we don't have auth
      processingStatus: 'pending',
      geometryData: null,
      spaceAnalysis: null,
      createdAt: now,
      updatedAt: now
    };
    this.floorPlans.set(id, floorPlan);
    return floorPlan;
  }

  async getFloorPlan(id: string): Promise<FloorPlan | undefined> {
    return this.floorPlans.get(id);
  }

  async listFloorPlans(): Promise<FloorPlan[]> {
    return Array.from(this.floorPlans.values());
  }

  async updateFloorPlanStatus(
    id: string,
    status: string,
    geometryData?: any,
    spaceAnalysis?: any
  ): Promise<FloorPlan | undefined> {
    const floorPlan = this.floorPlans.get(id);
    if (!floorPlan) return undefined;

    const updatedFloorPlan: FloorPlan = {
      ...floorPlan,
      processingStatus: status,
      geometryData: geometryData || floorPlan.geometryData,
      spaceAnalysis: spaceAnalysis || floorPlan.spaceAnalysis,
      updatedAt: new Date()
    };

    this.floorPlans.set(id, updatedFloorPlan);
    return updatedFloorPlan;
  }

  // Îlot layout operations
  async createIlotLayout(insertIlotLayout: InsertIlotLayout): Promise<IlotLayout> {
    const id = randomUUID();
    const now = new Date();
    const layout: IlotLayout = {
      ...insertIlotLayout,
      id,
      corridorWidth: insertIlotLayout.corridorWidth ?? 120,
      minClearance: insertIlotLayout.minClearance ?? 80,
      algorithm: insertIlotLayout.algorithm ?? 'intelligent',
      analytics: insertIlotLayout.analytics ?? null,
      createdAt: now,
      updatedAt: now
    };
    this.ilotLayouts.set(id, layout);
    return layout;
  }

  async getIlotLayout(id: string): Promise<IlotLayout | undefined> {
    return this.ilotLayouts.get(id);
  }

  async listIlotLayoutsForFloorPlan(floorPlanId: string): Promise<IlotLayout[]> {
    return Array.from(this.ilotLayouts.values()).filter(
      layout => layout.floorPlanId === floorPlanId
    );
  }

  async updateIlotLayout(id: string, insertIlotLayout: InsertIlotLayout): Promise<IlotLayout | undefined> {
    const existing = this.ilotLayouts.get(id);
    if (!existing) return undefined;

    const updatedLayout: IlotLayout = {
      ...existing,
      ...insertIlotLayout,
      updatedAt: new Date()
    };

    this.ilotLayouts.set(id, updatedLayout);
    return updatedLayout;
  }

  async deleteIlotLayout(id: string): Promise<boolean> {
    return this.ilotLayouts.delete(id);
  }

  // Export operations
  async createProjectExport(insertProjectExport: InsertProjectExport): Promise<ProjectExport> {
    const id = randomUUID();
    const now = new Date();
    const exportRecord: ProjectExport = {
      ...insertProjectExport,
      id,
      createdAt: now
    };
    this.projectExports.set(id, exportRecord);
    return exportRecord;
  }

  async getProjectExport(id: string): Promise<ProjectExport | undefined> {
    return this.projectExports.get(id);
  }
}

export const storage = new MemStorage();
