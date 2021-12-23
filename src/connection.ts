import {DataSet} from './data-set';

export abstract class Connection {

    public abstract query(sql: string, bindings?: Array<any>): Promise<Array<DataSet>>;

    public abstract execute(sql: string, bindings?: Array<any>): Promise<number>;

    public abstract beginTransaction(): void;

    public abstract rollbackTransaction(): void;

    public abstract commitTransaction(): void;

    public abstract close(): void;

    public abstract lastInsertedId(): any;

    public executeTransaction(transaction: () => void) {
        this.beginTransaction();
        try {
            transaction();
            this.commitTransaction();
        } catch (e) {
            this.rollbackTransaction();
        }
    }
}
