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
  Model,
  Table,
} from 'sequelize-typescript';
import { RbacRole } from './rbac-role.model';
import { Team } from './team.model';
import { User } from './user.model';

@Table({
  tableName: 'rbac_role_assignments',
  timestamps: true,
  underscored: true,
})
export class RoleAssignment extends Model<
  InferAttributes<RoleAssignment>,
  InferCreationAttributes<RoleAssignment>
> {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  id!: CreationOptional<number>;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  user_id!: number;

  @ForeignKey(() => RbacRole)
  @Column({ type: DataType.INTEGER, allowNull: false })
  role_id!: number;

  @ForeignKey(() => Team)
  @Column({ type: DataType.INTEGER, allowNull: true })
  team_id!: CreationOptional<number | null>;

  @BelongsTo(() => User)
  user?: User;

  @BelongsTo(() => RbacRole)
  role?: RbacRole;

  @BelongsTo(() => Team)
  team?: Team;
}
