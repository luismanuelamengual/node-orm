import {Statement} from '../statement';
import {Query} from '../query';
import {QueryBuilder} from './query-builder';
import {SelectQuery} from '../select-query';
import {InsertQuery} from '../insert-query';
import {ConditionConnector, ConditionGroup, Condition, RawCondition, BasicCondition} from '../conditions';
import {Field, SelectField, BasicField, FunctionField, RawField} from '../fields';
import {Join, JoinType} from '../joins';

export class DefaultQueryBuilder extends QueryBuilder {

    protected static readonly SPACE = " ";
    protected static readonly COMMA = ",";
    protected static readonly DOUBLE_QUOTES = "\"";
    protected static readonly PARENTHESIS_START = "(";
    protected static readonly PARENTHESIS_END = ")";
    protected static readonly SELECT = "SELECT";
    protected static readonly INSERT = "INSERT";
    protected static readonly UPDATE = "UPDATE";
    protected static readonly DELETE = "DELETE";
    protected static readonly INTO = "INTO";
    protected static readonly SET = "SET";
    protected static readonly VALUES = "VALUES";
    protected static readonly DISTINCT = "DISTINCT";
    protected static readonly ALL = "*";
    protected static readonly AS = "AS";
    protected static readonly POINT = ".";
    protected static readonly FROM = "FROM";
    protected static readonly AND = "AND";
    protected static readonly OR = "OR";
    protected static readonly NULL = "NULL";
    protected static readonly IS = "IS";
    protected static readonly NOT = "NOT";
    protected static readonly ON = "ON";
    protected static readonly WHERE = "WHERE";
    protected static readonly HAVING = "HAVING";
    protected static readonly GROUP = "GROUP";
    protected static readonly ORDER = "ORDER";
    protected static readonly BY = "BY";
    protected static readonly LIMIT = "LIMIT";
    protected static readonly OFFSET = "OFFSET";
    protected static readonly ASC = "ASC";
    protected static readonly DESC = "DESC";
    protected static readonly JOIN = "JOIN";
    protected static readonly INNER = "INNER";
    protected static readonly OUTER = "OUTER";
    protected static readonly LEFT = "LEFT";
    protected static readonly RIGHT = "RIGHT";
    protected static readonly CROSS = "CROSS";
    protected static readonly WILDCARD = "?";

    public buildQuery(query: Query): Statement {
        const statement = {sql: '', bindings: []};
        if (query instanceof SelectQuery) {
            this.buildSelectQuery(query, statement);
        } else if (query instanceof InsertQuery) {
            this.buildInsertQuery(query, statement);
        }
        return statement;
    }

    protected buildSelectQuery(query: SelectQuery, statement: Statement) {
        statement.sql = DefaultQueryBuilder.SELECT;
        if (query.isDistinct()) {
            statement.sql += DefaultQueryBuilder.SPACE;
            statement.sql += DefaultQueryBuilder.DISTINCT;
        }
        statement.sql += DefaultQueryBuilder.SPACE;
        const selectFields = query.getSelectFields();
        if (selectFields && selectFields.length > 0) {
            let isFirst = true;
            for (const field of selectFields) {
                if (!isFirst) {
                    statement.sql += DefaultQueryBuilder.COMMA;
                    statement.sql += DefaultQueryBuilder.SPACE;
                }
                this.buildField(field, statement);
                isFirst = false;
            }
        } else {
            statement.sql += DefaultQueryBuilder.ALL;
        }
        statement.sql += DefaultQueryBuilder.SPACE;
        statement.sql += DefaultQueryBuilder.FROM;
        statement.sql += DefaultQueryBuilder.SPACE;
        this.buildTableName(query.getTableName(), statement);
        
        const tableAlias = query.getTableAlias();
        if (tableAlias != null) {
            statement.sql += DefaultQueryBuilder.SPACE;
            statement.sql += DefaultQueryBuilder.AS;
            statement.sql += DefaultQueryBuilder.SPACE;
            statement.sql += tableAlias;
        }

        const joins = query.getJoins();
        if (joins != null && joins.length > 0) {
            for (const join of joins) {
                statement.sql += DefaultQueryBuilder.SPACE;
                this.buildJoin(join, statement);
            }
        }

        const whereConditions = query.getWhereConditions();
        if (whereConditions && whereConditions.getConditionsCount() > 0) {
            statement.sql += DefaultQueryBuilder.SPACE;
            statement.sql += DefaultQueryBuilder.WHERE;
            statement.sql += DefaultQueryBuilder.SPACE;
            this.buildConditionGroup(whereConditions, statement);
        }
    }

