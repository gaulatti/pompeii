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
import { Permission } from './permission.model';
import { Team } from './team.model';
import { User } from './user.model';

@Table({
  tableName: 'memberships',
  timestamps: false,
  underscored: true,
})
export class Membership extends Model<
  InferAttributes<Membership>,
  InferCreationAttributes<Membership>
> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: CreationOptional<number>;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  users_id!: number;

  @ForeignKey(() => Team)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  teams_id!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  role!: number;

  @BelongsTo(() => User)
  user?: User;

  @BelongsTo(() => Team)
  team?: Team;

  @HasMany(() => Permission)
  permissions?: Permission[];
}
