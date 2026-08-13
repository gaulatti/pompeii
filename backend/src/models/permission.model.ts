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
import { PermissionLevel } from 'src/utils/enums';
import { Feature } from './feature.model';
import { Membership } from './membership.model';

@Table({
  tableName: 'permissions',
  timestamps: true,
  underscored: true,
})
export class Permission extends Model<
  InferAttributes<Permission>,
  InferCreationAttributes<Permission>
> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: CreationOptional<number>;

  @ForeignKey(() => Feature)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  feature_id!: number;

  @ForeignKey(() => Membership)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  membership_id!: number;

  @Column({
    type: DataType.ENUM(...Object.values(PermissionLevel)),
    allowNull: true,
  })
  level?: PermissionLevel;

  @BelongsTo(() => Feature)
  feature?: Feature;

  @BelongsTo(() => Membership)
  membership?: Membership;
}
