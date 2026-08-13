import {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { Application } from './application.model';
import { Membership } from './membership.model';
import { RoleAssignment } from './role-assignment.model';

@Table({
  tableName: 'teams',
  timestamps: true,
  underscored: true,
  paranoid: true,
})
export class Team extends Model<
  InferAttributes<Team>,
  InferCreationAttributes<Team>
> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: CreationOptional<number>;

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

  @HasMany(() => Membership)
  memberships?: Membership[];

  @HasMany(() => Application)
  applications?: Application[];

  @HasMany(() => RoleAssignment)
  roleAssignments?: RoleAssignment[];
}
