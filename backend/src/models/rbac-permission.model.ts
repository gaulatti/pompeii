import {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import {
  BelongsToMany,
  Column,
  DataType,
  Model,
  Table,
} from 'sequelize-typescript';
import { RbacRole } from './rbac-role.model';
import { RolePermission } from './role-permission.model';

@Table({ tableName: 'rbac_permissions', timestamps: true, underscored: true })
export class RbacPermission extends Model<
  InferAttributes<RbacPermission>,
  InferCreationAttributes<RbacPermission>
> {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  id!: CreationOptional<number>;

  @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
  key!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description!: CreationOptional<string | null>;

  @BelongsToMany(() => RbacRole, () => RolePermission)
  roles?: RbacRole[];
}
