import z from 'zod'
import { ValueObject } from './primitives/value-object'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from './error/validation-error'

export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'array'
export type ArrayItemType = Exclude<ColumnType, 'array'>

export type ArrayMetadata = {
    separator: string
    itemType: ArrayItemType
}

export interface DataSourceColumnInput {
    name: string
    type: ColumnType
    arrayMetadata: ArrayMetadata | null
}

const VALID_COLUMN_TYPES: ColumnType[] = [
    'string',
    'number',
    'boolean',
    'date',
    'array',
]

const VALID_ITEM_TYPES: ArrayItemType[] = [
    'string',
    'number',
    'boolean',
    'date',
]

export class DataSourceColumn extends ValueObject<DataSourceColumn> {
    private readonly name: string
    private readonly type: ColumnType
    private readonly arrayMetadata: ArrayMetadata | null

    constructor(data: DataSourceColumnInput) {
        super()

        if (!data.name) {
            throw new Error('DataSource column name is required')
        }

        if (!VALID_COLUMN_TYPES.includes(data.type)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.DATA_SOURCE_INVALID_COLUMN_TYPES,
            )
        }

        if (data.type === 'array') {
            const separator = data.arrayMetadata?.separator
            const itemType = data.arrayMetadata?.itemType

            const isSeparatorValid =
                typeof separator === 'string' &&
                separator.length >= 1 &&
                separator.length <= 3

            const isItemTypeValid =
                !!itemType && VALID_ITEM_TYPES.includes(itemType)

            if (!isSeparatorValid || !isItemTypeValid) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.DATA_SOURCE_INVALID_COLUMN_METADATA,
                )
            }
        } else if (data.arrayMetadata !== null) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.DATA_SOURCE_INVALID_COLUMN_METADATA,
            )
        }

        this.name = data.name
        this.type = data.type
        this.arrayMetadata = data.arrayMetadata
    }

    getName(): string {
        return this.name
    }

    getType(): ColumnType {
        return this.type
    }

    getArrayMetadata(): ArrayMetadata | null {
        return this.arrayMetadata
    }

    equals(other: DataSourceColumn): boolean {
        return (
            this.getName() === other.getName() &&
            this.getType() === other.getType() &&
            JSON.stringify(this.getArrayMetadata()) ===
                JSON.stringify(other.getArrayMetadata())
        )
    }

    serialize(): DataSourceColumnInput {
        return {
            name: this.getName(),
            type: this.getType(),
            arrayMetadata: this.getArrayMetadata(),
        }
    }

    static inferTypes(rows: Record<string, string>[]): DataSourceColumnInput[] {
        const columnValues: Record<string, string[]> = {}

        for (const row of rows) {
            for (const key in row) {
                columnValues[key] ??= []
                columnValues[key].push(row[key])
            }
        }

        return Object.entries(columnValues).map(([name, values]) => {
            const result = this.inferColumnType(values)
            return {
                name,
                type: result.type,
                arrayMetadata: result.arrayMetadata,
            }
        })
    }

    private static inferColumnType(values: string[]): {
        type: ColumnType
        arrayMetadata: ArrayMetadata | null
    } {
        const nonEmpty = values
            .filter(v => v != null)
            .map(v => v.trim())
            .filter(v => v !== '')

        if (nonEmpty.length === 0) {
            return { type: 'string', arrayMetadata: null }
        }

        if (nonEmpty.every(this.isBoolean))
            return { type: 'boolean', arrayMetadata: null }
        if (nonEmpty.every(this.isNumber))
            return { type: 'number', arrayMetadata: null }
        if (nonEmpty.every(this.isDate))
            return { type: 'date', arrayMetadata: null }

        const arrayMetadata = this.detectArray(nonEmpty)
        if (arrayMetadata) {
            return {
                type: 'array',
                arrayMetadata,
            }
        }

        return { type: 'string', arrayMetadata: null }
    }

    static detectArray(values: string[]): ArrayMetadata | null {
        let commaCount = 0
        let semicolonCount = 0

        for (const value of values) {
            if (!value) continue
            commaCount += (value.match(/,/g) || []).length
            semicolonCount += (value.match(/;/g) || []).length
        }
        if (commaCount === 0 && semicolonCount === 0) return null

        const separator = commaCount >= semicolonCount ? ',' : ';'

        const items: string[] = []

        for (const value of values) {
            if (!value) continue

            const split = value
                .split(separator)
                .map(v => v.trim())
                .filter(Boolean)

            items.push(...split)
        }

        let itemType: ArrayItemType = 'string'
        if (items.every(this.isBoolean)) itemType = 'boolean'
        if (items.every(this.isNumber)) itemType = 'number'
        if (items.every(this.isDate)) itemType = 'date'

        return { separator, itemType }
    }

    static isBoolean(value: string): boolean {
        const normalizedValue = value.trim().toLowerCase()

        return (
            normalizedValue === 'true' ||
            normalizedValue === 'false' ||
            normalizedValue === 'verdadeiro' ||
            normalizedValue === 'falso' ||
            normalizedValue === '1' ||
            normalizedValue === '0'
        )
    }

    static isNumber(value: string): boolean {
        let cleaned = value.trim()

        const isValidBR = /^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/.test(
            cleaned,
        )

        const isValidUS = /^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(
            cleaned,
        )

        if (!isValidBR && !isValidUS) {
            return false
        }

        const hasDot = cleaned.includes('.')
        const hasComma = cleaned.includes(',')

        if (hasDot && hasComma) {
            const lastDotIndex = cleaned.lastIndexOf('.')
            const lastCommaIndex = cleaned.lastIndexOf(',')

            if (lastCommaIndex > lastDotIndex) {
                cleaned = cleaned.replaceAll('.', '').replace(',', '.')
            } else {
                cleaned = cleaned.replaceAll(',', '')
            }
        } else if (hasComma) {
            const commaCount = (cleaned.match(/,/g) || []).length
            if (commaCount > 1) {
                cleaned = cleaned.replaceAll(',', '')
            } else {
                cleaned = cleaned.replace(',', '.')
            }
        } else if (hasDot) {
            const dotCount = (cleaned.match(/\./g) || []).length
            if (dotCount > 1) {
                cleaned = cleaned.replaceAll('.', '')
            }
        }

        const parsed = z.coerce.number().safeParse(cleaned)

        return parsed.success
    }

    static isDate(value: string): boolean {
        const brDateTime =
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{2}):(\d{2})(?::(\d{2}))?)?$/

        const match = value.match(brDateTime)

        if (match) {
            let day = Number(match[1])
            let month = Number(match[2])
            const year = Number(match[3])
            const hour = Number(match[4] ?? 0)
            const minute = Number(match[5] ?? 0)
            const second = Number(match[6] ?? 0)

            if (day <= 12 && month > 12) {
                ;[day, month] = [month, day]
            }

            let date: Date

            try {
                date = new Date(year, month - 1, day, hour, minute, second)
            } catch (_) {
                return false
            }

            return (
                date.getFullYear() === year &&
                date.getMonth() === month - 1 &&
                date.getDate() === day &&
                date.getHours() === hour &&
                date.getMinutes() === minute &&
                date.getSeconds() === second
            )
        }

        const blockedFormats = [
            /^\d+$/, // "2024", "1"
            /^\d+\.\d+$/, // "8.9"
            /^\d+\,\d+$/, // "8,9"
            /^\d+-\d+$/, // "8-9"
            /^\d+\/\d+$/, // "8/9"
        ]

        if (blockedFormats.some(r => r.test(value))) {
            return false
        }

        const parsed = z.coerce.date().safeParse(value)

        return parsed.success
    }
}
