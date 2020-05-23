
const Scrim = require('./Scrim')
const moment = require('moment-timezone')
const TIMEZONES = {
    EASTERN : "America/New_York",
    PACIFIC : "America/Los_Angeles",
    MOUNTAIN : "America/Boise",
    CENTRAL : "America/Thunder_Bay",
}

class Team{
    constructor(discordChannel, manager, playerRoleID, name, OPGG, scrimSchedule){
        this.discordChannelID = discordChannel
        this.manager = manager
        this.playerRoleID = playerRoleID
        this.name = name
        this.OPGG = OPGG
        this.scrimSchedule = scrimSchedule
    }
    static printSchedule(data, msg, channelToSendTo){
        // Sort the schedule first
        var schedule = data.team.schedule.sort(this.scrimComparator);
        console.log(schedule)
        var channel = msg.guild.channels.cache.get(channelToSendTo)
        var scrim = {}
        for (var i=0;i<schedule.length;i++){
            scrim = schedule[i]
            console.log(scrim)
            if (scrim.pending == true){
                var time = moment.tz(scrim.time, TIMEZONES[data.timeZone])
                channel.send(`**[${i}]**\n`+Scrim.formatIntoPendingString(time, TIMEZONES[data.timeZone], scrim.homeTeam, data.team.manager, data.team.OPGG))
            }
        }
    }
    static scrimComparator = function (a,b){
        if (a.time > b.time){
            return 1
        }
        if (a.time < b.time){
            return -1
        }
        return 0
    };
}




module.exports = Team