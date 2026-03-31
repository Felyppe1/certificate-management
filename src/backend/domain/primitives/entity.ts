export abstract class Entity {
    private id: string

    constructor(id: string) {
        if (!id) {
            throw new Error('Entity ID is required')
        }

        this.id = id
    }

    getId(): string {
        return this.id
    }

    equals(other: Entity): boolean {
        if (other === null || other === undefined) return false
        if (this.constructor !== other.constructor) return false
        return this.id === other.getId()
    }
}
