export const queryKeys = {
    me: () => ['me'] as const,
    certificateEmissions: (filters?: {
        search?: string
        sort?: string
        status?: string
    }) =>
        filters && (filters.search || filters.sort || filters.status)
            ? (['certificate-emissions', filters] as const)
            : (['certificate-emissions'] as const),
    certificateEmissionsMetrics: () =>
        ['certificate-emissions-metrics'] as const,
    certificateEmission: (id: string) => ['certificate-emission', id] as const,
    templates: () => ['templates'] as const,
    templateById: (id: string) => ['templates', id] as const,
}
