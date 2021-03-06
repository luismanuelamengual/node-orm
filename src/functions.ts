import {Connection} from "./connection";
import {DataTable} from "./data-table";
import {DataSource} from "./data-source";
import {DataSources} from "./data-sources";

export function registerSource(source: DataSource, sourceName?: string) {
    DataSources.register(sourceName || ("source" + (DataSources.size() + 1)), source);
}

export function getSource(sourceName?: string) {
    return (sourceName)? DataSources.get(sourceName) : DataSources.getAll()[0];
}

export function getTable(tableName: string, sourceName?: string): DataTable {
    return getSource(sourceName).getTable(tableName);
}

export async function getConnection(sourceName?: string): Promise<Connection> {
    return await getSource(sourceName).getConnection();
}