
const Scrim = require('./Scrim')

class Team{
    constructor(discordChannel, manager, playerRoleID, name, OPGG, scirmSchedule){
        this.discordChannelID = discordChannel
        this.manager = manager
        this.playerRoleID = playerRoleID
        this.name = name
        this.OPGG = OPGG
        this.scrimSchedule = scirmSchedule
    }
    static printSchedule(schedule, msg, channelToSendTo){
        // Sort the schedule first
        schedule = schedule.sort(this.scrimComparator);
        var channel = msg.guild.channels.cache.get(channelToSendTo)
        for (scrim in schedule){
            if (scrim.pending == true){
                var moment = moment(scrim.time)
                channel.send(Scrim.formatIntoPendingScrim(moment, scrim.homeTeam))
            }
        }
    }
    static scrimComparator = function (a,b){
        if (a.time > b.time){
            return -1
        }
        if (a.time < b.time){
            return 1
        }
        return 0
    };
}




module.exports = Team