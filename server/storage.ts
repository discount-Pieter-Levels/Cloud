import { db } from "./db";
import {
  modelRuns,
  predictions,
  type InsertModelRun,
  type InsertPrediction,
  type ModelRun,
  type Prediction,
} from "@shared/schema";
import { desc } from "drizzle-orm";

export interface IStorage {
  // Model Runs
  createModelRun(run: InsertModelRun): Promise<ModelRun>;
  getModelRuns(): Promise<ModelRun[]>;
  
  // Predictions
  createPrediction(prediction: InsertPrediction & { predictionProbability: number; predictedNoShow: boolean }): Promise<Prediction>;
  getPredictions(): Promise<Prediction[]>;
}

export class DatabaseStorage implements IStorage {
  async createModelRun(run: InsertModelRun): Promise<ModelRun> {
    const [newRun] = await db!.insert(modelRuns).values(run).returning();
    return newRun;
  }

  async getModelRuns(): Promise<ModelRun[]> {
    return await db!.select().from(modelRuns).orderBy(desc(modelRuns.createdAt));
  }

  async createPrediction(prediction: InsertPrediction & { predictionProbability: number; predictedNoShow: boolean }): Promise<Prediction> {
    const [newPrediction] = await db!.insert(predictions).values(prediction).returning();
    return newPrediction;
  }

  async getPredictions(): Promise<Prediction[]> {
    return await db!.select().from(predictions).orderBy(desc(predictions.createdAt)).limit(100);
  }
}

export class InMemoryStorage implements IStorage {
  private predictionId = 1;
  private modelRunId = 1;
  private predictions: Prediction[] = [];
  private modelRuns: ModelRun[] = [];

  async createModelRun(run: InsertModelRun): Promise<ModelRun> {
    const modelRun: ModelRun = {
      id: this.modelRunId++,
      runId: run.runId,
      status: run.status,
      metrics: run.metrics,
      parameters: run.parameters,
      createdAt: new Date(),
    };

    this.modelRuns.unshift(modelRun);
    return modelRun;
  }

  async getModelRuns(): Promise<ModelRun[]> {
    return [...this.modelRuns];
  }

  async createPrediction(prediction: InsertPrediction & { predictionProbability: number; predictedNoShow: boolean }): Promise<Prediction> {
    const newPrediction: Prediction = {
      id: this.predictionId++,
      gender: prediction.gender,
      scheduledDay: prediction.scheduledDay,
      appointmentDay: prediction.appointmentDay,
      age: prediction.age,
      neighbourhood: prediction.neighbourhood,
      scholarship: prediction.scholarship,
      hypertension: prediction.hypertension,
      diabetes: prediction.diabetes,
      alcoholism: prediction.alcoholism,
      handicap: prediction.handicap,
      smsReceived: prediction.smsReceived,
      predictionProbability: prediction.predictionProbability,
      predictedNoShow: prediction.predictedNoShow,
      createdAt: new Date(),
    };

    this.predictions.unshift(newPrediction);
    return newPrediction;
  }

  async getPredictions(): Promise<Prediction[]> {
    return this.predictions.slice(0, 100);
  }
}

export const storage = db ? new DatabaseStorage() : new InMemoryStorage();
