export interface ITransactionManager {
    run<T>(work: () => Promise<T>): Promise<T>
}