    protected buildInsertQuery(query: InsertQuery, statement: Statement) {
        statement.sql += DefaultQueryBuilder.INSERT;
        statement.sql += DefaultQueryBuilder.SPACE;
        statement.sql += DefaultQueryBuilder.INTO;
        statement.sql += DefaultQueryBuilder.SPACE;
        this.buildTableName(query.getTableName(), statement);
        statement.sql += DefaultQueryBuilder.SPACE;
        statement.sql += DefaultQueryBuilder.PARENTHESIS_START;
        const fields = query.getFieldValues();
        let isFirst = true;
        for (const fieldName in fields) {
            if (!isFirst) {
                statement.sql += DefaultQueryBuilder.COMMA;
                statement.sql += DefaultQueryBuilder.SPACE;
            }
            statement.sql += fieldName;
            isFirst = false;
        }
        statement.sql += DefaultQueryBuilder.PARENTHESIS_END;
        statement.sql += DefaultQueryBuilder.SPACE;
        statement.sql += DefaultQueryBuilder.VALUES;
        statement.sql += DefaultQueryBuilder.SPACE;
        statement.sql += DefaultQueryBuilder.PARENTHESIS_START;
        isFirst = true;
        for (const field in fields) {
            const fieldValue = fields[field];
            if (!isFirst) {
                statement.sql += DefaultQueryBuilder.COMMA;
                statement.sql += DefaultQueryBuilder.SPACE;
            }
            this.buildValue(fieldValue, statement);
            isFirst = false;
        }
        statement.sql += DefaultQueryBuilder.PARENTHESIS_END;
    }

    protected buildField(field: Field, statement: Statement) {
        if (field instanceof RawField) {
            statement.sql += field.getSql();
        } else if (field instanceof BasicField) {
            const functionName = (field instanceof FunctionField)? field.getFunctionName() : null;
            if (functionName) {
                statement.sql += functionName.toUpperCase();
                statement.sql += DefaultQueryBuilder.PARENTHESIS_START;
            }
            if (field.getTable()) {
                this.buildTableName(field.getTable(), statement);
                statement.sql += DefaultQueryBuilder.POINT;
            }
            statement.sql += field.getName();
            if (functionName) {
                statement.sql += DefaultQueryBuilder.PARENTHESIS_END;
            }
            if ((field instanceof SelectField) && field.getAlias()) {
                statement.sql += DefaultQueryBuilder.SPACE;
                statement.sql += DefaultQueryBuilder.AS;
                statement.sql += DefaultQueryBuilder.SPACE;
                statement.sql += field.getAlias();
            }
        }
    }

    protected buildCondition(condition: Condition, statement: Statement) {
        if (condition instanceof RawCondition) {
            this.buildRawCondition(condition, statement);
        } else if (condition instanceof BasicCondition) {
            this.buildBasicCondition(condition, statement);
        } else if (condition instanceof ConditionGroup) {
            this.buildConditionGroup(condition, statement);
        }
    }

    protected buildRawCondition(condition: RawCondition, statement: Statement) {
        statement.sql = condition.getSql();
        const bindings = condition.getBindings();
        if (bindings) {
            statement.bindings.push(...bindings);
        }
    }

    protected buildBasicCondition(condition: BasicCondition, statement: Statement) {
        this.buildField(condition.getField(), statement);
        statement.sql += DefaultQueryBuilder.SPACE;
        const operator = condition.getOperator();
        const value = condition.getValue();
        if (value === null && (operator === '=' || operator === '!=')) {
            statement.sql += DefaultQueryBuilder.SPACE;
            statement.sql += DefaultQueryBuilder.IS;
            statement.sql += DefaultQueryBuilder.SPACE;
            if (operator !== '=') {    
                statement.sql += DefaultQueryBuilder.NOT;
                statement.sql += DefaultQueryBuilder.SPACE;
            }
            statement.sql += DefaultQueryBuilder.NULL;
        } else {
            this.buildOperator(operator, statement);
            statement.sql += DefaultQueryBuilder.SPACE;
            if (value) {
                this.buildValue(value, statement);
            }
        }
    }

