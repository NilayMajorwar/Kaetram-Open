export enum Packets {
    Handshake,
    Intro,
    Welcome,
    Spawn,
    List,
    Who,
    Equipment,
    Ready,
    Sync,
    Movement,
    Teleport,
    Request,
    Despawn,
    Target,
    Combat,
    Animation,
    Projectile,
    Population,
    Points,
    Network,
    Chat,
    Command,
    Inventory,
    Bank,
    Ability,
    Quest,
    Notification,
    Blink,
    Heal,
    Experience,
    Death,
    Audio,
    NPC,
    Respawn,
    Trade,
    Enchant,
    Guild,
    Pointer,
    PVP,
    Click,
    Warp,
    Shop,
    Minigame,
    Region,
    Overlay,
    Camera,
    Bubble,
    Client,
    Profession,
    BuildUp,
}

export enum IntroOpcode {
    Login,
    Register,
    Guest,
}

export enum EquipmentOpcode {
    Batch,
    Equip,
    Unequip,
}

export enum MovementOpcode {
    Request,
    Started,
    Step,
    Stop,
    Move,
    Orientate,
    Follow,
    Entity,
    Freeze,
    Stunned,
    Zone,
}

export enum TargetOpcode {
    Talk,
    Attack,
    None,
    Object,
}

export enum CombatOpcode {
    Initiate,
    Hit,
    Finish,
    Sync,
}

export enum ProjectileOpcode {
    Static,
    Dynamic,
    Create,
    Update,
    Impact,
}

export enum NetworkOpcode {
    Ping,
    Pong,
}

export enum InventoryOpcode {
    Batch,
    Add,
    Remove,
    Select,
}

export enum BankOpcode {
    Batch,
    Add,
    Remove,
    Select,
}

export enum QuestOpcode {
    QuestBatch,
    AchievementBatch,
    Progress,
    Finish,
}

export enum NotificationOpcode {
    Ok,
    YesNo,
    Text,
    Popup,
}

export enum ExperienceOpcode {
    Combat,
    Profession,
}

export enum NPCOpcode {
    Talk,
    Store,
    Bank,
    Enchant,
    Countdown,
}

export enum TradeOpcode {
    Request,
    Accept,
    Decline,
}

export enum EnchantOpcode {
    Select,
    Remove,
    Enchant,
    Update,
}

export enum GuildOpcode {
    Create,
    Join,
    Leave,
    Rank,
    Loot,
    Update,
}

export enum PointerOpcode {
    Location,
    NPC,
    Relative,
    Remove,
    Button,
}

export enum ShopOpcode {
    Open,
    Buy,
    Sell,
    Refresh,
    Select,
    Remove,
}

export enum MinigameOpcode {
    TeamWar,
}

export enum TeamWarOpcode {
    Enter,
    Team,
    Red,
    Blue,
    Leave,
    Countdown,
}

export enum RegionOpcode {
    Render,
    Modify,
    Collision,
    Update,
    Reset,
}

export enum OverlayOpcode {
    Set,
    Remove,
    Lamp,
    RemoveLamps,
    Darkness,
}

export enum CameraOpcode {
    LockX,
    LockY,
    FreeFlow,
    Player,
}

export enum PushOpcode {
    Broadcast,
    Selectively,
    Player,
    Players,
    Region,
    Regions,
    NameArray,
    OldRegions,
}

export enum CommandOpcode {
    CtrlClick,
}

export enum ProfessionOpcode {
    Batch,
    Update,
}

export default {
    ...Packets,
    IntroOpcode,
    EquipmentOpcode,
    MovementOpcode,
    TargetOpcode,
    CombatOpcode,
    ProjectileOpcode,
    NetworkOpcode,
    InventoryOpcode,
    BankOpcode,
    QuestOpcode,
    NotificationOpcode,
    ExperienceOpcode,
    NPCOpcode,
    TradeOpcode,
    EnchantOpcode,
    GuildOpcode,
    PointerOpcode,
    ShopOpcode,
    MinigameOpcode: {
        ...MinigameOpcode,
        TeamWarOpcode,
    },
    RegionOpcode,
    OverlayOpcode,
    CameraOpcode,
    PushOpcode,
    CommandOpcode,
    ProfessionOpcode,
};
