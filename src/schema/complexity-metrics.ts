import { z } from 'zod';

export const ComplexityMetricSchema = z.object({
  complexity: z.number(),
  loc: z.number(),
  instability: z.number().optional(),
  fanIn: z.number().optional(),
  fanOut: z.number().optional(),
  scanned: z.boolean().optional(),
});

export const ComplexityMetricsMapSchema = z.record(z.string(), ComplexityMetricSchema);

export type ComplexityMetricsMap = z.infer<typeof ComplexityMetricsMapSchema>;
