import { describe, expect, it } from 'vitest'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from './certificate'

import { TEMPLATE_FILE_MIME_TYPE } from './template'
import { DATA_SOURCE_MIME_TYPE } from './data-source'
import { ForbiddenError } from './error/forbidden-error'

const makeDataSourceWithColumns = (columnNames: string[]) => ({
    fileMimeType: DATA_SOURCE_MIME_TYPE.CSV,
    inputMethod: INPUT_METHOD.UPLOAD,
    files: [
        {
            fileName: 'data.csv',
            storageFileUrl: 'url',
            driveFileId: null,
        },
    ],
    thumbnailUrl: null,
    columnsRow: 1,
    dataRowStart: 2,
    columns: columnNames,
    rows: [],
    googleAccountEmail: null,
})

const makeTemplateWithVariables = (variables: string[]) => ({
    variables,
    fileName: 'template.docx',
    fileMimeType: TEMPLATE_FILE_MIME_TYPE.DOCX,
    inputMethod: INPUT_METHOD.UPLOAD,
    storageFileUrl: 'url',
    driveFileId: null,
    thumbnailUrl: null,
    googleAccountEmail: null,
})

const makeValidCertificate = () => ({
    id: 'certificate-123',
    name: 'Certificado',
    userId: 'user-123',
    status: CERTIFICATE_STATUS.DRAFT,
    createdAt: new Date(),
    template: null,
    dataSource: null,
    variableColumnMapping: null,
})

const makeCreateInput = (): any => ({
    name: 'Workshop',
    userId: 'user-123',
    template: makeTemplateWithVariables(['student', 'email']),
    dataSource: makeDataSourceWithColumns(['STUDENT', 'EMAIL']),
})

describe('Emissão de Certifcado', () => {
    describe('Regra: Manutenção de vínculos ao alterar componentes', () => {
        it('Deve preservar o mapeamento existente ao substituir o template por um novo que contenha as mesmas variáveis', () => {
            const certificate = CertificateEmission.create(makeCreateInput())

            certificate.update({
                variableColumnMapping: {
                    student: 'STUDENT',
                },
            })

            certificate.setTemplate(
                makeTemplateWithVariables(['student', 'nova_var']),
            )

            const mapping = certificate.serialize().variableColumnMapping

            expect(mapping?.student).toBe('STUDENT')
            expect(mapping?.nova_var).toBeNull()
        })

        it('Deve preservar o mapeamento existente ao substituir a fonte de dados por uma nova que contenha as mesmas colunas', () => {
            const certificate = CertificateEmission.create(makeCreateInput())

            certificate.update({
                variableColumnMapping: {
                    student: 'STUDENT',
                },
            })

            certificate.setDataSource(
                makeDataSourceWithColumns(['STUDENT', 'NOVA_COLUNA']),
            )

            const mapping = certificate.serialize().variableColumnMapping

            expect(mapping?.student).toBe('STUDENT')
        })
    })
})

describe('Mapeamento de variáveis', () => {
    describe('Regras obrigatórias para criação', () => {
        it('deve exigir nome para permitir cadastro da emissão', () => {
            expect(
                () =>
                    new CertificateEmission({
                        ...makeValidCertificate(),
                        name: '',
                    }),
            ).toThrow('Certificate name is required')
        })

        it('deve exigir usuário responsável para permitir cadastro da emissão', () => {
            expect(
                () =>
                    new CertificateEmission({
                        ...makeValidCertificate(),
                        userId: '',
                    }),
            ).toThrow('Certificate user ID is required')
        })
    })

    describe('Controle de propriedade', () => {
        it('deve permitir acesso ao proprietário da emissão', () => {
            const certificate = new CertificateEmission(makeValidCertificate())

            expect(certificate.isOwner('user-123')).toBe(true)
        })

        it('deve negar acesso para outro usuário', () => {
            const certificate = new CertificateEmission(makeValidCertificate())

            expect(certificate.isOwner('other-user')).toBe(false)
        })
    })

    describe('Emissões de certificado', () => {
        it('deve iniciar nova emissão como rascunho', () => {
            const certificate = CertificateEmission.create(makeCreateInput())

            expect(certificate.serialize().status).toBe(
                CERTIFICATE_STATUS.DRAFT,
            )
        })

        it('deve permitir alterar status para agendado', () => {
            const certificate = CertificateEmission.create(makeCreateInput())

            certificate.markAsScheduled()

            expect(certificate.serialize().status).toBe(
                CERTIFICATE_STATUS.SCHEDULED,
            )
        })

        it('deve permitir alterar status para gerado', () => {
            const certificate = CertificateEmission.create(makeCreateInput())

            certificate.markAsGenerated()

            expect(certificate.serialize().status).toBe(
                CERTIFICATE_STATUS.GENERATED,
            )
        })

        it('deve permitir alterar status para emitido', () => {
            const certificate = CertificateEmission.create(makeCreateInput())

            certificate.markAsEmitted()

            expect(certificate.serialize().status).toBe(
                CERTIFICATE_STATUS.EMITTED,
            )
        })
    })

    describe('Relação tag e variáveis', () => {
        it('deve relacionar automaticamente campos equivalentes', () => {
            const certificate = CertificateEmission.create(makeCreateInput())

            expect(certificate.serialize().variableColumnMapping).toEqual({
                student: 'STUDENT',
                email: 'EMAIL',
            })
        })

        it('deve ignorar diferenças de maiúsculas, espaços e acentos', () => {
            const input = makeCreateInput()

            input.template.variables = ['nomeCompleto']
            input.dataSource.columns = ['NOME COMPLETO']

            const certificate = CertificateEmission.create(input)

            expect(certificate.serialize().variableColumnMapping).toEqual({
                nomeCompleto: 'NOME COMPLETO',
            })
        })

        it('deve manter variável sem vínculo quando não houver coluna compatível', () => {
            const input = makeCreateInput()

            input.template.variables = ['student', 'phone']

            const certificate = CertificateEmission.create(input)

            expect(certificate.serialize().variableColumnMapping).toEqual({
                student: 'STUDENT',
                phone: null,
            })
        })
    })

    describe('Template', () => {
        it('deve impedir remoção do template por outro usuário', () => {
            const certificate = CertificateEmission.create(makeCreateInput())

            expect(() => certificate.removeTemplate('other-user')).toThrow(
                ForbiddenError,
            )
        })

        it('deve permitir definir template para a emissão', () => {
            const certificate = new CertificateEmission(makeValidCertificate())

            certificate.setTemplate(makeTemplateWithVariables(['student']))

            expect(certificate.hasTemplate()).toBe(true)
        })
    })

    describe('Fonte de dados', () => {
        it('deve impedir remoção da fonte de dados por outro usuário', () => {
            const certificate = CertificateEmission.create(makeCreateInput())

            expect(() => certificate.removeDataSource('other-user')).toThrow(
                ForbiddenError,
            )
        })
    })

    describe('Atualização da emissão', () => {
        it('deve permitir alterar nome da emissão', () => {
            const certificate = new CertificateEmission(makeValidCertificate())

            certificate.update({
                name: 'Novo Nome',
            })

            expect(certificate.getName()).toBe('Novo Nome')
        })
    })
})
