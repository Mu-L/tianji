import * as z from "zod"
import * as imports from "./schemas/index.js"
import { CompleteWorkspace, RelatedWorkspaceModelSchema } from "./index.js"

// Helper schema for JSON fields
type Literal = boolean | number | string
type Json = Literal | { [key: string]: Json } | Json[]
const literalSchema = z.union([z.string(), z.number(), z.boolean()])
const jsonSchema: z.ZodSchema<Json> = z.lazy(() => z.union([literalSchema, z.array(jsonSchema), z.record(z.string(), jsonSchema)]))

export const WarehouseCohortsModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  workspaceId: z.string(),
  warehouseApplicationId: z.string(),
  filter: jsonSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteWarehouseCohorts extends z.infer<typeof WarehouseCohortsModelSchema> {
  workspace: CompleteWorkspace
}

/**
 * RelatedWarehouseCohortsModelSchema contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedWarehouseCohortsModelSchema: z.ZodSchema<CompleteWarehouseCohorts> = z.lazy(() => WarehouseCohortsModelSchema.extend({
  workspace: RelatedWorkspaceModelSchema,
}))
