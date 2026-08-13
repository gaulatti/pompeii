import {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import {
  BelongsToMany,
  Column,
  DataType,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { RbacPermission } from './rbac-permission.model';
import { RoleAssignment } from './role-assignment.model';
import { RolePermission } from './role-permission.model';

@Table({ tableName: 'rbac_roles', timestamps: true, underscored: true })
export class RbacRole extends Model<
  InferAttributes<RbacRole>,
  InferCreationAttributes<RbacRole>
> {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  id!: CreationOptional<number>;

  @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
  key!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  name!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description!: CreationOptional<string | null>;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  is_system!: CreationOptional<boolean>;

  @BelongsToMany(() => RbacPermission, () => RolePermission)
  permissions?: RbacPermission[];

  @HasMany(() => RoleAssignment)
  assignments?: RoleAssignment[];
}
