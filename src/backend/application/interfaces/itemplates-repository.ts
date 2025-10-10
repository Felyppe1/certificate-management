import { Template } from '@/backend/domain/template'

export interface ITemplatesRepository {
    save(template: Template): Promise<void>
    getById(id: string): Promise<Template | null>
    deleteById(id: string): Promise<void>
    update(template: Template): Promise<void>
}
