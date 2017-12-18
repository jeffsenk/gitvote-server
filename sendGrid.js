var apiKey = require('./sendGridAPIKey');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(apiKey);

class SendGrid{
  constructor(){
  }

  newMember(database,teamKey,email){
    database.ref('Teams/'+teamKey).once('value').then(function(team){
      const msg = {
	to: email,
	from: 'GitVote@gitvote.co',
	subject: 'You have been invited to join '+team.val().name,
	text: 'you have been invited to join '+team.val().name,
	html: '<div><h3>You have been invited to join a new team!</h3><a href="http://www.gitvote.co">Click Here to Join</a></div>',
      };
      sgMail.send(msg);
    });
  }

  newProposal(database,teamKey){
    database.ref('Teams/'+teamKey).once('value').then(function(team){
      var teamName = team.val().name;
      team.child('Members').forEach(function(memberKey){
        database.ref('Users/'+memberKey.key).once('value').then(function(user){
          const msg ={
            to: user.val().email,
            from: 'GitVote@gitvote.co',
            subject: 'There is a new proposal for Team '+teamName,
            text: 'There is a new proposal for Team '+teamName,
            html: '<div><h3>You Have Been Invited to Vote on a New Proposal</h3><a href="http://www.gitvote.co">Click Here to View</a></div>',
          };
          sgMail.send(msg);
        });
      });
    });
  }
}

module.exports = SendGrid;
