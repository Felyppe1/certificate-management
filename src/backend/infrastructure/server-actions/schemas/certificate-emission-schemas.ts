import z from 'zod'

export const createCertificateEmissionSchema = z.object({
    name: z.string().min(1).max(100),
})

export const addDataSourceByDrivePickerSchema = z.object({
    certificateId: z.string().min(1),
    fileId: z.string().min(1),
})

export const addDataSourceByUrlSchema = z.object({
    certificateId: z.string().min(1),
    fileUrl: z.url(),
})

export const addTemplateByUrlSchema = z.object({
    certificateId: z.string().min(1),
    fileUrl: z.url(),
})

export const updateCertificateEmissionSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(100).optional(),
    variableColumnMapping: z
        .record(z.string(), z.string().nullable())
        .nullable()
        .optional(),
})
