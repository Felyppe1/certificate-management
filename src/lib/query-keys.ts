export const queryKeys = {
    me: () => ['me'] as const,
    certificateEmissions: () => ['certificate-emissions'] as const,
    certificateEmissionsMetrics: () =>
        ['certificate-emissions-metrics'] as const,
    certificateEmission: (id: string) => ['certificate-emission', id] as const,
    templates: () => ['templates'] as const,
    templateById: (id: string) => ['templates', id] as const,
}
