import {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
  tableName: 'administrative_audit_logs',
  timestamps: true,
  updatedAt: false,
  underscored: true,
})
export class AdministrativeAuditLog extends Model<
  InferAttributes<AdministrativeAuditLog>,
  InferCreationAttributes<AdministrativeAuditLog>
> {
  @Column({ type: DataType.BIGINT, primaryKey: true, autoIncrement: true })
  id!: CreationOptional<number>;

  @Column({ type: DataType.INTEGER, allowNull: true })
  actor_user_id!: CreationOptional<number | null>;

  @Column({ type: DataType.STRING(255), allowNull: false })
  action!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  target_type!: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  target_id!: CreationOptional<string | null>;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  metadata!: CreationOptional<Record<string, unknown>>;
}
