import { Liquid } from 'liquidjs'
import { IStringVariableExtractor } from '@/backend/application/interfaces/istring-variable-extractor'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '@/backend/domain/error/validation-error'

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
            // 2. Extract global variables from Liquid
            const uniqueVariables = this.engine.variablesSync(cleanedContent)
            const localVariables = new Set<string>()

            // 3. Find local variables (assign/capture)
            const localVarsRegex =
                /\{%\s*(?:assign|capture)\s+([a-zA-Z0-9_\-]+)/g
            let match: RegExpExecArray | null

            while ((match = localVarsRegex.exec(cleanedContent)) !== null) {
                localVariables.add(match[1])
            }

            // 4. Filter out local variables
            return uniqueVariables.filter(
                variable => !localVariables.has(variable),
            )
        } catch (error) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.TEMPLATE_VARIABLES_PARSING_ERROR,
            )
        }
    }
}
