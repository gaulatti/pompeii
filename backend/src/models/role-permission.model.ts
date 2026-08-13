import { InferAttributes, InferCreationAttributes } from 'sequelize';
import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { RbacPermission } from './rbac-permission.model';
import { RbacRole } from './rbac-role.model';

@Table({
  tableName: 'rbac_role_permissions',
  timestamps: true,
  underscored: true,
})
export class RolePermission extends Model<
  InferAttributes<RolePermission>,
  InferCreationAttributes<RolePermission>
> {
  @ForeignKey(() => RbacRole)
  @Column({ type: DataType.INTEGER, primaryKey: true })
  role_id!: number;

  @ForeignKey(() => RbacPermission)
  @Column({ type: DataType.INTEGER, primaryKey: true })
  permission_id!: number;
}
