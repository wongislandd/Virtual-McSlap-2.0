
class Team{
    constructor(discordChannel, manager, playerRoleID, name, OPGG, scirmSchedule){
        this.discordChannelID = discordChannel
        this.manager = manager
        this.playerRoleID = playerRoleID
        this.name = name
        this.OPGG = OPGG
        this.scrimSchedule = scirmSchedule
    }
}

module.exports = Team