class Scrim{
    constructor(time, homeTeam){
        this.time = time
        this.homeTeam = homeTeam
        this.awayTeam = null
        this.pending = true
    }
    static formatIntoPendingString(time, timeZone, homeTeamName, homeTeamManager, homeTeamOPGG){
        var readableTime = time.tz(timeZone).format("dddd, MMMM Do YYYY, h:mm:ss a z")
        var str = `**Team**: ${homeTeamName}` +
        `\n**Manager**: ${homeTeamManager}` +
        `\n**OPGG**: ${homeTeamOPGG}` +
        `\n**Time**: ${readableTime}`
        return str;
    }
    static formatIntoConfirmedString(moment, homeTeam, awayTeam){

    }
}



module.exports = Scrim