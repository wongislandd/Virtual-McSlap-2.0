
class Team{
    constructor(discordChannel, manager, name, OPGG, scirmSchedule){
        this.discordChannelID = discordChannel
        this.manager = manager
        this.name = name
        this.OPGG = OPGG
        this.scrimSchedule = scirmSchedule
    }
}

module.exports = Team