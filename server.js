const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.set('useNewUrlParser', true);
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' );

const Schema = mongoose.Schema;

const recordSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  exercises: [{
    description: {
      type: String,
      required: true
    },
    duration: {
      type: Number,
      required: true
    }, 
    date: {
      type: Date,
      required: true
    }
  }]
});

const User = mongoose.model('User', recordSchema);

app.use(cors())
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))

app.get('/hello', (req, res, next) => {
  res.send('Hi');
});

app.post('/api/exercise/new-user', (req, res) => {
  const newUser = new User({username: req.body.username.toLowerCase()});
  
  User.find({username: req.body.username.toLowerCase()}).then((results) => {
    
  if (results.length > 0) {
    res.send("User already exists -- please choose another user name.");
    return;
      };
    
  const newUser = User({username: req.body.username.toLowerCase()});
    
  newUser.save(function(err, doc){
    if (err) {
      res.send(err);
    }
  res.send(`New exercise log has been created for username "${req.body.username}".`)
  });
});
});

app.post('/api/exercise/add', (req, res, done) => { 
  
  const exercise = {
    description: req.body.description,
    duration: req.body.duration,
    date: req.body.date ? new Date(req.body.date) : new Date()
  }
  
  
  User.findOne({username: req.body.userId.toLowerCase()}).then((result) => {
    
    if (result === null) {
      res.send("Cannot find a user with that username");
      return;
    }

    const oldLog = result.exercises;
    oldLog.push(exercise);
    
    result.update({$set: {exercises: oldLog}}, (function(err, results){
      if (err) {console.log(err)};
      res.send(`${req.body.description} has been logged`);
    }));    
  });
});

app.get('/exercise/log', function(req, res){
  const username = req.query.userId.toLowerCase();
  const from = req.query.from ? new Date(req.query.from) : undefined;
  const to = req.query.to ? new Date(req.query.to) : undefined;
  const limit = req.query.limit;
    
  
  console.log(username, from, to, limit);
  User.find({username}).then(function(results){
    
    if (results.length === 0){
      res.send('No records are matching that query');
    }
    
    const fullSortedResults = results[0].exercises.sort(function(a,b){return a.date - b.date});
    let sortedResults;
    
    if (!from && !to) {
      sortedResults = fullSortedResults;
    } else if (from && !to) {
      sortedResults = fullSortedResults.filter((doc) => { return doc.date >= from });
    } else if (!from && to) {
      sortedResults = fullSortedResults.filter((doc) => { return doc.date <= to });
    } else if (from && to) {
      sortedResults = fullSortedResults.filter((doc) => { return (doc.date >= from && doc.date <= to) });
    }
    
    if (!limit) {
      res.send(sortedResults)
    } else {
      const limitedResults = sortedResults.slice(0, limit);
      res.send(limitedResults);
    };

    res.send('Unable to show results');

  });
  
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});



// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
