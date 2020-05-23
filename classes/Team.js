const ScrimSchedule = require('./ScrimSchedule')

class Team{
    constructor(discordChannel, manager, name, OPGG){
        this.discordChannel = discordChannel
        this.manager = manager
        this.name = name
        this.OPGG = OPGG
        this.scrimSchedule = new ScrimSchedule()
    }
}

module.export = Team