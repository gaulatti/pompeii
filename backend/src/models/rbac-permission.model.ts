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
  Model,
  Table,
} from 'sequelize-typescript';
import { Application } from './application.model';
import { RbacRole } from './rbac-role.model';
import { RolePermission } from './role-permission.model';

@Table({ tableName: 'rbac_permissions', timestamps: true, underscored: true })
export class RbacPermission extends Model<
  InferAttributes<RbacPermission>,
  InferCreationAttributes<RbacPermission>
> {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  id!: CreationOptional<number>;

  @ForeignKey(() => Application)
  @Column({ type: DataType.INTEGER, allowNull: false })
  application_id!: number;

  @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
  key!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description!: CreationOptional<string | null>;

  @BelongsTo(() => Application)
  application?: Application;

  @BelongsToMany(() => RbacRole, () => RolePermission)
  roles?: RbacRole[];
}
