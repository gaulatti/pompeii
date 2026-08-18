import {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { Feature } from './feature.model';
import { RbacPermission } from './rbac-permission.model';
import { RbacRole } from './rbac-role.model';
import { Team } from './team.model';

@Table({
  tableName: 'applications',
  timestamps: true,
  underscored: true,
})
export class Application extends Model<
  InferAttributes<Application>,
  InferCreationAttributes<Application>
> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: CreationOptional<number>;

  @ForeignKey(() => Team)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  team_id!: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  slug!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description?: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  cognito_user_pool_id?: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  cognito_client_id?: string;

  @BelongsTo(() => Team)
  team?: Team;

  @HasMany(() => Feature)
  features?: Feature[];

  @HasMany(() => RbacPermission)
  rbacPermissions?: RbacPermission[];

  @HasMany(() => RbacRole)
  rbacRoles?: RbacRole[];
}
