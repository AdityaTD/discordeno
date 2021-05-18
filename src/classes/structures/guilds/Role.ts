import { CreateGuildRole, Errors, Role, RoleTags } from "../../../types/mod.ts";
import { Collection } from "../../../util/collection.ts";
import Base from "../Base.ts";
import Client from "../../Client.ts";
import RoleBitField from "../BitFields/Role.ts";
import { deleteRole } from "../../../helpers/roles/delete_role.ts";
import { editRole } from "../../../helpers/roles/edit_role.ts";
import { highestRole } from "../../../util/permissions.ts";

export class DDRole extends Base {
  /** The client itself. */
  client: Client;
  /** The name of the role. */
  name!: string;
  /** The color of the role. */
  color!: number;
  /** The bitfield holding the toggles for this role. */
  bitfield!: RoleBitField;
  /** The position number of the role in the server heiarchy. */
  position!: number;
  // TODO: Maybe a RolePermissions class here to better UX
  /** The permissions that this role has. */
  permissions!: bigint;
  /** 🛑 The tags for this role. Will always be undefined!! */
  tags?: RoleTags;
  /** The bot id that is associated with this role. */
  botId?: bigint;
  /** The integration id that is associated with this role */
  integrationId?: bigint;
  /** The guild id this role belongs to. */
  guildId: bigint;

  constructor(client: Client, payload: Role, guildId: bigint) {
    super(client, payload.id);
    this.client = client;
    this.guildId = guildId;

    this.update(payload);
  }

  /** Whether or not the role is hoisted. */
  get hoist() {
    return this.bitfield!.hoisted;
  }

  /** Change whether or not the role is hoisted. */
  set hoist(enabled: boolean) {
    this.bitfield!.set(this.bitfield.hoist, enabled);
  }

  /** Whether or not the role is managed such as a bot role. */
  get managed() {
    return this.bitfield.managedRole;
  }

  /** Change whether or not the role is managed. */
  set managed(enabled: boolean) {
    this.bitfield!.set(this.bitfield.managed, enabled);
  }

  /** Whether or not the role is mentionable by everyone. */
  get mentionable() {
    return this.bitfield.mentionableRole;
  }

  /** Change whether or not the role is mentionable. */
  set mentionable(enabled: boolean) {
    this.bitfield!.set(this.bitfield.mentionable, enabled);
  }

  /** Whether or not the role is the nitro booster role in this server. */
  get isNitroBoostRole() {
    return this.bitfield.isNitroBoostRole;
  }

  /** Change whether or not the role is isNitroBoostRole. */
  set isNitroBoostRole(enabled: boolean) {
    this.bitfield!.set(this.bitfield.isNitroBoost, enabled);
  }

  /** The guild where this role is. If undefined, the guild is not cached */
  get guild() {
    return this.client.guilds.get(this.guildId);
  }

  /** The hex color for this role. */
  get hexColor() {
    return this.color.toString(16);
  }

  /** The role mention */
  get mention() {
    return `<@&${this.id}>`;
  }

  /** Whether or not this role is the everyone role. */
  get isEveryoneRole() {
    return this.id === this.guildId;
  }

  /** The cached members that have this role */
  get members() {
    if (!this.guild) return new Collection();

    if (this.isEveryoneRole) return this.guild.members;

    // TODO: THIS WILL ERROR FOR NOW BUT WILL FIX WHEN OHER STRUCTS ARE IMPLEMENTED
    // deno-lint-ignore ban-ts-comment most dumbest rule ever in deno lint
    // @ts-ignore
    return this.guild.members.filter((m) => m.roles.has(this.id));
  }

  update(payload: Role) {
    for (const [key, value] of Object.entries(payload)) {
      if (key === "bitfield") {
        this.bitfield = new RoleBitField(value);
        continue;
      }

      // Properties to skip
      if (["tags"].includes(key)) continue;

      if (this[key as keyof Role]) {
        // find a better way to do this
        // deno-lint-ignore ban-ts-comment so dumb deno lint redundancy
        // @ts-ignore
        this[key] = value;
      }
    }
  }

  /** Delete a guild role. Requires the MANAGE_ROLES permission. */
  delete() {
    return deleteRole(this.guildId, this.id);
  }

  edit(options: CreateGuildRole) {
    return editRole(this.guildId, this.id, options);
  }

  higherThanRole(roleId: bigint, position?: number) {
    // If no position try and find one from cache
    if (!position) position = this.guild?.roles.get(roleId)?.position;
    // If still none error out.
    if (!position) {
      throw new Error(
        "role.higherThanRoleId() did not have a position provided and the role or guild was not found in cache. Please provide a position like role.higherThanRoleId(roleId, position)",
      );
    }

    // Rare edge case handling
    if (this.position === position) {
      return this.id! < roleId;
    }

    return this.position! > position;
  }

  async higherThanMember(memberId: bigint) {
    const guild = this.guild;
    if (!guild) throw new Error(Errors.GUILD_NOT_FOUND);

    if (guild.ownerId === memberId) return false;

    const memberHighestRole = await highestRole(guild, memberId);
    return this.higherThanRole!(
      memberHighestRole.id,
      memberHighestRole.position,
    );
  }
}

export default DDRole;