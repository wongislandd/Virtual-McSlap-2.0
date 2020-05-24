
const Scrim = require('./Scrim')
const moment = require('moment-timezone')
const TIMEZONES = {
    EASTERN : "America/New_York",
    PACIFIC : "America/Los_Angeles",
    MOUNTAIN : "America/Boise",
    CENTRAL : "America/Thunder_Bay",
}

class Team{
    constructor(discordChannel, schedulers, playerRoleID, name, OPGG, scrimSchedule){
        this.discordChannelID = discordChannel
        this.schedulers = schedulers
        this.playerRoleID = playerRoleID
        this.name = name
        this.OPGG = OPGG
        this.scrimSchedule = scrimSchedule
    }
    static printSchedule(data, msg, channelToSendTo){
        // Sort the schedule first
        var schedule = data.team.schedule.sort(this.scrimComparator);
        var channel = msg.guild.channels.cache.get(channelToSendTo)
        var scrim = {}
        for (var i=0;i<schedule.length;i++){
            scrim = schedule[i]
            var time = moment.tz(scrim.time, TIMEZONES[data.timeZone])
            if (scrim.pending == true){
                // Don't print pending ones.
                channel.send("```" + `[${i}] PENDING`+ "```"+Scrim.formatIntoPendingString(time, TIMEZONES[data.timeZone]))
            }else{
                channel.send("```" + `[${i}] CONFIRMED`+ "```" + Scrim.formatIntoConfirmedString(data.name, time, TIMEZONES[data.timeZone], scrim.homeTeam, scrim.homeTeamSchedulers, scrim.homeTeamOPGG, scrim.awayTeam, scrim.awayTeamSchedulers, scrim.awayTeamOPGG))
            }
        }
    }
    static changeOPGG(serverid, OPGG, db){
        console.log("ChangeOPGG Called.");
        db.collection('servers').doc(serverid).update({
            "team.OPGG" : OPGG
        })
    }
    static changeName(serverid, name, db){
        console.log("ChangeName Called.");
        db.collection('servers').doc(serverid).update({
            "team.name" : name
        })
    }
    static changeAverageRank(serverid, rank, db){
        console.log("Change AverageRank called.");
        db.collection('servers').doc(serverid).update({
            "team.avgRank" : rank
        })
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

    static teamAsString(name, avgRank, schedulers, OPGG){
        var str = `**Team**: ${name}` +
        `\n**Schedulers**: ${schedulers}` +
        `\n**Avg Rank**: ${avgRank}` +
        `\n**OPGG**: ${OPGG}`
        return str;
    }
}




module.exports = Team