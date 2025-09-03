import { createId } from '@paralleldrive/cuid2'

export enum TEMPLATE_TYPE {
    URL = 'URL',
    DRIVE = 'DRIVE',
    UPLOAD = 'UPLOAD',
}

interface TemplateInput {
    id: string
    file_id: string | null
    bucket_url: string | null
    type: TEMPLATE_TYPE
    variables: string[]
}

interface CreateTemplateInput extends Omit<TemplateInput, 'id'> {}

export class Template {
    private id: string
    private file_id: string | null
    private bucket_url: string | null
    private type: TEMPLATE_TYPE
    private variables: string[]

    constructor(data: TemplateInput) {
        // TODO: validar inputs

        this.id = data.id
        this.file_id = data.file_id
        this.bucket_url = data.bucket_url
        this.type = data.type
        this.variables = data.variables
    }

    static create(data: CreateTemplateInput): Template {
        return new Template({
            id: createId(),
            ...data,
        })
    }

    // toPrimitives() {
    //     return {
    //         id: this.id,
    //         name: this.name,
    //         content: this.content,
    //     }
    // }
}
