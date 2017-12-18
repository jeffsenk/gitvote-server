'use strict';
var express = require('express');
var app = express();
const bodyParser = require('body-parser');
var firebase = require('firebase');
const Config = require('./Config');
var fire = firebase.initializeApp(Config.config);
var database = fire.database();
var cors = require('cors');
var SendGrid = require('./sendGrid')
var sendGrid = new SendGrid();

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cors());

app.post('/newUser',function(req,res){
  //create new user so key matches auth id
  database.ref('Users/'+req.body.userKey).set('true');
  database.ref('Users/'+req.body.userKey+'/name').set(req.body.name);
  database.ref('Users/'+req.body.userKey+'/email').set(req.body.email);
  //check if placeholder was already made
  database.ref('Users').once('value',function(users){
    users.forEach(function(user){
      if(user.val().email == req.body.email && !user.val().name){
        database.ref('Users/'+req.body.userKey+'/Invitations').set(user.val().Invitations);
        match = true;
        console.log('match found')
        user.ref.remove();
      }
    });
  });
  res.sendStatus(200);
});

app.post('/newProposal',function(req,res){
  let newKey = database.ref('Proposals').push(req.body).key;
  database.ref('Teams/'+req.body.team+'/Proposals/'+newKey).set('true');
  database.ref('Users/'+req.body.userKey+'/Proposals/'+newKey).set('true');
  sendGrid.newProposal(database,req.body.team);
  res.sendStatus(200);
});

app.post('/newTeam',function(req,res){
  let newKey = database.ref('Teams').push({name:req.body.name},function(err){
    if(err){console.log(err)};
  }).key;
  database.ref('Teams/'+newKey+'/Members/'+req.body.userKey).set('true');
  database.ref('Users/'+req.body.userKey+'/Teams/'+newKey).set('true');
  res.sendStatus(200);
});

app.post('/newVote',function(req,res){
  let newKey = database.ref('Votes').push(req.body).key;
  database.ref('Proposals/'+req.body.proposal+'/Votes/'+newKey).set('true');
  database.ref('Proposals/'+req.body.proposal+'/Options/'+req.body.option).transaction(function(count){
    if(count || (count === 0)){
      count++;
    }
    return count;
  });
  database.ref('Users/'+req.body.user+'/Votes/'+newKey).set('true');
  res.sendStatus(200);
});

app.post('/userTeams',function(req,res){
  database.ref('Users/'+req.body.userKey+'/Teams').once('value',function(teamKeys){
    if(teamKeys.val()){
      var teamCounter = Object.keys(teamKeys.val()).length;
      var teams ={};
      teamKeys.forEach(function(teamKey){
	database.ref('Teams/'+teamKey.key).once('value').then(function(team){
	  teams[team.key]=team.val();
	  if(Object.keys(teams).length == teamCounter){
	    res.send(teams);
	  }
	});
      });
    }else{
      res.send({});
    }
  });
});

app.post('/userInvitations',function(req,res){
  database.ref('Users/'+req.body.userKey+'/Invitations').once('value',function(teamKeys){
    if(teamKeys.val()){
      var teamCounter = Object.keys(teamKeys.val()).length;
      var teams ={};
      teamKeys.forEach(function(teamKey){
        database.ref('Teams/'+teamKey.key).once('value').then(function(team){
          teams[team.key]=team.val();
          if(Object.keys(teams).length == teamCounter){
            res.send(teams);
          }
        });
      });
    }else{
      res.send({})
    }
  });
});

app.post('/acceptInvitation',function(req,res){
  database.ref('Users/'+req.body.userKey+'/Teams/'+req.body.teamKey).set('true');
  database.ref('Users/'+req.body.userKey+'/Invitations/'+req.body.teamKey).remove();
  database.ref('Teams/'+req.body.teamKey+'/Members/'+req.body.userKey).set('true');
  res.sendStatus(200);
});

app.post('/declineInvitation',function(req,res){
  database.ref('Users/'+req.body.userKey+'/Invitations/'+req.body.teamKey).remove();
  res.sendStatus(200);
});

app.post('/vote',function(req,res){
  database.ref('Votes').push(req.body);
  res.sendStatus(200);
});

app.post('/addMember',function(req,res){
  database.ref('Users').once('value',function(users){
    var userCount = Object.keys(users.val()).length;
    var counter = 0;
    var match = false;
    users.forEach(function(user){
      if(user.val().email == req.body.email){
        database.ref('Users/'+user.key+'/Invitations/'+req.body.teamKey).set('true');
        match = true;
      }
      counter++;
      if(counter == userCount && !match){
        let newKey = database.ref('Users').push({email:req.body.email}).key;
        database.ref('Users/'+newKey+'/Invitations/'+req.body.teamKey).set('true');
      }
    });
  });
  sendGrid.newMember(database,req.body.teamKey,req.body.email);
  res.sendStatus(200);
});

app.post('/removeMember',function(req,res){
  res.sendStatus(200);
});

app.post('/proposals',function(req,res){
  database.ref('Teams/'+req.body.teamKey+'/Proposals').once('value',function(proposalKeys){
if(proposalKeys.val()){
    var proposalCounter = Object.keys(proposalKeys.val()).length;
    var proposals ={};
    proposalKeys.forEach(function(proposalKey){
      database.ref('Proposals/'+proposalKey.key).once('value').then(function(proposal){
        proposals[proposal.key]=proposal.val();
        if(Object.keys(proposals).length == proposalCounter){
          res.send(proposals);
        }
      });
    });
}
  });
});

app.get('/teamMembers/:id',function(req,res){
  database.ref('Teams/'+req.params.id+'/Members').once('value').then(function(memberKeys){
    if(memberKeys.val()){
      var memberCounter = Object.keys(memberKeys.val()).length;
      var members ={};
      memberKeys.forEach(function(memberKey){
        database.ref('Users/'+memberKey.key).once('value').then(function(user){
          members[user.key] = user.val();
          if(Object.keys(members).length == memberCounter){
            res.send(members);
          }
        });
      });
    }
  });
});

app.get('/teams/:id',function(req,res){
  database.ref('Teams/'+req.params.id).once('value').then(function(snapShot){
    res.send(snapShot);
  });
});

app.get('/users/:id',function(req,res){
  database.ref('Users/'+req.params.id).once('value').then(function(snapShot){
    res.send(snapShot);
  });
});

app.get('/proposals/:id',function(req,res){
  database.ref('Proposals/'+req.params.id).once('value').then(function(snapShot){
    res.send(snapShot);
  });
});

app.get('/',function(req,res){
  res.send('connected to gitvote api server version 0.0')
});

const PORT = process.env.PORT || 8080;
app.listen(PORT,function(){
  console.log('listening on port', PORT);
});
