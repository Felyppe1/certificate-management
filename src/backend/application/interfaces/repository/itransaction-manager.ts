export interface TransactionOptions {
    /**
     * Keys this transaction must be serialized on against other concurrent
     * transactions competing for the same keys. The application declares the
     * consistency boundary; the serialization mechanism stays hidden in the
     * infrastructure.
     */
    serializeOn?: string[]
}

export interface ITransactionManager {
    run<T>(work: () => Promise<T>, options?: TransactionOptions): Promise<T>
}
