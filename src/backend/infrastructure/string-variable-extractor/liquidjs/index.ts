import { Liquid } from 'liquidjs'
import { IStringVariableExtractor } from '@/backend/application/interfaces/istring-variable-extractor'
import { TemplateVariablesParsingError } from '@/backend/domain/error/validation-error/template-variables-parsing-error'

export class LiquidStringVariableExtractor implements IStringVariableExtractor {
    private engine = new Liquid()

    public extractVariables(content: string): string[] {
        // 1. Clean the content
        const cleanedContent = content
            .replaceAll('“', '"')
            .replaceAll('”', '"')
            .replaceAll('’', "'")
            .replaceAll('‘', "'")

        try {
            return this.engine.globalVariablesSync(cleanedContent)
        } catch (error) {
            throw new TemplateVariablesParsingError()
        }
    }
}
