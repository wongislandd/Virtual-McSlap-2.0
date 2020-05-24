class Scrim{
    constructor(time, homeTeam){
        this.time = time
        this.homeTeam = homeTeam
        this.awayTeam = null
        this.pending = true
    }
    static formatIntoConfirmationString(time, timeZone, homeTeamName, homeTeamSchedulers, homeTeamOPGG){
        var readableTime = time.tz(timeZone).format("dddd, MMMM Do YYYY, h:mm:ss a z")
        var str = `**Team**: ${homeTeamName}` +
        `\n**Schedulers**: ${homeTeamSchedulers}` +
        `\n**OPGG**: ${homeTeamOPGG}` +
        `\n**Time**: ${readableTime}`
        return str;
    }

    static formatIntoPendingString(time, timeZone){
        var readableTime = time.tz(timeZone).format("dddd, MMMM Do YYYY, h:mm:ss a z")
        var str = `**Time**: ${readableTime}`
        return str;
    }

    // Time must be a moment.
    static formatIntoConfirmedString(teamSendingTo, time, timeZone, homeTeamName, homeTeamSchedulers, homeTeamOPGG, awayTeamName, awayTeamSchedulers, awayTeamOPGG){
        var readableTime = time.tz(timeZone).format("dddd, MMMM Do YYYY, h:mm:ss a z")
        if (homeTeamName == teamSendingTo){
            var opposingTeam = awayTeamName
            var opposingTeamOPGG = awayTeamOPGG
            var opposingTeamSchedulers = awayTeamSchedulers
        }else{
            var opposingTeam = homeTeamName
            var opposingTeamOPGG = homeTeamOPGG
            var opposingTeamSchedulers = homeTeamSchedulers
        }
        var str = `**Opposing Team**: ${opposingTeam}` +
        `\n**Schedulers**: ${opposingTeamSchedulers}` +
        `\n**OPGG**: ${opposingTeamOPGG}` +
        `\n**Time**: ${readableTime}`
        return str;
    }
}



module.exports = Scrim