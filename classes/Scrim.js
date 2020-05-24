class Scrim{
    constructor(time, homeTeam){
        this.time = time
        this.homeTeam = homeTeam
        this.awayTeam = null
        this.pending = true
    }
    static formatIntoPendingString(time, timeZone, homeTeamName, homeTeamSchedulers, homeTeamOPGG){
        var readableTime = time.tz(timeZone).format("dddd, MMMM Do YYYY, h:mm:ss a z")
        var str = `**Team**: ${homeTeamName}` +
        `\n**Schedulers**: ${homeTeamSchedulers}` +
        `\n**OPGG**: ${homeTeamOPGG}` +
        `\n**Time**: ${readableTime}`
        return str;
    }
    static formatIntoConfirmedString(moment, homeTeam, awayTeam){

    }
}



module.exports = Scrim