import * as z from "zod"
import * as imports from "./schemas/index.js"
import { Decimal } from "decimal.js"
import { CompleteApplication, RelatedApplicationModelSchema, CompleteApplicationSession, RelatedApplicationSessionModelSchema } from "./index.js"

// Helper schema for Decimal fields
z
  .instanceof(Decimal)
  .or(z.string())
  .or(z.number())
  .refine((value) => {
    try {
      return new Decimal(value)
    } catch (error) {
      return false
    }
  })
  .transform((value) => new Decimal(value))

export const ApplicationSessionDataModelSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  sessionId: z.string(),
  key: z.string(),
  stringValue: z.string().nullish(),
  numberValue: z.number().nullish(),
  dateValue: z.date().nullish(),
  dataType: z.number().int(),
  createdAt: z.date(),
})

export interface CompleteApplicationSessionData extends z.infer<typeof ApplicationSessionDataModelSchema> {
  application: CompleteApplication
  session: CompleteApplicationSession
}

/**
 * RelatedApplicationSessionDataModelSchema contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedApplicationSessionDataModelSchema: z.ZodSchema<CompleteApplicationSessionData> = z.lazy(() => ApplicationSessionDataModelSchema.extend({
  application: RelatedApplicationModelSchema,
  session: RelatedApplicationSessionModelSchema,
}))