    protected buildConditionGroup(conditionGroup: ConditionGroup, statement: Statement) {
        let isFirst = true;
        for (const condition of conditionGroup.getConditions()) {
            if (!isFirst) {
                statement.sql += DefaultQueryBuilder.SPACE;
                statement.sql += condition.connector == ConditionConnector.AND ? DefaultQueryBuilder.AND : DefaultQueryBuilder.OR;
                statement.sql += DefaultQueryBuilder.SPACE;
            }
            if (condition.condition instanceof ConditionGroup) {
                statement.sql += DefaultQueryBuilder.PARENTHESIS_START;
                this.buildConditionGroup (condition.condition, statement);
                statement.sql += DefaultQueryBuilder.PARENTHESIS_END;
            } else {
                this.buildCondition(condition.condition, statement);
            }
            isFirst = false;
        }
    }

    protected buildJoin(join: Join, statement: Statement) {
        switch (join.getType()) {
            case JoinType.INNER_JOIN:
                statement.sql += DefaultQueryBuilder.INNER;
                statement.sql += DefaultQueryBuilder.SPACE;
                break;
            case JoinType.OUTER_JOIN:
                statement.sql += DefaultQueryBuilder.OUTER;
                statement.sql += DefaultQueryBuilder.SPACE;
                break;
            case JoinType.LEFT_JOIN:
                statement.sql += DefaultQueryBuilder.LEFT;
                statement.sql += DefaultQueryBuilder.SPACE;
                break;
            case JoinType.RIGHT_JOIN:
                statement.sql += DefaultQueryBuilder.RIGHT;
                statement.sql += DefaultQueryBuilder.SPACE;
                break;
            case JoinType.CROSS_JOIN:
                statement.sql += DefaultQueryBuilder.CROSS;
                statement.sql += DefaultQueryBuilder.SPACE;
                break;
        }
        statement.sql += DefaultQueryBuilder.JOIN;
        statement.sql += DefaultQueryBuilder.SPACE;
        this.buildTableName(join.getTable(), statement);

        const tableAlias = join.getAlias();
        if (tableAlias != null) {
            statement.sql += DefaultQueryBuilder.SPACE;
            statement.sql += DefaultQueryBuilder.AS;
            statement.sql += DefaultQueryBuilder.SPACE;
            statement.sql += tableAlias;
        }
        statement.sql += DefaultQueryBuilder.SPACE;
        statement.sql += DefaultQueryBuilder.ON;
        statement.sql += DefaultQueryBuilder.SPACE;
        this.buildConditionGroup(join.getConditionGroup(), statement);
    }

    protected buildTableName(tableName: string, statement: Statement) {
        statement.sql += tableName;
    }

    protected buildValue(value: any, statement: Statement) {
        if (Array.isArray(value)) {
            this.buildArrayValue(value, statement);
        } else if (value instanceof Field) {
            this.buildField(value, statement);
        } else {
            this.buildSingleValue(value, statement);
        }
    }

    protected buildArrayValue(value: Array<any>, statement: Statement) {
        statement.sql += DefaultQueryBuilder.PARENTHESIS_START;
        let isFirst = true;
        for (const valueItem of value) {
            if (!isFirst) {
                statement.sql += DefaultQueryBuilder.COMMA;
                statement.sql += DefaultQueryBuilder.SPACE;
            }
            this.buildValue(valueItem, statement);
            isFirst = false;
        }
        statement.sql += DefaultQueryBuilder.PARENTHESIS_END;
    }

    protected buildSingleValue(value: any, statement: Statement) {
        statement.sql += DefaultQueryBuilder.WILDCARD;
        statement.bindings.push(value);
    }

    protected buildOperator(operator: string, statement: Statement) {
        statement.sql += operator.toUpperCase();
    } 
}
