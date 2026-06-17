import { vi, describe, it, expect, beforeAll } from 'vitest'
import { prisma as testPrisma } from '@/tests/setup.integration'
import { GetAllCertificateEmissionsUseCase } from './get-all-certificate-emissions-use-case'
import { CERTIFICATE_STATUS } from '@/backend/domain/certificate'

const prismaRef = vi.hoisted(() => ({ current: null as any }))

vi.mock('@/backend/infrastructure/repository/prisma', () => ({
    get prisma() {
        return prismaRef.current
    },
}))

beforeAll(() => {
    prismaRef.current = testPrisma
})

describe('GetAllCertificateEmissionsUseCase (Integration)', () => {
    it('deve retornar lista vazia quando usuário não tem certificados', async () => {
        await testPrisma.user.create({
            data: {
                id: 'user-1',
                email: 'u@test.com',
                name: 'Usuário',
                credits: 300,
            },
        })

        const result = await new GetAllCertificateEmissionsUseCase().execute({
            userId: 'user-1',
        })

        expect(result).toEqual([])
    })

    it('deve retornar certificados em ordem decrescente de criação', async () => {
        await testPrisma.user.create({
            data: {
                id: 'user-1',
                email: 'u@test.com',
                name: 'Usuário',
                credits: 300,
            },
        })

        await testPrisma.certificateEmission.create({
            data: {
                id: 'cert-1',
                title: 'Primeiro',
                user_id: 'user-1',
                status: CERTIFICATE_STATUS.DRAFT,
                created_at: new Date('2024-01-01T00:00:00.000Z'),
            },
        })
        await testPrisma.certificateEmission.create({
            data: {
                id: 'cert-2',
                title: 'Segundo',
                user_id: 'user-1',
                status: CERTIFICATE_STATUS.DRAFT,
                created_at: new Date('2024-01-02T00:00:00.000Z'),
            },
        })

        const result = await new GetAllCertificateEmissionsUseCase().execute({
            userId: 'user-1',
        })

        expect(result).toHaveLength(2)
        expect(result[0].id).toBe('cert-2')
        expect(result[1].id).toBe('cert-1')
    })

    it('deve mapear corretamente todos os campos retornados', async () => {
        await testPrisma.user.create({
            data: {
                id: 'user-1',
                email: 'u@test.com',
                name: 'Usuário',
                credits: 300,
            },
        })

        const createdAt = new Date('2024-06-01T12:00:00.000Z')
        await testPrisma.certificateEmission.create({
            data: {
                id: 'cert-1',
                title: 'Meu Certificado',
                user_id: 'user-1',
                status: CERTIFICATE_STATUS.GENERATED,
                created_at: createdAt,
            },
        })

        const result = await new GetAllCertificateEmissionsUseCase().execute({
            userId: 'user-1',
        })

        expect(result[0]).toMatchObject({
            id: 'cert-1',
            name: 'Meu Certificado',
            userId: 'user-1',
            status: CERTIFICATE_STATUS.GENERATED,
            createdAt,
        })
    })

    it('deve não retornar certificados de outro usuário', async () => {
        await testPrisma.user.createMany({
            data: [
                {
                    id: 'user-1',
                    email: 'u1@test.com',
                    name: 'User 1',
                    credits: 300,
                },
                {
                    id: 'user-2',
                    email: 'u2@test.com',
                    name: 'User 2',
                    credits: 300,
                },
            ],
        })

        await testPrisma.certificateEmission.createMany({
            data: [
                {
                    id: 'cert-1',
                    title: 'Do user-1',
                    user_id: 'user-1',
                    status: CERTIFICATE_STATUS.DRAFT,
                },
                {
                    id: 'cert-2',
                    title: 'Do user-2',
                    user_id: 'user-2',
                    status: CERTIFICATE_STATUS.DRAFT,
                },
            ],
        })

        const result = await new GetAllCertificateEmissionsUseCase().execute({
            userId: 'user-1',
        })

        expect(result).toHaveLength(1)
        expect(result[0].id).toBe('cert-1')
    })
})
