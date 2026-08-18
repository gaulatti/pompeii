import {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { Application } from './application.model';
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

  @ForeignKey(() => Application)
  @Column({ type: DataType.INTEGER, allowNull: false })
  application_id!: number;

  @Column({ type: DataType.STRING(255), allowNull: false })
  key!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  name!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description!: CreationOptional<string | null>;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  is_system!: CreationOptional<boolean>;

  @BelongsTo(() => Application)
  application?: Application;

  @BelongsToMany(() => RbacPermission, () => RolePermission)
  permissions?: RbacPermission[];

  @HasMany(() => RoleAssignment)
  assignments?: RoleAssignment[];
}
