class Scrim{
    constructor(time, homeTeam){
        this.time = time
        this.homeTeam = homeTeam
        this.awayTeam = null
        this.pending = true
    }
    static formatIntoPendingString(moment, homeTeamName, homeTeamManager, homeTeamOPGG){
        var readableTime = moment.format("dddd, MMMM Do YYYY, h:mm:ss a z")
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